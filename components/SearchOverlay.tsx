"use client";

import { BookOpen, Clock3, MapPin, Route, Search, UserRound, X } from "lucide-react";
import { characters } from "@/data/characters";
import { events } from "@/data/events";
import { locations } from "@/data/locations";
import { storylines } from "@/data/storylines";
import { track } from "@/lib/analytics";
import { useBibleStore } from "@/store/useBibleStore";

const normalize = (text: string) => text.toLocaleLowerCase("ru-RU");

export function SearchOverlay() {
  const open = useBibleStore((state) => state.searchOpen);
  const query = useBibleStore((state) => state.searchQuery);
  const mode = useBibleStore((state) => state.searchMode);
  const setOpen = useBibleStore((state) => state.setSearchOpen);
  const setQuery = useBibleStore((state) => state.setSearchQuery);
  const setMode = useBibleStore((state) => state.setSearchMode);
  if (!open) return null;
  const term = normalize(query.trim());
  const matches = (value: string) => !term || normalize(value).includes(term);
  const eventResults = events.filter((event) => matches(`${event.titleRu} ${event.scriptureSummary} ${event.scriptureReferences.map((r) => r.displayRu).join(" ")}`)).slice(0, term ? 8 : 4);
  const peopleResults = characters.filter((person) => matches(`${person.nameRu} ${person.descriptionRu}`)).slice(0, 6);
  const placeResults = locations.filter((place) => matches(`${place.ancientNameRu} ${place.modernNameRu ?? ""} ${place.modernCountry ?? ""}`)).slice(0, 6);
  const storyResults = storylines.filter((story) => matches(`${story.titleRu} ${story.descriptionRu}`)).slice(0, 6);
  const close = () => setOpen(false);
  const select = (kind: "event" | "person" | "place" | "story", id: string) => {
    const state = useBibleStore.getState();
    if (kind === "event") state.selectEvent(id);
    if (kind === "person") state.selectCharacter(id);
    if (kind === "place") state.selectLocation(id);
    if (kind === "story") state.selectStoryline(id);
    track("search_used", { kind }); close();
  };

  return (
    <div className="overlay search-overlay" role="dialog" aria-modal="true" aria-label="Поиск по библейской карте">
      <div className="search-panel">
        <div className="search-input"><Search size={23} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Событие, место, человек или книга…" aria-label="Поисковый запрос" /><button onClick={close} aria-label="Закрыть поиск"><X size={21} /></button></div>
        <div className="search-modes">{([['all', 'Всё'], ['events', 'События'], ['people', 'Люди'], ['places', 'Места'], ['stories', 'Сюжеты']] as const).map(([id, label]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
        <div className="search-results">
          {(mode === "all" || mode === "events") && eventResults.length > 0 && <ResultSection title="События"><div className="result-grid">{eventResults.map((event) => <button key={event.id} onClick={() => select("event", event.id)}><span className={`result-icon ${event.testament.toLowerCase()}`}><Clock3 size={18} /></span><span><b>{event.titleRu}</b><small>{event.chronology.displayRu} · {event.scriptureReferences[0].displayRu}</small></span></button>)}</div></ResultSection>}
          {(mode === "all" || mode === "people") && peopleResults.length > 0 && <ResultSection title="Люди"><div className="result-grid compact">{peopleResults.map((person) => <button key={person.id} onClick={() => select("person", person.id)}><span className="result-icon"><UserRound size={18} /></span><span><b>{person.nameRu}</b><small>{person.testament === "OT" ? "Ветхий Завет" : "Новый Завет"}</small></span></button>)}</div></ResultSection>}
          {(mode === "all" || mode === "places") && placeResults.length > 0 && <ResultSection title="Места"><div className="result-grid compact">{placeResults.map((place) => <button key={place.id} onClick={() => select("place", place.id)}><span className="result-icon"><MapPin size={18} /></span><span><b>{place.ancientNameRu}</b><small>{place.modernCountry ?? "Локализация не установлена"}</small></span></button>)}</div></ResultSection>}
          {(mode === "all" || mode === "stories") && storyResults.length > 0 && <ResultSection title="Сюжеты"><div className="result-grid compact">{storyResults.map((story) => <button key={story.id} onClick={() => select("story", story.id)}><span className="result-icon"><Route size={18} /></span><span><b>{story.titleRu}</b><small>{story.eventIds.length} событий</small></span></button>)}</div></ResultSection>}
          {!eventResults.length && !peopleResults.length && !placeResults.length && !storyResults.length && <div className="no-results"><BookOpen size={30} /><b>Ничего не найдено</b><span>Попробуйте название места, человека или книги Писания.</span></div>}
        </div>
      </div>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3>{title}</h3>{children}</section>;
}
