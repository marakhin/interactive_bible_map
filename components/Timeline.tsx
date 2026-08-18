"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { eras, formatBiblicalYear, getTimelineEvents, getTimelineFit, getTimelineTicks, getWindowForZoom } from "@/domain/timeline";
import { useBibleStore } from "@/store/useBibleStore";
import type { BibleEvent } from "@/domain/types";
import { track } from "@/lib/analytics";

export function Timeline({ visibleEvents, selectionKey }: { visibleEvents: BibleEvent[]; selectionKey?: string }) {
  const activeTime = useBibleStore((state) => state.activeTime);
  const timeWindow = useBibleStore((state) => state.timeWindow);
  const timelineZoom = useBibleStore((state) => state.timelineZoom);
  const setTime = useBibleStore((state) => state.setTime);
  const setTimeWindow = useBibleStore((state) => state.setTimeWindow);
  const setZoom = useBibleStore((state) => state.setZoom);
  const fitTimeline = useBibleStore((state) => state.fitTimeline);
  const selectionEventKey = selectionKey ? visibleEvents.map((event) => event.id).join("|") : "";

  useEffect(() => {
    if (!selectionKey) return;
    const fit = getTimelineFit(visibleEvents);
    if (fit) fitTimeline(fit.timeWindow, fit.zoom, fit.activeTime);
    // selectionEventKey is the stable content signature; visibleEvents can be recreated by unrelated store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, selectionEventKey, fitTimeline]);

  const changeZoom = (next: number) => {
    const zoom = Math.max(1, Math.min(5, next));
    setZoom(zoom);
    setTimeWindow(getWindowForZoom(activeTime, zoom));
    track("timeline_changed", { zoom });
  };
  const shift = (direction: number) => {
    const width = timeWindow.end - timeWindow.start;
    const next = { start: Math.round(timeWindow.start + width * 0.6 * direction), end: Math.round(timeWindow.end + width * 0.6 * direction) };
    if (next.start <= -1 && next.end >= 1) {
      if (next.start === 0) next.start = -1;
      if (next.end === 0) next.end = 1;
    }
    setTimeWindow(next);
    setTime(Math.round((next.start + next.end) / 2) || 1);
  };
  const ticks = getTimelineTicks(timeWindow.start, timeWindow.end);
  const percent = Math.max(0, Math.min(100, ((activeTime - timeWindow.start) / (timeWindow.end - timeWindow.start)) * 100));
  const markerEvents = getTimelineEvents(visibleEvents);

  return (
    <section className="timeline" aria-label="Временная шкала" data-visible-events={visibleEvents.length} data-dated-events={markerEvents.length}>
      <div className="timeline-topline">
        <div><span className="eyebrow">Временная шкала</span><strong>{timelineZoom === 1 ? "Вся библейская история" : `${formatBiblicalYear(timeWindow.start)} — ${formatBiblicalYear(timeWindow.end)}`}</strong></div>
        <div className="timeline-actions"><button aria-label="Предыдущий временной отрезок" onClick={() => shift(-1)}><ChevronLeft size={19} /></button><button aria-label="Уменьшить масштаб времени" disabled={timelineZoom === 1} onClick={() => changeZoom(timelineZoom - 1)}><Minus size={17} /></button><span>{timelineZoom}×</span><button aria-label="Увеличить масштаб времени" disabled={timelineZoom === 5} onClick={() => changeZoom(timelineZoom + 1)}><Plus size={17} /></button><button aria-label="Следующий временной отрезок" onClick={() => shift(1)}><ChevronRight size={19} /></button></div>
      </div>
      <div className="era-chips" aria-label="Эпохи">{eras.slice(1).map((era) => <button key={era.id} onClick={() => { setTimeWindow({ start: era.start, end: era.end }); setTime(Math.round((era.start + era.end) / 2)); }}>{era.title}</button>)}</div>
      <div className="timeline-track-wrap">
        <div className="timeline-testament-label">ВЕТХИЙ ЗАВЕТ</div><div className="timeline-nt-label">НОВЫЙ ЗАВЕТ</div>
        <div className="timeline-track">
          <div className="timeline-progress" style={{ width: `${percent}%` }} />
          {markerEvents.map((event) => {
            const year = event.chronology.startYear!;
            const left = ((year - timeWindow.start) / (timeWindow.end - timeWindow.start)) * 100;
            if (left < 0 || left > 100) return null;
            return <button key={event.id} data-event-id={event.id} className={`timeline-event ${event.testament.toLowerCase()}`} style={{ left: `${left}%` }} title={event.titleRu} aria-label={event.titleRu} onClick={() => useBibleStore.getState().selectEvent(event.id)} />;
          })}
          <input aria-label="Положение на временной шкале" type="range" min={timeWindow.start} max={timeWindow.end} value={activeTime} onChange={(event) => { const value = Number(event.target.value); setTime(value === 0 ? 1 : value); track("timeline_changed", { year: value }); }} />
        </div>
        <div className="timeline-ticks">{ticks.map((tick) => <span key={tick}>{Math.abs(tick) >= 1000 ? `${Math.abs(tick) / 1000} тыс.` : Math.abs(tick)}{tick < 0 ? " до Р. Х." : ""}</span>)}</div>
      </div>
    </section>
  );
}
