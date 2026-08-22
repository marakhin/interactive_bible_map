"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type * as Leaflet from "leaflet";
import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from "maplibre-gl";
import { biblicalRegions, type BiblicalRegion } from "@/data/biblical-regions";
import { events } from "@/data/events";
import biblicalRivers from "@/data/biblical-rivers.json";
import { interfaceLocationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import { getPrimaryEventLocation } from "@/domain/event-locations";
import { getSequentialRoutePoints } from "@/domain/map-route";
import type { BibleEvent, BibleLocation } from "@/domain/types";
import { useBibleStore } from "@/store/useBibleStore";
import { FiltersPanel } from "./FiltersPanel";

const DEFAULT_MAP_STYLE_URL = "/map/openfreemap-ru.json";
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() || DEFAULT_MAP_STYLE_URL;
const MAPLIBRE_WORKER_URL = "/assets/maplibre-gl-worker.mjs";
const MAP_LOAD_TIMEOUT_MS = 15_000;
const MAX_INITIAL_MAP_ERRORS = 4;
const MAX_MAP_ZOOM = 18;
const DESKTOP_AUTOMATIC_LABEL_MIN_ZOOM = 9;
const MOBILE_AUTOMATIC_LABEL_MIN_ZOOM = 11;
const MOBILE_MAP_QUERY = "(max-width: 767px)";
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

type MapLibreLeafletLayer = Leaflet.Layer & {
  getMaplibreMap(): MapLibreMap;
};

function coordinates(location: BibleLocation | undefined): Leaflet.LatLngTuple | undefined {
  if (!location || location.latitude === undefined || location.longitude === undefined) return undefined;
  return [location.latitude, location.longitude];
}

function eventCountWord(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "событий";
  const last = count % 10;
  if (last === 1) return "событие";
  if (last >= 2 && last <= 4) return "события";
  return "событий";
}

function createRegionLabel(region: BiblicalRegion) {
  const label = document.createElement("span");
  label.className = "historical-region-label";
  const name = document.createElement("span");
  name.textContent = region.nameRu.toUpperCase();
  const info = document.createElement("b");
  info.className = "historical-region-info";
  info.setAttribute("aria-hidden", "true");
  info.textContent = "i";
  label.append(name, info);
  return label;
}

function createRegionSourcePopup(region: BiblicalRegion) {
  const content = document.createElement("div");
  content.className = "region-source-popup-content";
  const eyebrow = document.createElement("span");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Основа контура";
  const heading = document.createElement("strong");
  heading.textContent = region.nameRu;
  const explanation = document.createElement("p");
  explanation.textContent = region.sourceNoteRu;
  const list = document.createElement("ul");
  for (const source of region.sources) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.titleRu;
    const role = document.createElement("small");
    role.textContent = `${source.roleRu} · ${source.licenseRu}`;
    item.append(link, role);
    list.append(item);
  }
  const warning = document.createElement("small");
  warning.className = "region-source-warning";
  warning.textContent = region.noteRu;
  content.append(eyebrow, heading, explanation, list, warning);
  return content;
}

