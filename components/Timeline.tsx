"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  eras,
  formatBiblicalYear,
  getTimelineEvents,
  getTimelineFit,
  getTimelineTicks,
  getTimelineZoomForSpan,
  getWindowForZoom,
  nextBiblicalYear,
  previousBiblicalYear,
  type TimeRange,
} from "@/domain/timeline";
import { useBibleStore } from "@/store/useBibleStore";
import type { BibleEvent } from "@/domain/types";
import { track } from "@/lib/analytics";

type DragMode = "start" | "end" | "range";
type DragState = { mode: DragMode; pointerId: number; startX: number; range: TimeRange };

function normalizeYear(value: number, rawValue = value): number {
  if (value !== 0) return value;
  return rawValue < 0 ? -1 : 1;
}

function shiftYear(year: number, delta: number): number {
  return normalizeYear(year + delta, delta);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function constrainRange(range: TimeRange, window: TimeRange): TimeRange {
  const rangeWidth = range.end - range.start;
  const windowWidth = window.end - window.start;
  if (rangeWidth >= windowWidth) return window;
  if (range.start < window.start) {
    const end = window.start + rangeWidth;
    return { start: window.start, end: end === 0 ? 1 : end };
  }
  if (range.end > window.end) {
    const start = window.end - rangeWidth;
    return { start: start === 0 ? -1 : start, end: window.end };
  }
  return range;
}

function rangeCenter(range: TimeRange): number {
  return normalizeYear(Math.round((range.start + range.end) / 2), range.start + range.end);
}

export function Timeline({ events, selectionKey }: { events: BibleEvent[]; selectionKey?: string }) {
  const timeRange = useBibleStore((state) => state.timeRange);
  const timeWindow = useBibleStore((state) => state.timeWindow);
  const timelineZoom = useBibleStore((state) => state.timelineZoom);
  const setTimeRange = useBibleStore((state) => state.setTimeRange);
  const setTimeWindow = useBibleStore((state) => state.setTimeWindow);
  const setZoom = useBibleStore((state) => state.setZoom);
  const fitTimeline = useBibleStore((state) => state.fitTimeline);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const selectionEventKey = selectionKey ? events.map((event) => event.id).join("|") : "";

  useEffect(() => {
    if (!selectionKey) return;
    const fit = getTimelineFit(events);
    if (fit) fitTimeline(fit.timeWindow, fit.zoom, fit.timeRange);
    // selectionEventKey is the stable content signature; events can be recreated by unrelated store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, selectionEventKey, fitTimeline]);

  const changeZoom = (next: number) => {
    const zoom = Math.max(1, Math.min(5, next));
    const nextWindow = getWindowForZoom(rangeCenter(timeRange), zoom);
    setZoom(zoom);
    setTimeWindow(nextWindow);
    setTimeRange(constrainRange(timeRange, nextWindow));
    track("timeline_changed", { zoom });
  };

  const shift = (direction: number) => {
    const width = timeWindow.end - timeWindow.start;
    const delta = Math.round(width * 0.6 * direction);
    const nextWindow = { start: shiftYear(timeWindow.start, delta), end: shiftYear(timeWindow.end, delta) };
    const nextRange = { start: shiftYear(timeRange.start, delta), end: shiftYear(timeRange.end, delta) };
    setTimeWindow(nextWindow);
    setTimeRange(nextRange);
    track("timeline_changed", { start: nextRange.start, end: nextRange.end });
  };

  const selectEra = (range: TimeRange) => {
    setZoom(getTimelineZoomForSpan(range.end - range.start));
    setTimeWindow(range);
    setTimeRange(range);
  };

  const beginDrag = (mode: DragMode, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode, pointerId: event.pointerId, startX: event.clientX, range: timeRange };
  };

  const yearAtPointer = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return timeRange.start;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const rawValue = timeWindow.start + ratio * (timeWindow.end - timeWindow.start);
    return normalizeYear(Math.round(rawValue), rawValue);
  };

  const continueDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === "start") {
      const start = clamp(yearAtPointer(event.clientX), timeWindow.start, previousBiblicalYear(drag.range.end));
      setTimeRange({ start, end: drag.range.end });
      return;
    }
    if (drag.mode === "end") {
      const end = clamp(yearAtPointer(event.clientX), nextBiblicalYear(drag.range.start), timeWindow.end);
      setTimeRange({ start: drag.range.start, end });
      return;
    }

    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const rawDelta = ((event.clientX - drag.startX) / rect.width) * (timeWindow.end - timeWindow.start);
    const delta = clamp(Math.round(rawDelta), timeWindow.start - drag.range.start, timeWindow.end - drag.range.end);
    setTimeRange({ start: shiftYear(drag.range.start, delta), end: shiftYear(drag.range.end, delta) });
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    track("timeline_changed", { start: timeRange.start, end: timeRange.end });
  };

  const handleKeyDown = (edge: "start" | "end", event: KeyboardEvent<HTMLElement>) => {
    const span = timeWindow.end - timeWindow.start;
    const step = Math.max(1, Math.round(span / 200));
    const pageStep = Math.max(step, Math.round(span / 20));
    let next: number | undefined;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = shiftYear(timeRange[edge], -step);
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = shiftYear(timeRange[edge], step);
    if (event.key === "PageDown") next = shiftYear(timeRange[edge], -pageStep);
    if (event.key === "PageUp") next = shiftYear(timeRange[edge], pageStep);
    if (event.key === "Home") next = edge === "start" ? timeWindow.start : nextBiblicalYear(timeRange.start);
    if (event.key === "End") next = edge === "start" ? previousBiblicalYear(timeRange.end) : timeWindow.end;
    if (next === undefined) return;
    event.preventDefault();
    if (edge === "start") {
      setTimeRange({ start: clamp(next, timeWindow.start, previousBiblicalYear(timeRange.end)), end: timeRange.end });
    } else {
      setTimeRange({ start: timeRange.start, end: clamp(next, nextBiblicalYear(timeRange.start), timeWindow.end) });
    }
  };

  const ticks = getTimelineTicks(timeWindow.start, timeWindow.end);
  const windowSpan = Math.max(1, timeWindow.end - timeWindow.start);
  const startPercent = clamp(((timeRange.start - timeWindow.start) / windowSpan) * 100, 0, 100);
  const endPercent = clamp(((timeRange.end - timeWindow.start) / windowSpan) * 100, 0, 100);
  const markerEvents = getTimelineEvents(events);
  const rangeLabel = `${formatBiblicalYear(timeRange.start)} — ${formatBiblicalYear(timeRange.end)}`;

  return (
    <section
      className="timeline"
      aria-label="Временная шкала"
      data-visible-events={events.length}
      data-dated-events={markerEvents.length}
      data-range-start={timeRange.start}
      data-range-end={timeRange.end}
      data-window-start={timeWindow.start}
      data-window-end={timeWindow.end}
    >
      <div className="timeline-topline">
        <div><span className="eyebrow">Временной диапазон</span><strong aria-live="polite">{rangeLabel}</strong></div>
        <div className="timeline-actions"><button aria-label="Предыдущий временной отрезок" onClick={() => shift(-1)}><ChevronLeft size={19} /></button><button aria-label="Уменьшить масштаб времени" disabled={timelineZoom === 1} onClick={() => changeZoom(timelineZoom - 1)}><Minus size={17} /></button><span>{timelineZoom}×</span><button aria-label="Увеличить масштаб времени" disabled={timelineZoom === 5} onClick={() => changeZoom(timelineZoom + 1)}><Plus size={17} /></button><button aria-label="Следующий временной отрезок" onClick={() => shift(1)}><ChevronRight size={19} /></button></div>
      </div>
      <div className="era-chips" aria-label="Эпохи">{eras.slice(1).map((era) => <button key={era.id} onClick={() => selectEra({ start: era.start, end: era.end })}>{era.title}</button>)}</div>
      <div className="timeline-track-wrap">
        <div className="timeline-testament-label">ВЕТХИЙ ЗАВЕТ</div><div className="timeline-nt-label">НОВЫЙ ЗАВЕТ</div>
        <div className="timeline-track" ref={trackRef}>
          <div
            className="timeline-range-selection"
            aria-label="Переместить выбранный временной диапазон"
            style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
            onPointerDown={(event) => beginDrag("range", event)}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          {markerEvents.map((event) => {
            const year = event.chronology.startYear!;
            const left = ((year - timeWindow.start) / windowSpan) * 100;
            if (left < 0 || left > 100) return null;
            return <button key={event.id} data-event-id={event.id} className={`timeline-event ${event.testament.toLowerCase()}`} style={{ left: `${left}%` }} title={event.titleRu} aria-label={event.titleRu} onClick={() => useBibleStore.getState().selectEvent(event.id)} />;
          })}
          <div
            className="timeline-range-handle start"
            role="slider"
            tabIndex={0}
            aria-label="Начало временного диапазона"
            aria-valuemin={timeWindow.start}
            aria-valuemax={previousBiblicalYear(timeRange.end)}
            aria-valuenow={timeRange.start}
            aria-valuetext={formatBiblicalYear(timeRange.start)}
            style={{ left: `${startPercent}%` }}
            onKeyDown={(event) => handleKeyDown("start", event)}
            onPointerDown={(event) => beginDrag("start", event)}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          <div
            className="timeline-range-handle end"
            role="slider"
            tabIndex={0}
            aria-label="Конец временного диапазона"
            aria-valuemin={nextBiblicalYear(timeRange.start)}
            aria-valuemax={timeWindow.end}
            aria-valuenow={timeRange.end}
            aria-valuetext={formatBiblicalYear(timeRange.end)}
            style={{ left: `${endPercent}%` }}
            onKeyDown={(event) => handleKeyDown("end", event)}
            onPointerDown={(event) => beginDrag("end", event)}
            onPointerMove={continueDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </div>
        <div className="timeline-ticks">{ticks.map((tick) => <span key={tick}>{Math.abs(tick) >= 1000 ? `${Math.abs(tick) / 1000} тыс.` : Math.abs(tick)}{tick < 0 ? " до Р. Х." : ""}</span>)}</div>
      </div>
    </section>
  );
}
