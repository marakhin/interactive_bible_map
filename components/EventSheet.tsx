"use client";

import { ArrowLeft, ArrowRight, Bookmark, BookOpen, CalendarDays, ChevronDown, Info, MapPin, Share2, Users, X } from "lucide-react";
import { characterById } from "@/data/characters";
import { eventById, events } from "@/data/events";
import { locationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import { chronologyLabels, localizationLabels } from "@/domain/types";
import { track } from "@/lib/analytics";
import { useBibleStore } from "@/store/useBibleStore";

function scriptureHref(bookId: string, chapter: number, verse?: number) {
  const codes: Record<string, string> = { genesis: "Gen", exodus: "Ex", numbers: "Num", deuteronomy: "Deut", joshua: "Nav", judges: "Judg", "1-samuel": "1Sam", "2-samuel": "2Sam", "1-kings": "1King", "2-kings": "2King", isaiah: "Is", jeremiah: "Jer", daniel: "Dan", ezra: "Ezr", nehemiah: "Neh", esther: "Esth", jonah: "Jona", matthew: "Mt", mark: "Mk", luke: "Lk", john: "Jn", acts: "Act" };
  return `https://azbyka.ru/biblia/?${codes[bookId] ?? bookId}.${chapter}${verse ? `:${verse}` : ""}=&r`;
}

export function EventSheet() {
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const selectEvent = useBibleStore((state) => state.selectEvent);
  const selectCharacter = useBibleStore((state) => state.selectCharacter);
  const selectLocation = useBibleStore((state) => state.selectLocation);
  const sheetTab = useBibleStore((state) => state.sheetTab);
  const setSheetTab = useBibleStore((state) => state.setSheetTab);
  const bookmarkIds = useBibleStore((state) => state.bookmarkIds);
  const toggleBookmark = useBibleStore((state) => state.toggleBookmark);
  const event = activeEventId ? eventById.get(activeEventId) : undefined;
  if (!event) return null;
  const mainLocation = event.locations.map((item) => locationById.get(item.locationId)).find(Boolean);
  const storyline = event.storylineIds.map((id) => storylineById.get(id)).find(Boolean);
  const sequence = storyline?.eventIds ?? events.map((item) => item.id);
  const index = sequence.indexOf(event.id);
  const previousId = index > 0 ? sequence[index - 1] : undefined;
  const nextId = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : undefined;

  return (
    <aside className="event-sheet" aria-label={`Событие: ${event.titleRu}`}>
      <button className="sheet-handle" aria-label="Закрыть карточку" onClick={() => selectEvent(undefined)}><ChevronDown size={19} /></button>
      <div className="event-sheet-head">
        <div><span className={`testament-badge ${event.testament.toLowerCase()}`}>{event.testament === "OT" ? "Ветхий Завет" : "Новый Завет"}</span><h2>{event.titleRu}</h2></div>
        <div className="sheet-head-actions"><button className="close-button" aria-label={bookmarkIds.includes(event.id) ? "Удалить из закладок" : "Добавить в закладки"} onClick={() => toggleBookmark(event.id)}><Bookmark size={20} fill={bookmarkIds.includes(event.id) ? "currentColor" : "none"} /></button><button className="close-button" aria-label="Закрыть" onClick={() => selectEvent(undefined)}><X size={20} /></button></div>
      </div>
      <div className="event-meta"><span><CalendarDays size={16} />{event.chronology.displayRu}</span>{mainLocation && <button onClick={() => { selectEvent(undefined); selectLocation(mainLocation.id); }}><MapPin size={16} />{mainLocation.ancientNameRu}</button>}</div>
      <div className="sheet-tabs" role="tablist">
        <button role="tab" aria-selected={sheetTab === "scripture"} onClick={() => setSheetTab("scripture")}>Писание</button>
        <button role="tab" aria-selected={sheetTab === "history"} onClick={() => setSheetTab("history")}>История</button>
        <button role="tab" aria-selected={sheetTab === "geography"} onClick={() => setSheetTab("geography")}>География</button>
        <button role="tab" aria-selected={sheetTab === "tradition"} onClick={() => setSheetTab("tradition")}>Предание</button>
      </div>
      <div className="sheet-content">
        {sheetTab === "scripture" && <><div className="section-kicker"><BookOpen size={16} />Что сообщает Писание</div><p className="lead-copy">{event.scriptureSummary}</p><div className="scripture-links">{event.scriptureReferences.map((reference) => <a key={reference.displayRu} href={scriptureHref(reference.bookId, reference.chapterStart, reference.verseStart)} target="_blank" rel="noreferrer" onClick={() => track("scripture_opened")}><BookOpen size={17} /><span><small>Читать в Синодальном переводе</small><b>{reference.displayRu}</b></span><ArrowRight size={17} /></a>)}</div></>}
        {sheetTab === "history" && <><div className="section-kicker"><Info size={16} />Редакционная справка</div><p>{event.historicalNote ?? "Отдельная историческая реконструкция для этого события не добавлена. Карточка следует тексту указанного места Писания."}</p><div className="honesty-note"><b>{chronologyLabels[event.chronology.certainty]}</b><span>{event.chronology.noteRu}</span></div></>}
        {sheetTab === "geography" && <><div className="section-kicker"><MapPin size={16} />Связанные места</div><div className="place-list">{event.locations.map((item) => { const place = locationById.get(item.locationId); return place ? <button key={`${event.id}-${item.locationId}-${item.order}`} onClick={() => { selectEvent(undefined); selectLocation(place.id); }}><span><b>{place.ancientNameRu}</b><small>{place.modernCountry}</small></span><em>{localizationLabels[place.localizationType]}</em></button> : null; })}</div></>}
        {sheetTab === "tradition" && <><div className="section-kicker"><BookOpen size={16} />Церковное Предание</div>{event.traditionNote ? <p>{event.traditionNote}</p> : <div className="empty-tab"><p>Для этого события отдельная заметка Предания пока не добавлена.</p><span>Этот раздел намеренно отделён от пересказа Писания.</span></div>}</>}
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
