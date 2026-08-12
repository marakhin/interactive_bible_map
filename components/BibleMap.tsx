"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopology from "world-atlas/countries-110m.json";
import { events } from "@/data/events";
import { locationById, locations } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import type { BibleEvent, BibleLocation } from "@/domain/types";
import { useBibleStore } from "@/store/useBibleStore";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 720;
const MIN_LON = 10;
const MAX_LON = 50;
const MIN_LAT = 24;
const MAX_LAT = 43.5;
const HOME_VIEW = { x: 0, y: 0, scale: 1 };

type MapView = typeof HOME_VIEW;
type ProjectedPoint = { x: number; y: number };
type MapFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name?: string }>;

type BibleMapProps = {
  visibleEvents: BibleEvent[];
};

function project(longitude: number, latitude: number): ProjectedPoint {
  return {
    x: ((longitude - MIN_LON) / (MAX_LON - MIN_LON)) * VIEW_WIDTH,
    y: ((MAX_LAT - latitude) / (MAX_LAT - MIN_LAT)) * VIEW_HEIGHT,
  };
}

function projectedLocation(location: BibleLocation | undefined): ProjectedPoint | undefined {
  if (!location || location.longitude === undefined || location.latitude === undefined) return undefined;
  return project(location.longitude, location.latitude);
}

function eventLocation(event: BibleEvent): BibleLocation | undefined {
  const preferred = [...event.locations].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  return preferred ? locationById.get(preferred.locationId) : undefined;
}

