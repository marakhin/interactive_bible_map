"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type * as Leaflet from "leaflet";
import { biblicalRegions } from "@/data/biblical-regions";
import { events } from "@/data/events";
import biblicalRivers from "@/data/biblical-rivers.json";
import { locationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import { getPrimaryEventLocation } from "@/domain/event-locations";
import { getSequentialRoutePoints } from "@/domain/map-route";
import type { BibleEvent, BibleLocation } from "@/domain/types";
import { useBibleStore } from "@/store/useBibleStore";
import { FiltersPanel } from "./FiltersPanel";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAX_MAP_ZOOM = 18;
const AUTOMATIC_LABEL_MIN_ZOOM = 9;
const HOME_SOUTH_WEST: Leaflet.LatLngTuple = [24, 10];
const HOME_NORTH_EAST: Leaflet.LatLngTuple = [43.5, 50];

type BibleMapProps = {
  visibleEvents: BibleEvent[];
  fitAllPoints?: boolean;
};

type LocatedMarker = {
  location: BibleLocation;
  events: BibleEvent[];
};

function coordinates(location: BibleLocation | undefined): Leaflet.LatLngTuple | undefined {
  if (!location || location.latitude === undefined || location.longitude === undefined) return undefined;
  return [location.latitude, location.longitude];
}

export function BibleMap({ visibleEvents, fitAllPoints = false }: BibleMapProps) {
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
  const [mapZoom, setMapZoom] = useState(3);

  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const activeCharacterId = useBibleStore((state) => state.activeCharacterId);
  const activeBookId = useBibleStore((state) => state.activeBookId);
  const historicalRegionsEnabled = useBibleStore((state) => state.historicalRegionsEnabled);
  const selectedHistoricalRegionIds = useBibleStore((state) => state.selectedHistoricalRegionIds);
  const biblicalRiversEnabled = useBibleStore((state) => state.biblicalRiversEnabled);
  const routesEnabled = useBibleStore((state) => state.routesEnabled);
  const toggleRoutes = useBibleStore((state) => state.toggleRoutes);
  const selectEvent = useBibleStore((state) => state.selectEvent);

  const visibleHistoricalRegions = useMemo(() => {
    const selected = new Set(selectedHistoricalRegionIds);
    return biblicalRegions.filter((region) => selected.has(region.id));
  }, [selectedHistoricalRegionIds]);

  const markers = useMemo<LocatedMarker[]>(() => {
    const grouped = new Map<string, LocatedMarker>();
    for (const event of visibleEvents) {
      const location = getPrimaryEventLocation(event, locationById);
      if (!coordinates(location) || !location) continue;
      const group = grouped.get(location.id) ?? { location, events: [] };
      group.events.push(event);
      grouped.set(location.id, group);
    }
    return [...grouped.values()];
  }, [visibleEvents]);

  const route = useMemo(() => {
    const storyline = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
    if (!storyline && !activeBookId && !activeCharacterId) return undefined;

    const visibleById = new Map(visibleEvents.map((event) => [event.id, event]));
    const routeEvents = storyline
      ? storyline.eventIds.map((eventId) => visibleById.get(eventId)).filter((event): event is BibleEvent => Boolean(event))
      : visibleEvents;
    const points = getSequentialRoutePoints(routeEvents, locationById);
    if (points.length < 2) return undefined;

    const kind = storyline ? "story" : activeBookId ? "book" : "person";
    const color = storyline?.color ?? (routeEvents.some((event) => event.testament === "NT") ? "#277986" : "#a95b38");
    return {
      kind,
      color,
      points: points.map((point) => [point.latitude, point.longitude] as Leaflet.LatLngTuple),
    };
  }, [activeBookId, activeCharacterId, activeStorylineId, visibleEvents]);

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
        maxZoom: MAX_MAP_ZOOM,
        maxBounds: leaflet.latLngBounds([12, -18], [55, 72]),
        maxBoundsViscosity: 0.75,
        worldCopyJump: false,
      });
      const routePane = map.createPane("biblicalRoutePane");
      routePane.style.zIndex = "390";
      routePane.style.pointerEvents = "none";
      const regionPane = map.createPane("biblicalRegionPane");
      regionPane.style.zIndex = "360";
      mapRef.current = map;
      map.on("zoom", () => setMapZoom(map.getZoom()));
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      routeLayerRef.current = leaflet.layerGroup().addTo(map);
      regionLayerRef.current = leaflet.layerGroup().addTo(map);
      riverLayerRef.current = leaflet.layerGroup().addTo(map);
      leaflet.control.zoom({ position: "topright" }).addTo(map);
      map.fitBounds(leaflet.latLngBounds(HOME_SOUTH_WEST, HOME_NORTH_EAST), { padding: [24, 24], animate: false });
      setMapZoom(map.getZoom());
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
      const labelsVisible = map.getZoom() >= AUTOMATIC_LABEL_MIN_ZOOM;
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
      const markerElement = marker.getElement();
      markerElement?.setAttribute("data-location-id", group.location.id);
      markerElement?.setAttribute("data-event-ids", group.events.map((event) => event.id).join(" "));
      markerElement?.setAttribute("data-latitude", String(group.location.latitude));
      markerElement?.setAttribute("data-longitude", String(group.location.longitude));
      markerTooltips.push({ marker, active });
    }

    map.on("zoomend", showAutomaticLabels);
    showAutomaticLabels();
    if (fitAllPoints && markers.length > 1) {
      const bounds = markers.map((marker) => coordinates(marker.location)).filter((point): point is Leaflet.LatLngTuple => Boolean(point));
      if (bounds.length > 1) map.fitBounds(leaflet.latLngBounds(bounds), { padding: [48, 48], maxZoom: 5, animate: true });
    }
    return () => { map.off("zoomend", showAutomaticLabels); };
  }, [activeEventId, fitAllPoints, mapInitialized, markers, selectEvent]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!leaflet || !map || !layer) return;
    layer.clearLayers();
    if (!route || !routesEnabled) return;

    leaflet.polyline(route.points, {
      pane: "biblicalRoutePane",
      className: "biblical-route-halo",
      color: "#fffaf0",
      weight: 6,
      opacity: 0.82,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      smoothFactor: 1.4,
    }).addTo(layer);
    const routeLine = leaflet.polyline(route.points, {
      pane: "biblicalRoutePane",
      className: "biblical-route-line",
      color: route.color,
      weight: 2.75,
      opacity: 0.88,
      dashArray: "7 7",
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      smoothFactor: 1.4,
    }).addTo(layer);
    routeLine.getElement()?.setAttribute("data-route-kind", route.kind);
    map.fitBounds(leaflet.latLngBounds(route.points), { padding: [80, 80], maxZoom: 6, animate: true });
  }, [mapInitialized, route, routesEnabled]);

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
    const map = mapRef.current;
    const layer = regionLayerRef.current;
    if (!leaflet || !map || !layer) return;
    layer.clearLayers();
    if (!historicalRegionsEnabled) return;

    const labelLayer = leaflet.layerGroup().addTo(layer);
    for (const region of visibleHistoricalRegions) {
      const polygon = leaflet.polygon(region.points, {
        pane: "biblicalRegionPane",
        className: "biblical-region-boundary",
        color: region.color,
        fillColor: region.color,
        fillOpacity: 0.075,
        opacity: 0.78,
        dashArray: "6 5",
        weight: 1.6,
        lineCap: "round",
        lineJoin: "round",
        interactive: true,
      }).bindTooltip(
        `<strong>${region.nameRu}</strong><span>${region.scripture}</span><small>${region.periodRu}. ${region.noteRu}</small>`,
        { sticky: true, direction: "top", className: "biblical-region-tooltip" },
      ).addTo(layer);
      polygon.getElement()?.setAttribute("data-region-id", region.id);
    }

    const broadRegions = new Set(["egypt", "canaan", "mesopotamia"]);
    const syncLabels = () => {
      labelLayer.clearLayers();
      const showBroad = map.getZoom() < 7;
      for (const region of visibleHistoricalRegions) {
        if (broadRegions.has(region.id) !== showBroad) continue;
        leaflet.tooltip({ pane: "biblicalRegionPane", permanent: true, direction: "center", className: "historical-region-label", interactive: false })
          .setLatLng(region.labelPoint)
          .setContent(region.nameRu.toUpperCase())
          .addTo(labelLayer);
      }
    };
    map.on("zoomend", syncLabels);
    syncLabels();
    return () => { map.off("zoomend", syncLabels); };
  }, [historicalRegionsEnabled, mapInitialized, visibleHistoricalRegions]);

  useEffect(() => {
    const map = mapRef.current;
    const active = activeEventId ? events.find((event) => event.id === activeEventId) : undefined;
    const point = active ? coordinates(getPrimaryEventLocation(active, locationById)) : undefined;
    if (!map || !point) return;
    map.panTo(point, { animate: true, duration: 0.35, easeLinearity: 0.25 });
  }, [activeEventId, mapInitialized]);

  return (
    <section
      className="map-stage"
      aria-label="Интерактивная карта библейской истории"
      data-map-engine="leaflet-openstreetmap"
      data-basemap-status={basemapStatus}
      data-map-zoom={mapZoom}
      data-map-max-zoom={MAX_MAP_ZOOM}
      data-label-min-zoom={AUTOMATIC_LABEL_MIN_ZOOM}
      data-route-status={!route ? "unavailable" : routesEnabled ? "visible" : "hidden"}
      data-route-kind={route?.kind}
      data-regions-status={historicalRegionsEnabled ? "visible" : "hidden"}
      data-region-selection-count={visibleHistoricalRegions.length}
    >
      <div ref={containerRef} className="real-map" aria-label="Карта OpenStreetMap с местами библейских событий" />

      <div className="map-toolbar">
        <div className="map-legend" aria-label="Условные обозначения">
          <span><i className="legend-dot ot" />Ветхий Завет</span>
          <span><i className="legend-dot nt" />Новый Завет</span>
          <button
            className="map-route-toggle"
            type="button"
            disabled={!route}
            aria-pressed={Boolean(route && routesEnabled)}
            aria-label={!route ? "Для текущего режима маршрут недоступен" : routesEnabled ? "Скрыть линии маршрута" : "Показать линии маршрута"}
            onClick={toggleRoutes}
          >
            <i className={`legend-line${!route ? " unavailable" : routesEnabled ? "" : " off"}`} />
            {!route ? "Линий нет" : `Линии: ${routesEnabled ? "вкл" : "выкл"}`}
          </button>
          <span><i className="legend-river" />Тигр и Евфрат</span>
          {historicalRegionsEnabled && <span><i className="legend-region" />Области: {visibleHistoricalRegions.length}/{biblicalRegions.length}</span>}
        </div>
        <FiltersPanel />
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