export function BibleMap({ visibleEvents, fitAllPoints = false }: BibleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const basemapLayerRef = useRef<MapLibreLeafletLayer | null>(null);
  const basemapCleanupRef = useRef<() => void>(() => undefined);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const routeLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const regionLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const riverLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const retryBasemapRef = useRef<() => void>(() => undefined);
  const [basemapStatus, setBasemapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapZoom, setMapZoom] = useState(3);
  const [automaticLabelMinZoom, setAutomaticLabelMinZoom] = useState(DESKTOP_AUTOMATIC_LABEL_MIN_ZOOM);

  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const activeCharacterId = useBibleStore((state) => state.activeCharacterId);
  const activeBookId = useBibleStore((state) => state.activeBookId);
  const historicalRegionsEnabled = useBibleStore((state) => state.historicalRegionsEnabled);
  const selectedHistoricalRegionIds = useBibleStore((state) => state.selectedHistoricalRegionIds);
  const biblicalRiversEnabled = useBibleStore((state) => state.biblicalRiversEnabled);
  const routesEnabled = useBibleStore((state) => state.routesEnabled);
  const storyPlaying = useBibleStore((state) => state.storyPlaying);
  const toggleRoutes = useBibleStore((state) => state.toggleRoutes);
  const selectEvent = useBibleStore((state) => state.selectEvent);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MAP_QUERY);
    const syncThreshold = () => setAutomaticLabelMinZoom(media.matches ? MOBILE_AUTOMATIC_LABEL_MIN_ZOOM : DESKTOP_AUTOMATIC_LABEL_MIN_ZOOM);
    syncThreshold();
    media.addEventListener?.("change", syncThreshold);
    return () => media.removeEventListener?.("change", syncThreshold);
  }, []);

  const visibleHistoricalRegions = useMemo(() => {
    const selected = new Set(selectedHistoricalRegionIds);
    return biblicalRegions.filter((region) => selected.has(region.id));
  }, [selectedHistoricalRegionIds]);

  const markers = useMemo<LocatedMarker[]>(() => {
    const grouped = new Map<string, LocatedMarker>();
    for (const event of visibleEvents) {
      const location = getPrimaryEventLocation(event, interfaceLocationById);
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
    const points = getSequentialRoutePoints(routeEvents, interfaceLocationById);
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

    void Promise.all([
      import("leaflet"),
      import("maplibre-gl"),
      import("@maplibre/maplibre-gl-leaflet"),
    ]).then(([leaflet, maplibre, maplibreLeaflet]) => {
      if (cancelled || !containerRef.current) return;
      maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
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
      const regionLabelPane = map.createPane("biblicalRegionLabelPane");
      regionLabelPane.style.zIndex = "625";
      mapRef.current = map;
      map.on("zoom", () => setMapZoom(map.getZoom()));
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      routeLayerRef.current = leaflet.layerGroup().addTo(map);
      regionLayerRef.current = leaflet.layerGroup().addTo(map);
      riverLayerRef.current = leaflet.layerGroup().addTo(map);
      leaflet.control.zoom({ position: "topright" }).addTo(map);
      leaflet.control.scale({ position: "bottomleft", imperial: false, metric: true, maxWidth: 90 }).addTo(map);
      map.fitBounds(leaflet.latLngBounds(HOME_SOUTH_WEST, HOME_NORTH_EAST), { padding: [24, 24], animate: false });
      setMapZoom(map.getZoom());

      const installBasemap = () => {
        basemapCleanupRef.current();
        setBasemapStatus("loading");

        let initialErrors = 0;
        let styleLoaded = false;
        let sourceLoaded = false;
        let settled = false;
        let layer: MapLibreLeafletLayer | null = null;

        const markReady = () => {
          if (cancelled || settled || !styleLoaded || !sourceLoaded) return;
          settled = true;
          window.clearTimeout(loadTimeout);
          setBasemapStatus("ready");
        };
        const markError = () => {
          if (cancelled || settled) return;
          settled = true;
          window.clearTimeout(loadTimeout);
          setBasemapStatus("error");
        };
        const loadTimeout = window.setTimeout(markError, MAP_LOAD_TIMEOUT_MS);

        try {
          layer = maplibreLeaflet.maplibreGL({
            style: MAP_STYLE_URL,
            interactive: false,
            attributionControl: false,
            fadeDuration: 0,
          }) as MapLibreLeafletLayer;
          layer.addTo(map);
          basemapLayerRef.current = layer;

          const vectorMap = layer.getMaplibreMap();
          const handleStyleLoad = () => {
            styleLoaded = true;
            markReady();
          };
          const handleSourceData = (event: { dataType?: string; isSourceLoaded?: boolean; sourceId?: string }) => {
            if (event.dataType !== "source" || event.sourceId !== "openmaptiles" || !event.isSourceLoaded) return;
            sourceLoaded = true;
            markReady();
          };
          const handleIdle = () => {
            styleLoaded = vectorMap.isStyleLoaded() === true;
            sourceLoaded = true;
            markReady();
          };
          const handleError = (event: MapLibreErrorEvent & { sourceId?: string }) => {
            if (settled) return;
            if (!event.sourceId) {
              markError();
              return;
            }
            initialErrors += 1;
            if (initialErrors >= MAX_INITIAL_MAP_ERRORS) markError();
          };

          vectorMap.on("load", handleStyleLoad);
          vectorMap.on("sourcedata", handleSourceData);
          vectorMap.on("idle", handleIdle);
          vectorMap.on("error", handleError);

          basemapCleanupRef.current = () => {
            window.clearTimeout(loadTimeout);
            vectorMap.off("load", handleStyleLoad);
            vectorMap.off("sourcedata", handleSourceData);
            vectorMap.off("idle", handleIdle);
            vectorMap.off("error", handleError);
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
            basemapLayerRef.current = null;
            basemapCleanupRef.current = () => undefined;
          };
        } catch {
          markError();
          basemapCleanupRef.current = () => {
            window.clearTimeout(loadTimeout);
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
            basemapLayerRef.current = null;
            basemapCleanupRef.current = () => undefined;
          };
        }
      };

      retryBasemapRef.current = installBasemap;
      installBasemap();
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
      basemapCleanupRef.current();
      setMapInitialized(false);
      mapRef.current?.remove();
      leafletRef.current = null;
      mapRef.current = null;
      basemapLayerRef.current = null;
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
    let declutterFrame: number | undefined;
    const showAutomaticLabels = () => {
      const labelsVisible = map.getZoom() >= automaticLabelMinZoom;
      for (const item of markerTooltips) {
        if (labelsVisible || item.active) item.marker.openTooltip();
        else item.marker.closeTooltip();
      }
      if (automaticLabelMinZoom !== MOBILE_AUTOMATIC_LABEL_MIN_ZOOM || !labelsVisible) return;
      if (declutterFrame !== undefined) window.cancelAnimationFrame(declutterFrame);
      declutterFrame = window.requestAnimationFrame(() => {
        const occupied: DOMRect[] = [];
        const ordered = [...markerTooltips].sort((left, right) => Number(right.active) - Number(left.active));
        for (const item of ordered) {
          const element = item.marker.getTooltip()?.getElement();
          if (!element || !item.marker.isTooltipOpen()) continue;
          const rect = element.getBoundingClientRect();
          const overlaps = occupied.some((other) => rect.left < other.right + 4 && rect.right + 4 > other.left && rect.top < other.bottom + 4 && rect.bottom + 4 > other.top);
          if (overlaps && !item.active) item.marker.closeTooltip();
          else occupied.push(rect);
        }
      });
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
        `<strong>${group.location.ancientNameRu}</strong><span><b>${group.events.length}</b><i class="tooltip-count-word">${eventCountWord(group.events.length)}</i></span>`,
        { direction: "top", offset: [0, -8], className: "bible-map-tooltip", permanent: false, interactive: true },
      );
      const openMarker = () => {
        const selected = group.events.find((event) => event.id === activeEventId) ?? group.events[0];
        if (selected) selectEvent(selected.id);
      };
      marker.on("click", openMarker);
      marker.on("tooltipopen", (event) => {
        const element = event.tooltip.getElement();
        if (!element) return;
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.setAttribute("aria-label", `Открыть события места ${group.location.ancientNameRu}`);
        leaflet.DomEvent.disableClickPropagation(element);
        let lastTouchActivation = 0;
        element.onpointerup = (pointerEvent) => {
          if (pointerEvent.pointerType !== "touch") return;
          lastTouchActivation = Date.now();
          leaflet.DomEvent.stop(pointerEvent);
          openMarker();
        };
        element.onclick = (clickEvent) => {
          leaflet.DomEvent.stop(clickEvent);
          if (Date.now() - lastTouchActivation > 500) openMarker();
        };
        element.onkeydown = (keyboardEvent) => {
          if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;
          leaflet.DomEvent.stop(keyboardEvent);
          openMarker();
        };
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
    map.on("moveend", showAutomaticLabels);
    showAutomaticLabels();
    if (fitAllPoints && markers.length > 1) {
      const bounds = markers.map((marker) => coordinates(marker.location)).filter((point): point is Leaflet.LatLngTuple => Boolean(point));
      if (bounds.length > 1) map.fitBounds(leaflet.latLngBounds(bounds), { padding: [48, 48], maxZoom: 5, animate: true });
    }
    return () => {
      map.off("zoomend", showAutomaticLabels);
      map.off("moveend", showAutomaticLabels);
      if (declutterFrame !== undefined) window.cancelAnimationFrame(declutterFrame);
    };
  }, [activeEventId, automaticLabelMinZoom, fitAllPoints, mapInitialized, markers, selectEvent]);

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
        fillOpacity: 0.18,
        opacity: 0.94,
        dashArray: "5 4",
        weight: 2.2,
        lineCap: "round",
        lineJoin: "round",
        interactive: true,
      }).bindTooltip(
        `<strong>${region.nameRu}</strong><span>${region.scripture}</span><small>${region.periodRu}. ${region.noteRu} Нажмите значок i рядом с названием, чтобы открыть источники.</small>`,
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
        const sourceMarker = leaflet.marker(region.labelPoint, {
          pane: "biblicalRegionLabelPane",
          title: `Источники контура: ${region.nameRu}`,
          keyboard: true,
          icon: leaflet.divIcon({
            className: "historical-region-source-marker",
            html: createRegionLabel(region),
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
        }).bindPopup(createRegionSourcePopup(region), {
          className: "biblical-region-source-popup",
          maxWidth: 340,
        }).addTo(labelLayer);
        sourceMarker.getElement()?.setAttribute("data-region-source-id", region.id);
      }
    };
    map.on("zoomend", syncLabels);
    syncLabels();
    return () => { map.off("zoomend", syncLabels); };
  }, [historicalRegionsEnabled, mapInitialized, visibleHistoricalRegions]);

  useEffect(() => {
    const map = mapRef.current;
    const active = activeEventId ? events.find((event) => event.id === activeEventId) : undefined;
    const point = active ? coordinates(getPrimaryEventLocation(active, interfaceLocationById)) : undefined;
    if (!map || !point) return;
    if (storyPlaying && window.matchMedia(MOBILE_MAP_QUERY).matches) {
      map.stop();
      map.flyTo(point, Math.max(map.getZoom(), 8), { animate: true, duration: 1.15, easeLinearity: 0.2 });
      return;
    }
    map.panTo(point, { animate: true, duration: 0.35, easeLinearity: 0.25 });
  }, [activeEventId, mapInitialized, storyPlaying]);

  return (
    <section
      className="map-stage"
      aria-label="Интерактивная карта библейской истории"
      data-map-engine="leaflet-maplibre-openfreemap"
      data-basemap-status={basemapStatus}
      data-basemap-language="ru"
      data-map-zoom={mapZoom}
      data-map-max-zoom={MAX_MAP_ZOOM}
      data-label-min-zoom={automaticLabelMinZoom}
      data-playback-motion={storyPlaying ? "fly" : "pan"}
      data-route-status={!route ? "unavailable" : routesEnabled ? "visible" : "hidden"}
      data-route-kind={route?.kind}
      data-regions-status={historicalRegionsEnabled ? "visible" : "hidden"}
      data-region-selection-count={visibleHistoricalRegions.length}
    >
      <div ref={containerRef} className="real-map" aria-label="Русскоязычная карта OpenFreeMap с местами библейских событий" />

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
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · реки: <a href="https://www.hydrosheds.org/products/hydrorivers" target="_blank" rel="noreferrer">HydroRIVERS</a>
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