function ringPath(ring: GeoJSON.Position[]): string {
  return ring.map(([longitude, latitude], index) => {
    const point = project(longitude, latitude);
    return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function geometryPath(geometry: MapFeature["geometry"]): string {
  if (geometry.type === "Polygon") return geometry.coordinates.map(ringPath).join(" ");
  return geometry.coordinates.flatMap((polygon) => polygon.map(ringPath)).join(" ");
}

const world = countriesTopology as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
const allCountries = (feature(world, world.objects.countries) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { name?: string }>).features;
const relevantCountries = allCountries.filter((country) => {
  const bounds = country.geometry.coordinates.flat(3) as unknown as number[];
  for (let index = 0; index < bounds.length; index += 2) {
    const longitude = bounds[index];
    const latitude = bounds[index + 1];
    if (longitude >= MIN_LON - 3 && longitude <= MAX_LON + 3 && latitude >= MIN_LAT - 3 && latitude <= MAX_LAT + 3) return true;
  }
  return false;
}) as MapFeature[];

function clampView(view: MapView): MapView {
  if (view.scale <= 1) return HOME_VIEW;
  const minX = VIEW_WIDTH - VIEW_WIDTH * view.scale;
  const minY = VIEW_HEIGHT - VIEW_HEIGHT * view.scale;
  return {
    scale: Math.min(5, Math.max(1, view.scale)),
    x: Math.min(0, Math.max(minX, view.x)),
    y: Math.min(0, Math.max(minY, view.y)),
  };
}

function zoomAt(view: MapView, factor: number, x = VIEW_WIDTH / 2, y = VIEW_HEIGHT / 2): MapView {
  const scale = Math.min(5, Math.max(1, view.scale * factor));
  if (scale === view.scale) return view;
  return clampView({
    scale,
    x: x - ((x - view.x) / view.scale) * scale,
    y: y - ((y - view.y) / view.scale) * scale,
  });
}

export function BibleMap({ visibleEvents }: BibleMapProps) {
  const [view, setView] = useState<MapView>(HOME_VIEW);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const historicalRegionsEnabled = useBibleStore((state) => state.historicalRegionsEnabled);
  const selectEvent = useBibleStore((state) => state.selectEvent);

  const markers = useMemo(() => {
    const grouped = new Map<string, { point: ProjectedPoint; events: BibleEvent[]; location: BibleLocation }>();
    for (const event of visibleEvents) {
      const location = eventLocation(event);
      const point = projectedLocation(location);
      if (!location || !point) continue;
      const current = grouped.get(location.id) ?? { point, events: [], location };
      current.events.push(event);
      grouped.set(location.id, current);
    }
    return [...grouped.values()];
  }, [visibleEvents]);

  const route = useMemo(() => {
    const storyline = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
    if (!storyline) return undefined;
    const points: ProjectedPoint[] = [];
    let previous = "";
    for (const eventId of storyline.eventIds) {
      const event = events.find((item) => item.id === eventId);
      if (!event) continue;
      for (const eventPlace of [...event.locations].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const point = projectedLocation(locationById.get(eventPlace.locationId));
        if (!point) continue;
        const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
        if (key === previous) continue;
        points.push(point);
        previous = key;
      }
    }
    return points.length > 1 ? { points, color: storyline.color } : undefined;
  }, [activeStorylineId]);

  useEffect(() => {
    const active = activeEventId ? events.find((event) => event.id === activeEventId) : undefined;
    const point = active ? projectedLocation(eventLocation(active)) : undefined;
    if (!point) return;
    const scale = Math.max(2.1, view.scale);
    setView(clampView({ x: VIEW_WIDTH / 2 - point.x * scale, y: VIEW_HEIGHT / 2 - point.y * scale, scale }));
    // React only to a newly selected event; manual panning must remain stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEventId]);

  function handleMarker(group: (typeof markers)[number]) {
    const selected = group.events.find((event) => event.id === activeEventId) ?? group.events[0];
    if (selected) selectEvent(selected.id);
  }

  return (
    <section className="map-stage" aria-label="Интерактивная карта библейской истории" data-map-engine="self-contained-svg">
      <svg
        className="biblical-geography"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label="Карта Восточного Средиземноморья, Египта и Месопотамии с местами библейских событий"
        onWheel={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
          const y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
          setView((current) => zoomAt(current, event.deltaY < 0 ? 1.22 : 0.82, x, y));
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setView(clampView({ ...view, x: drag.originX + (event.clientX - drag.x) * VIEW_WIDTH / rect.width, y: drag.originY + (event.clientY - drag.y) * VIEW_HEIGHT / rect.height }));
        }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <defs>
          <linearGradient id="sea-wash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#dbe8e5" />
            <stop offset="1" stopColor="#c9deda" />
          </linearGradient>
          <filter id="route-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#3b3026" floodOpacity=".25" />
          </filter>
        </defs>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#sea-wash)" />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <g className="country-shapes" aria-hidden="true">
            {relevantCountries.map((country, index) => <path key={`${country.id ?? index}`} d={geometryPath(country.geometry)} />)}
          </g>
          <g className="geography-water" aria-hidden="true">
            <ellipse cx={project(35.55, 32.82).x} cy={project(35.55, 32.82).y} rx="8" ry="15" />
            <ellipse cx={project(35.48, 31.35).x} cy={project(35.48, 31.35).y} rx="7" ry="20" />
            <path d={`M ${project(35.55, 32.72).x} ${project(35.55, 32.72).y} Q ${project(35.53, 32.1).x} ${project(35.53, 32.1).y} ${project(35.48, 31.55).x} ${project(35.48, 31.55).y}`} />
            <path d={`M ${project(31.15, 31.7).x} ${project(31.15, 31.7).y} Q ${project(31.0, 30.6).x} ${project(31.0, 30.6).y} ${project(31.2, 29.9).x} ${project(31.2, 29.9).y}`} />
          </g>
          {historicalRegionsEnabled && <g className="historical-regions" aria-label="Учебный слой исторических областей"><ellipse cx={project(31, 29.6).x} cy={project(31, 29.6).y} rx="80" ry="48" /><text x={project(31, 29.6).x} y={project(31, 29.6).y}>ЕГИПЕТ</text><ellipse cx={project(35.25, 31.7).x} cy={project(35.25, 31.7).y} rx="40" ry="75" /><text x={project(35.25, 31.7).x} y={project(35.25, 31.7).y}>ХАНААН</text><ellipse cx={project(44.5, 33.5).x} cy={project(44.5, 33.5).y} rx="80" ry="65" /><text x={project(44.5, 33.5).x} y={project(44.5, 33.5).y}>МЕСОПОТАМИЯ</text></g>}
          <g className="map-place-labels" aria-hidden="true">
            {["rome", "athens", "antioch", "damascus", "jerusalem", "alexandria", "babylon"].map((id) => {
              const fallback = id === "alexandria" ? { longitude: 29.92, latitude: 31.2, ancientNameRu: "Александрия" } : locationById.get(id);
              if (!fallback || fallback.longitude === undefined || fallback.latitude === undefined) return null;
              const point = project(fallback.longitude, fallback.latitude);
              return <text key={id} x={point.x} y={point.y - 9}>{fallback.ancientNameRu}</text>;
            })}
          </g>
          {route && <g className="biblical-route" aria-label="Маршрут сюжетной линии" filter="url(#route-shadow)"><polyline points={route.points.map((point) => `${point.x},${point.y}`).join(" ")} style={{ stroke: route.color }} /></g>}
          <g className="biblical-markers" aria-label="Места событий Писания">
            {markers.map((group) => {
              const active = group.events.some((event) => event.id === activeEventId);
              const testament = group.events.some((event) => event.testament === "NT") ? "NT" : "OT";
              return <g key={group.location.id} className={`biblical-marker ${active ? "active" : ""}`} transform={`translate(${group.point.x} ${group.point.y})`} onClick={() => handleMarker(group)} role="button" tabIndex={0} aria-label={`${group.location.ancientNameRu}: ${group.events.length} событий`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") handleMarker(group); }}><circle r={active ? 10 : group.events.length > 3 ? 8 : 6.5} className={testament === "NT" ? "nt" : "ot"} /><circle r="2.2" className="marker-core" />{group.events.length > 1 && <text x="9" y="-8">{group.events.length}</text>}<title>{group.location.ancientNameRu}: {group.events.map((event) => event.titleRu).join("; ")}</title></g>;
            })}
          </g>
        </g>
      </svg>
      <div className="map-legend" aria-label="Условные обозначения"><span><i className="legend-dot ot" />Ветхий Завет</span><span><i className="legend-dot nt" />Новый Завет</span><span><i className="legend-line" />маршрут по Писанию</span></div>
      <div className="map-credit">География Natural Earth · карта работает без внешних тайлов</div>
      <div className="map-controls">
        <button aria-label="Приблизить карту" onClick={() => setView((current) => zoomAt(current, 1.35))}><Plus size={18} /></button>
        <button aria-label="Отдалить карту" onClick={() => setView((current) => zoomAt(current, 0.74))}><Minus size={18} /></button>
        <button aria-label="Показать всю карту" onClick={() => setView(HOME_VIEW)}><LocateFixed size={18} /></button>
      </div>
      <span className="map-ready-sentinel" data-map-ready="true">Карта готова</span>
    </section>
  );
}
