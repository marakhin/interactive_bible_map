"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type * as Leaflet from "leaflet";
import { events } from "@/data/events";
import biblicalRivers from "@/data/biblical-rivers.json";
import { locationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import type { BibleEvent, BibleLocation } from "@/domain/types";
import { useBibleStore } from "@/store/useBibleStore";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const HOME_SOUTH_WEST: Leaflet.LatLngTuple = [24, 10];
const HOME_NORTH_EAST: Leaflet.LatLngTuple = [43.5, 50];

type BibleMapProps = {
  visibleEvents: BibleEvent[];
};

type LocatedMarker = {
  location: BibleLocation;
  events: BibleEvent[];
};

function coordinates(location: BibleLocation | undefined): Leaflet.LatLngTuple | undefined {
  if (!location || location.latitude === undefined || location.longitude === undefined) return undefined;
  return [location.latitude, location.longitude];
}

function eventLocation(event: BibleEvent): BibleLocation | undefined {
  const preferred = [...event.locations].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  return preferred ? locationById.get(preferred.locationId) : undefined;
}

export function BibleMap({ visibleEvents }: BibleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const regionLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const riverLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const retryBasemapRef = useRef<() => void>(() => undefined);
  const [basemapStatus, setBasemapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapInitialized, setMapInitialized] = useState(false);

  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const historicalRegionsEnabled = useBibleStore((state) => state.historicalRegionsEnabled);
  const biblicalRiversEnabled = useBibleStore((state) => state.biblicalRiversEnabled);
  const selectEvent = useBibleStore((state) => state.selectEvent);

  const markers = useMemo<LocatedMarker[]>(() => {
    const grouped = new Map<string, LocatedMarker>();
    for (const event of visibleEvents) {
      const location = eventLocation(event);
      if (!coordinates(location) || !location) continue;
      const group = grouped.get(location.id) ?? { location, events: [] };
      group.events.push(event);
      grouped.set(location.id, group);
    }
    return [...grouped.values()];
  }, [visibleEvents]);

  const route = useMemo(() => {
    const storyline = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
    if (!storyline) return undefined;
    const points: Leaflet.LatLngTuple[] = [];
    let previous = "";
    for (const eventId of storyline.eventIds) {
      const event = events.find((item) => item.id === eventId);
      if (!event) continue;
      for (const eventPlace of [...event.locations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const point = coordinates(locationById.get(eventPlace.locationId));
        if (!point) continue;
        const key = `${point[0].toFixed(4)}:${point[1].toFixed(4)}`;
        if (key === previous) continue;
        points.push(point);
        previous = key;
      }
    }
    return points.length > 1 ? { points, color: storyline.color } : undefined;
  }, [activeStorylineId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let firstResize: number | undefined;

    const installBasemap = (map: Leaflet.Map, leaflet: typeof Leaflet) => {
      setBasemapStatus("loading");
      if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

      let successfulTiles = 0;
      let failedTiles = 0;
      const layer = leaflet.tileLayer(OSM_TILE_URL, {
        minZoom: 3,
        maxZoom: 19,
        keepBuffer: 2,
        updateWhenIdle: true,
        attribution: "© OpenStreetMap contributors",
      });
      tileLayerRef.current = layer;

      layer.on("tileload", () => {
        successfulTiles += 1;
        setBasemapStatus("ready");
      });
      layer.on("tileerror", () => {
        failedTiles += 1;
        if (successfulTiles === 0 && failedTiles >= 4) setBasemapStatus("error");
      });
      layer.on("load", () => setBasemapStatus(successfulTiles > 0 ? "ready" : "error"));
      layer.addTo(map);
      layer.bringToBack();
    };

    void import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(containerRef.current, {
        attributionControl: false,
        zoomControl: false,
        minZoom: 3,
        maxZoom: 12,
        maxBounds: leaflet.latLngBounds([12, -18], [55, 72]),
        maxBoundsViscosity: 0.75,
        worldCopyJump: false,
      });
      mapRef.current = map;
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      routeLayerRef.current = leaflet.layerGroup().addTo(map);
      regionLayerRef.current = leaflet.layerGroup().addTo(map);
      riverLayerRef.current = leaflet.layerGroup().addTo(map);
      leaflet.control.zoom({ position: "topright" }).addTo(map);
      map.fitBounds(leaflet.latLngBounds(HOME_SOUTH_WEST, HOME_NORTH_EAST), { padding: [24, 24], animate: false });
      retryBasemapRef.current = () => installBasemap(map, leaflet);
      installBasemap(map, leaflet);
      setMapInitialized(true);

      observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
      observer.observe(containerRef.current);
      firstResize = window.setTimeout(() => map.invalidateSize({ animate: false }), 50);
    }).catch(() => setBasemapStatus("error"));

    return () => {
      cancelled = true;
      if (firstResize !== undefined) window.clearTimeout(firstResize);
      observer?.disconnect();
      retryBasemapRef.current = () => undefined;
      setMapInitialized(false);
      mapRef.current?.remove();
      leafletRef.current = null;
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      regionLayerRef.current = null;
      riverLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!leaflet || !map || !layer) return;
    layer.clearLayers();

    const markerTooltips: Array<{ marker: Leaflet.CircleMarker; active: boolean }> = [];
    const showAutomaticLabels = () => {
      const labelsVisible = map.getZoom() >= 7;
      for (const item of markerTooltips) {
        if (labelsVisible || item.active) item.marker.openTooltip();
        else item.marker.closeTooltip();
      }
    };

    for (const group of markers) {
      const point = coordinates(group.location);
      if (!point) continue;
      const active = group.events.some((event) => event.id === activeEventId);
      const testament = group.events.some((event) => event.testament === "NT") ? "nt" : "ot";
      const radius = active ? 10 : group.events.length > 3 ? 8 : 7;
      const marker = leaflet.circleMarker(point, {
        radius,
        className: `bible-marker-dot ${testament}${active ? " active" : ""}`,
        color: active ? "#fffdf7" : "#fffaf1",
        fillColor: testament === "nt" ? "#2d7f8b" : "#bd5b34",
        fillOpacity: 1,
        opacity: 1,
        weight: active ? 4 : 2.5,
      });
      marker.bindTooltip(
        `<strong>${group.location.ancientNameRu}</strong><span>${group.events.length} ${group.events.length === 1 ? "событие" : "событий"}</span>`,
        { direction: "top", offset: [0, -8], className: "bible-map-tooltip", permanent: false, interactive: true },
      );
      marker.on("click", () => {
        const selected = group.events.find((event) => event.id === activeEventId) ?? group.events[0];
        if (selected) selectEvent(selected.id);
      });
      marker.on("tooltipopen", (event) => {
        const element = event.tooltip.getElement();
        if (element) element.onclick = () => marker.fire("click");
      });
      marker.addTo(layer);
      markerTooltips.push({ marker, active });
    }

    map.on("zoomend", showAutomaticLabels);
    showAutomaticLabels();
    return () => { map.off("zoomend", showAutomaticLabels); };
  }, [activeEventId, mapInitialized, markers, selectEvent]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!leaflet || !map || !layer) return;
    layer.clearLayers();
    if (!route) return;

    leaflet.polyline(route.points, {
      className: "biblical-route-line",
      color: route.color,
      weight: 4,
      opacity: 0.92,
      dashArray: "9 7",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(layer);
    map.fitBounds(leaflet.latLngBounds(route.points), { padding: [80, 80], maxZoom: 6, animate: true });
  }, [mapInitialized, route]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = riverLayerRef.current;
    if (!leaflet || !layer) return;
    layer.clearLayers();
    if (!biblicalRiversEnabled) return;

    for (const feature of biblicalRivers.features) {
      const points: Leaflet.LatLngTuple[] = feature.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
      const river = leaflet.polyline(points, {
        className: `biblical-river biblical-river-${feature.properties.id}`,
        color: "#277fa0",
        weight: 4,
        opacity: 0.82,
        lineCap: "round",
        lineJoin: "round",
      }).bindTooltip(
        `<strong>${feature.properties.nameRu}</strong><span>${feature.properties.scripture}</span><small>${feature.properties.noteRu}</small>`,
        { sticky: true, direction: "top", className: "biblical-river-tooltip" },
      ).addTo(layer);
      river.bringToBack();

      const labelPoint = points[Math.floor(points.length * 0.55)];
      if (!labelPoint) continue;
      leaflet.tooltip({ permanent: true, direction: "center", className: "biblical-river-name", interactive: false })
        .setLatLng(labelPoint)
        .setContent(feature.properties.nameRu)
        .addTo(layer);
    }
  }, [biblicalRiversEnabled, mapInitialized]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = regionLayerRef.current;
    if (!leaflet || !layer) return;
    layer.clearLayers();
    if (!historicalRegionsEnabled) return;

    const regions: Array<{ center: Leaflet.LatLngTuple; radius: number; label: string }> = [
      { center: [29.6, 31], radius: 420_000, label: "ЕГИПЕТ" },
      { center: [31.7, 35.25], radius: 260_000, label: "ХАНААН" },
      { center: [33.5, 44.5], radius: 430_000, label: "МЕСОПОТАМИЯ" },
    ];
    for (const region of regions) {
      leaflet.circle(region.center, {
        radius: region.radius,
        className: "historical-region-shape",
        color: "#8b5c2c",
        fillColor: "#c08f41",
        fillOpacity: 0.08,
        opacity: 0.55,
        dashArray: "6 6",
        weight: 1.5,
        interactive: false,
      }).bindTooltip(region.label, { permanent: true, direction: "center", className: "historical-region-label" }).addTo(layer);
    }
  }, [historicalRegionsEnabled, mapInitialized]);

  useEffect(() => {
    const map = mapRef.current;
    const active = activeEventId ? events.find((event) => event.id === activeEventId) : undefined;
    const point = active ? coordinates(eventLocation(active)) : undefined;
    if (!map || !point) return;
    map.flyTo(point, Math.max(7, map.getZoom()), { animate: true, duration: 0.65 });
  }, [activeEventId, mapInitialized]);

  return (
    <section
      className="map-stage"
      aria-label="Интерактивная карта библейской истории"
      data-map-engine="leaflet-openstreetmap"
      data-basemap-status={basemapStatus}
    >
      <div ref={containerRef} className="real-map" aria-label="Карта OpenStreetMap с местами библейских событий" />

      <div className="map-legend" aria-label="Условные обозначения">
        <span><i className="legend-dot ot" />Ветхий Завет</span>
        <span><i className="legend-dot nt" />Новый Завет</span>
        <span><i className="legend-line" />маршрут по Писанию</span>
        <span><i className="legend-river" />Тигр и Евфрат</span>
      </div>

      <button
        className="map-home-control"
        type="button"
        aria-label="Показать всю карту"
        title="Показать всю карту"
        onClick={() => {
          const leaflet = leafletRef.current;
          if (leaflet) mapRef.current?.fitBounds(leaflet.latLngBounds(HOME_SOUTH_WEST, HOME_NORTH_EAST), { padding: [24, 24], animate: true });
        }}
      >
        <LocateFixed size={18} />
      </button>

      <div className="map-credit">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · реки: <a href="https://www.hydrosheds.org/products/hydrorivers" target="_blank" rel="noreferrer">HydroRIVERS</a>
      </div>

      {basemapStatus === "error" && (
        <div className="map-basemap-error" role="alert">
          <div><strong>Подложка временно недоступна</strong><span>Точки и маршруты сохранены. Повторите загрузку.</span></div>
          <button type="button" onClick={() => retryBasemapRef.current()}>Повторить</button>
        </div>
      )}

      {basemapStatus === "ready" && <span className="map-ready-sentinel" data-map-ready="true">Карта готова</span>}
    </section>
  );
}
