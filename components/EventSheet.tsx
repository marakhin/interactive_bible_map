"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, CalendarDays, ChevronDown, ChevronUp, Info, MapPin, Pause, Share2, Users, X } from "lucide-react";
import { characterById } from "@/data/characters";
import { eventById, events } from "@/data/events";
import { interfaceLocationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import { getSynodalPassages, synodalMetadata } from "@/data/synodal";
import { chronologyLabels, localizationLabels } from "@/domain/types";
import { getPrimaryEventLocation } from "@/domain/event-locations";
import { useBibleStore } from "@/store/useBibleStore";

export function EventSheet() {
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const eventSheetOpen = useBibleStore((state) => state.eventSheetOpen);
  const selectEvent = useBibleStore((state) => state.selectEvent);
  const closeEventSheet = useBibleStore((state) => state.closeEventSheet);
  const selectCharacter = useBibleStore((state) => state.selectCharacter);
  const selectLocation = useBibleStore((state) => state.selectLocation);
  const sheetTab = useBibleStore((state) => state.sheetTab);
  const setSheetTab = useBibleStore((state) => state.setSheetTab);
  const bookmarkIds = useBibleStore((state) => state.bookmarkIds);
  const toggleBookmark = useBibleStore((state) => state.toggleBookmark);
  const storyPlaying = useBibleStore((state) => state.storyPlaying);
  const setStoryPlaying = useBibleStore((state) => state.setStoryPlaying);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const dragRef = useRef<{ pointerId: number; startY: number; startedAt: number; offset: number } | null>(null);
  const dismissTimerRef = useRef<number | undefined>(undefined);
  const suppressHandleClickRef = useRef(false);
  const event = activeEventId ? eventById.get(activeEventId) : undefined;

  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
    setIsDismissing(false);
    setSheetExpanded(false);
    dragRef.current = null;
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
  }, [activeEventId, eventSheetOpen]);

  useEffect(() => () => {
    if (dismissTimerRef.current !== undefined) window.clearTimeout(dismissTimerRef.current);
  }, []);

  if (!event || !eventSheetOpen) return null;
  const mainLocation = getPrimaryEventLocation(event, interfaceLocationById);
  const storyline = event.storylineIds.map((id) => storylineById.get(id)).find(Boolean);
  const sequence = storyline?.eventIds ?? events.map((item) => item.id);
  const index = sequence.indexOf(event.id);
  const previousId = index > 0 ? sequence[index - 1] : undefined;
  const nextId = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;
  const scripturePassages = event.scriptureReferences.flatMap((reference) => getSynodalPassages(reference));

  const finishDismiss = () => {
    setIsDragging(false);
    setIsDismissing(true);
    setDragOffset(window.innerHeight);
    dismissTimerRef.current = window.setTimeout(closeEventSheet, 190);
  };

  const handlePointerDown = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pointerEvent.isPrimary || isDismissing) return;
    dragRef.current = { pointerId: pointerEvent.pointerId, startY: pointerEvent.clientY, startedAt: performance.now(), offset: 0 };
    suppressHandleClickRef.current = false;
    setIsDragging(true);
    try { pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId); } catch { /* Synthetic test events do not own pointer capture. */ }
  };

  const handlePointerMove = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerEvent.pointerId) return;
    const nextOffset = pointerEvent.clientY - drag.startY;
    drag.offset = nextOffset;
    if (Math.abs(nextOffset) > 6) suppressHandleClickRef.current = true;
    setDragOffset(Math.max(0, nextOffset));
  };

  const handlePointerEnd = (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerEvent.pointerId) return;
    const velocity = drag.offset / Math.max(performance.now() - drag.startedAt, 1);
    dragRef.current = null;
    setIsDragging(false);
    if (!sheetExpanded && drag.offset <= -48) {
      setSheetExpanded(true);
      setDragOffset(0);
    } else if (drag.offset >= 72 || (drag.offset >= 24 && velocity >= 0.55)) finishDismiss();
    else setDragOffset(0);
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <aside
      className={`event-sheet${storyPlaying ? " story-playing" : ""}${sheetExpanded ? " expanded" : ""}${isDragging ? " is-dragging" : ""}${isDismissing ? " is-dismissing" : ""}`}
      aria-label={`Событие: ${event.titleRu}`}
      data-sheet-drag-offset={Math.round(dragOffset)}
      data-sheet-expanded={sheetExpanded ? "true" : "false"}
      style={{ "--sheet-drag-y": `${dragOffset}px` } as CSSProperties}
    >
      <div className="story-playback-summary" aria-live="polite">
        <div className="story-playback-copy">
          <span>Сейчас на карте</span>
          <strong>{event.titleRu}</strong>
          <small>{event.chronology.displayRu}{mainLocation ? ` · ${mainLocation.ancientNameRu}` : ""}</small>
          <p>{event.scriptureSummary}</p>
        </div>
        <div className="story-playback-actions">
          <button aria-label="Поставить воспроизведение на паузу" onClick={() => setStoryPlaying(false)}><Pause size={17} /></button>
          <button onClick={() => setStoryPlaying(false)}>Подробнее</button>
        </div>
      </div>
      <button
        className="sheet-handle"
        aria-label={sheetExpanded ? "Свернуть карточку" : "Развернуть карточку"}
        onClick={() => {
          if (suppressHandleClickRef.current) { suppressHandleClickRef.current = false; return; }
          setSheetExpanded((expanded) => !expanded);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
      ><span>{sheetExpanded ? "Свернуть" : "Развернуть"}</span>{sheetExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</button>
      <div className="event-sheet-head">
        <div><span className={`testament-badge ${event.testament.toLowerCase()}`}>{event.testament === "OT" ? "Ветхий Завет" : "Новый Завет"}</span><h2>{event.titleRu}</h2></div>
        <div className="sheet-head-actions"><button className="close-button" aria-label={bookmarkIds.includes(event.id) ? "Удалить из закладок" : "Добавить в закладки"} onClick={() => toggleBookmark(event.id)}><Bookmark size={20} fill={bookmarkIds.includes(event.id) ? "currentColor" : "none"} /></button><button className="close-button" aria-label="Закрыть" onClick={closeEventSheet}><X size={20} /></button></div>
      </div>
      <div className="event-meta"><span><CalendarDays size={16} />{event.chronology.displayRu}</span>{mainLocation && <button onClick={() => { selectEvent(undefined); selectLocation(mainLocation.id); }}><MapPin size={16} />{mainLocation.ancientNameRu}</button>}</div>
      <div className="sheet-tabs" role="tablist">
        <button role="tab" aria-selected={sheetTab === "scripture"} onClick={() => setSheetTab("scripture")}>Писание</button>
        <button role="tab" aria-selected={sheetTab === "history"} onClick={() => setSheetTab("history")}>История</button>
        <button role="tab" aria-selected={sheetTab === "geography"} onClick={() => setSheetTab("geography")}>География</button>
      </div>
      <div className="sheet-content">
        {sheetTab === "scripture" && <>
          <div className="section-kicker"><BookOpen size={16} />Что сообщает Писание</div>
          <p className="lead-copy">{event.scriptureSummary}</p>
          <div className="synodal-heading"><div><span>Синодальный перевод</span><b>{event.scriptureReferences.map((reference) => reference.displayRu).join("; ")}</b></div><small>Текст внутри карты</small></div>
          <div className="synodal-text" data-synodal-text="true">
            {scripturePassages.map((passage, passageIndex) => <section key={`${passage.displayRu}-${passageIndex}`}>
              {scripturePassages.length > 1 && <h3>{passage.displayRu}</h3>}
              {passage.verses.map((verse) => <p key={`${passageIndex}-${verse.chapter}-${verse.verse}`}><sup>{verse.verse}</sup>{verse.text}</p>)}
            </section>)}
          </div>
          <div className="synodal-source"><span>Синодальный перевод {synodalMetadata.edition} года · {synodalMetadata.canonRu} · отрывок загружен в приложение</span><a href={synodalMetadata.source} target="_blank" rel="noreferrer">Источник текста</a></div>
        </>}
        {sheetTab === "history" && <><div className="section-kicker"><Info size={16} />Редакционная справка</div><p>{event.historicalNote ?? "Отдельная историческая реконструкция для этого события не добавлена. Карточка следует тексту указанного места Писания."}</p><div className="honesty-note"><b>{chronologyLabels[event.chronology.certainty]}</b><span>{event.chronology.noteRu}</span></div></>}
        {sheetTab === "geography" && <><div className="section-kicker"><MapPin size={16} />Связанные места</div><div className="place-list">{event.locations.map((item) => { const place = interfaceLocationById.get(item.locationId); return place ? <button key={`${event.id}-${item.locationId}-${item.order}`} onClick={() => { selectEvent(undefined); selectLocation(place.id); }}><span><b>{place.ancientNameRu}</b><small>{place.modernCountry}</small>{place.localizationNoteRu && <small className="place-note">{place.localizationNoteRu}</small>}</span><em>{localizationLabels[place.localizationType]}</em></button> : null; })}</div></>}
        {!!event.characters.length && <div className="participants"><div className="section-kicker"><Users size={16} />Участники</div><div>{event.characters.map((id) => { const person = characterById.get(id); return person ? <button key={id} onClick={() => { selectEvent(undefined); selectCharacter(id); }}>{person.nameRu}</button> : null; })}</div></div>}
      </div>
      <div className="sheet-nav">
        <button disabled={!previousId} onClick={() => previousId && selectEvent(previousId)}><ArrowLeft size={18} /><span><small>Предыдущее</small>{previousId ? eventById.get(previousId)?.titleRu : "Начало сюжета"}</span></button>
        <button className="share-event" aria-label="Поделиться событием" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={18} /></button>
        <button disabled={!nextId} onClick={() => nextId && selectEvent(nextId)}><span><small>Следующее</small>{nextId ? eventById.get(nextId)?.titleRu : "Конец сюжета"}</span><ArrowRight size={18} /></button>
      </div>
    </aside>
  );
}
