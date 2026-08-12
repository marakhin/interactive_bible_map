"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { LocateFixed, Minus, Plus, WifiOff } from "lucide-react";
import { events } from "@/data/events";
import { locationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import type { BibleEvent } from "@/domain/types";
import { useBibleStore } from "@/store/useBibleStore";

const MAP_PROXY_PATH = "/api/map/";
const DEFAULT_MAP_STYLE_URL = `${MAP_PROXY_PATH}styles/positron`;

maplibregl.setWorkerUrl("/assets/maplibre-gl-worker.mjs");

function mapRequestUrl(url: string): string {
  const externalMapPrefix = "https://tiles.openfreemap.org/";
  return url.startsWith(externalMapPrefix)
    ? `${MAP_PROXY_PATH}${url.slice(externalMapPrefix.length)}`
    : url;
}

type BibleMapProps = {
  visibleEvents: BibleEvent[];
};

function eventCoordinates(event: BibleEvent): [number, number] | undefined {
  const eventLocation = [...event.locations].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  const location = eventLocation ? locationById.get(eventLocation.locationId) : undefined;
  return location?.longitude !== undefined && location.latitude !== undefined ? [location.longitude, location.latitude] : undefined;
}

export function BibleMap({ visibleEvents }: BibleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const historicalRegionsEnabled = useBibleStore((state) => state.historicalRegionsEnabled);
  const selectEvent = useBibleStore((state) => state.selectEvent);

  const points = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
    type: "FeatureCollection",
    features: visibleEvents.flatMap((event) => {
      const coordinates = eventCoordinates(event);
      if (!coordinates) return [];
      return [{ type: "Feature", id: event.id, geometry: { type: "Point", coordinates }, properties: { id: event.id, title: event.titleRu, testament: event.testament, active: event.id === activeEventId } }];
    }),
  }), [visibleEvents, activeEventId]);

  const route = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => {
    const storyline = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
    if (!storyline) return { type: "FeatureCollection", features: [] };
    const coordinates: [number, number][] = [];
    const seen = new Set<string>();
    for (const eventId of storyline.eventIds) {
      const event = events.find((item) => item.id === eventId);
      if (!event) continue;
      for (const eventLocation of [...event.locations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const location = locationById.get(eventLocation.locationId);
        if (!location || location.longitude === undefined || location.latitude === undefined) continue;
        const key = `${location.longitude},${location.latitude}`;
        if (seen.has(key) && coordinates[coordinates.length - 1]?.join() === key) continue;
        coordinates.push([location.longitude, location.latitude]);
        seen.add(key);
      }
    }
    return coordinates.length > 1 ? {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "LineString", coordinates }, properties: { color: storyline.color } }],
    } : { type: "FeatureCollection", features: [] };
  }, [activeStorylineId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_MAP_STYLE_URL,
        transformRequest: (url) => ({ url: mapRequestUrl(url) }),
        center: [34.7, 32.3],
        zoom: 4.2,
        minZoom: 2.4,
        maxZoom: 12,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
      map.on("load", () => {
        setMapFailed(false);
        map.addSource("biblical-route", { type: "geojson", data: route });
        map.addLayer({ id: "biblical-route-shadow", type: "line", source: "biblical-route", paint: { "line-color": "#fff8e8", "line-width": 7, "line-opacity": 0.8 } });
        map.addLayer({ id: "biblical-route", type: "line", source: "biblical-route", paint: { "line-color": ["coalesce", ["get", "color"], "#ba6437"], "line-width": 3, "line-opacity": 0.9, "line-dasharray": [1.5, 1] } });
        map.addSource("biblical-events", { type: "geojson", data: points, cluster: true, clusterMaxZoom: 7, clusterRadius: 42 });
        map.addLayer({ id: "clusters", type: "circle", source: "biblical-events", filter: ["has", "point_count"], paint: { "circle-color": "#f6f0df", "circle-radius": ["step", ["get", "point_count"], 18, 8, 23, 16, 28], "circle-stroke-color": "#8d6548", "circle-stroke-width": 2 } });
        map.addLayer({ id: "cluster-count", type: "symbol", source: "biblical-events", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#4d3728" } });
        map.addLayer({ id: "event-markers", type: "circle", source: "biblical-events", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["case", ["==", ["get", "testament"], "NT"], "#237888", "#b75f38"], "circle-radius": ["case", ["==", ["get", "active"], true], 10, 7], "circle-stroke-color": "#fffaf0", "circle-stroke-width": ["case", ["==", ["get", "active"], true], 4, 2], "circle-opacity": 0.98 } });
        map.addLayer({ id: "event-labels", type: "symbol", source: "biblical-events", minzoom: 5.2, filter: ["!", ["has", "point_count"]], layout: { "text-field": ["get", "title"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.25], "text-anchor": "top", "text-optional": true }, paint: { "text-color": "#2d2b25", "text-halo-color": "#fffdf7", "text-halo-width": 1.5 } });
        map.on("click", "event-markers", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id) selectEvent(id);
        });
        map.on("click", "clusters", async (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource("biblical-events") as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
        });
        for (const layer of ["event-markers", "clusters"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        setMapReady(true);
      });
    } catch {
      setMapFailed(true);
      return;
    }
    return () => { map.remove(); mapRef.current = null; };
    // Initial map creation only; live data are updated in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    (mapRef.current.getSource("biblical-events") as GeoJSONSource)?.setData(points);
  }, [points, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    (mapRef.current.getSource("biblical-route") as GeoJSONSource)?.setData(route);
    const coordinates = route.features[0]?.geometry.coordinates;
    if (coordinates?.length > 1) {
      const first = coordinates[0] as [number, number];
      const bounds = coordinates.reduce((box, coordinate) => box.extend(coordinate as [number, number]), new maplibregl.LngLatBounds(first, first));
      mapRef.current.fitBounds(bounds, { padding: { top: 90, bottom: 200, left: 60, right: 60 }, maxZoom: 7, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900 });
    }
  }, [route, mapReady]);

  useEffect(() => {
    const active = activeEventId ? events.find((event) => event.id === activeEventId) : undefined;
    const coords = active ? eventCoordinates(active) : undefined;
    if (coords && mapRef.current) mapRef.current.easeTo({ center: coords, zoom: Math.max(mapRef.current.getZoom(), 6), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700 });
  }, [activeEventId]);

  return (
    <section className="map-stage" aria-label="Интерактивная карта библейской истории">
      <div ref={containerRef} className="map-canvas" />
      {!mapReady && !mapFailed && <div className="map-loading"><span className="spinner" />Загружаем карту…</div>}
      {mapFailed && <div className="map-fallback"><WifiOff size={22} /><div><strong>Не удалось загрузить подложку</strong><span>Проверьте соединение и попробуйте ещё раз.</span></div><button type="button" onClick={() => window.location.reload()}>Повторить</button></div>}
      {historicalRegionsEnabled && <div className="region-wash" aria-label="Учебный слой исторических областей"><span className="region region-egypt">ЕГИПЕТ</span><span className="region region-canaan">ХАНААН</span><span className="region region-mesopotamia">МЕСОПОТАМИЯ</span></div>}
      <div className="map-legend" aria-label="Условные обозначения"><span><i className="legend-dot ot" />Ветхий Завет</span><span><i className="legend-dot nt" />Новый Завет</span><span><i className="legend-line" />маршрут по Писанию</span></div>
      <div className="map-controls">
        <button aria-label="Приблизить карту" onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></button>
        <button aria-label="Отдалить карту" onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></button>
        <button aria-label="Вернуться к Восточному Средиземноморью" onClick={() => mapRef.current?.easeTo({ center: [34.7, 32.3], zoom: 4.2 })}><LocateFixed size={18} /></button>
      </div>
    </section>
  );
}
