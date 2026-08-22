"use client";

import { useEffect, useState } from "react";
import { BookMarked, Bookmark, ChevronRight, CircleUserRound, History, MapPinned, Pause, Play, Route, Sparkles, X } from "lucide-react";
import { bibleBookById, bibleBooks } from "@/data/books";
import { characters } from "@/data/characters";
import { events } from "@/data/events";
import { interfaceLocationById } from "@/data/locations";
import { storylines } from "@/data/storylines";
import { track } from "@/lib/analytics";
import { useBibleStore } from "@/store/useBibleStore";

const featuredPersonIds = ["abraham", "isaac", "jacob", "joseph", "moses", "david", "theotokos", "jesus-christ", "peter", "paul"];

export function StudyPanel() {
  const open = useBibleStore((state) => state.studyOpen);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const activeCharacterId = useBibleStore((state) => state.activeCharacterId);
  const activeLocationId = useBibleStore((state) => state.activeLocationId);
  const activeBookId = useBibleStore((state) => state.activeBookId);
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const allPointsEnabled = useBibleStore((state) => state.allPointsEnabled);
  const setOpen = useBibleStore((state) => state.setStudyOpen);
  const selectStoryline = useBibleStore((state) => state.selectStoryline);
  const selectCharacter = useBibleStore((state) => state.selectCharacter);
  const selectBook = useBibleStore((state) => state.selectBook);
  const selectEvent = useBibleStore((state) => state.selectEvent);
  const showAllPoints = useBibleStore((state) => state.showAllPoints);
  const bookmarkIds = useBibleStore((state) => state.bookmarkIds);
  const storyPlaying = useBibleStore((state) => state.storyPlaying);
  const storySpeed = useBibleStore((state) => state.storySpeed);
  const setStoryPlaying = useBibleStore((state) => state.setStoryPlaying);
  const setStorySpeed = useBibleStore((state) => state.setStorySpeed);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  useEffect(() => { setLastEventId(localStorage.getItem("bible-map-last-event")); }, [activeEventId]);
  const bookmarkedEvents = events.filter((event) => bookmarkIds.includes(event.id));
  const lastEvent = lastEventId ? events.find((event) => event.id === lastEventId) : undefined;
  const selectionEvents = activeStorylineId
    ? events.filter((event) => event.storylineIds.includes(activeStorylineId))
    : activeCharacterId
      ? events.filter((event) => event.characters.includes(activeCharacterId))
      : activeLocationId
        ? events.filter((event) => event.locations.some((item) => item.locationId === activeLocationId))
        : activeBookId
          ? events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === activeBookId))
          : [];
  const activeTitle = activeStorylineId
    ? storylines.find((item) => item.id === activeStorylineId)?.titleRu
    : activeCharacterId
      ? characters.find((item) => item.id === activeCharacterId)?.nameRu
      : activeLocationId
        ? interfaceLocationById.get(activeLocationId)?.ancientNameRu
        : activeBookId
          ? bibleBookById.get(activeBookId)?.titleRu
          : undefined;
  const selectStory = (id: string) => { selectStoryline(id); track("story_started", { id }); setOpen(false); };
  const selectBookStudy = (id: string) => { selectBook(id); track("book_started", { id }); setOpen(false); };
  const showEveryPoint = () => { showAllPoints(); track("all_points_opened"); setOpen(false); };
  const toggleStoryPlayback = () => {
    const nextPlaying = !storyPlaying;
    setStoryPlaying(nextPlaying);
    if (nextPlaying && window.matchMedia("(max-width: 767px)").matches) setOpen(false);
  };

  return (
    <aside className={`study-panel ${open ? "open" : ""}`} aria-label="Выбор пути изучения">
      <div className="study-head"><div><span className="eyebrow">Навигатор</span><h2>Изучать Писание</h2></div><button aria-label="Закрыть" onClick={() => setOpen(false)}><X size={20} /></button></div>
      {activeTitle ? <section className="active-selection">
        <div className="active-selection-title"><span>{activeBookId ? <BookMarked size={17} /> : <History size={17} />}</span><div><small>{activeBookId ? "Книга на карте" : "Сейчас на карте"}</small><b>{activeTitle}</b></div></div>
        {activeStorylineId && <div className="story-player"><button onClick={toggleStoryPlayback}>{storyPlaying ? <Pause size={17} /> : <Play size={17} />}{storyPlaying ? "Пауза" : "История"}</button><div>{([0.5, 1, 2] as const).map((speed) => <button key={speed} aria-pressed={storySpeed === speed} onClick={() => setStorySpeed(speed)}>{speed}×</button>)}</div></div>}
        {activeBookId && <p className="book-selection-note">На карте показаны места событий, прямо связанных с этой книгой. Выберите отрывок, чтобы открыть текст Писания.</p>}
        <div className="event-rail">{selectionEvents.map((event, index) => <button key={event.id} data-event-id={event.id} onClick={() => { selectEvent(event.id); setOpen(false); }}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{event.titleRu}</b><small>{event.scriptureReferences.filter((reference) => !activeBookId || reference.bookId === activeBookId).map((reference) => reference.displayRu).join("; ")}</small></div><ChevronRight size={16} /></button>)}</div>
        <button className="reset-selection" onClick={showEveryPoint}>Показать все точки без фильтров</button>
      </section> : <>
        <button className="all-points-study" aria-pressed={allPointsEnabled} onClick={showEveryPoint}><span><MapPinned size={19} /></span><div><b>Все точки Писания</b><small>Без фильтров по книгам и сюжетам</small></div><ChevronRight size={18} /></button>
        <button className="featured-study" onClick={() => selectStory("abraham")}><span><Sparkles size={19} /></span><div><small>Рекомендуем начать здесь</small><b>Путь Авраама</b><p>Ур → Харран → Сихем → Вефиль → Хеврон</p></div><ChevronRight /></button>
        <section><h3><Route size={17} />Сюжетные линии</h3><div className="study-list">{storylines.filter((item) => item.importance === 5).map((story) => <button key={story.id} onClick={() => selectStory(story.id)}><span className={`story-dot ${story.testament.toLowerCase()}`} style={{ backgroundColor: story.color }} /><div><b>{story.titleRu}</b><small>{story.eventIds.length} событий · {story.testament === "OT" ? "ВЗ" : "НЗ"}</small></div><ChevronRight size={17} /></button>)}</div></section>
        <section><h3><BookMarked size={17} />Книги Писания</h3><div className="study-list book-study-list">{bibleBooks.map((book) => <button key={book.id} data-book-id={book.id} onClick={() => selectBookStudy(book.id)}><BookMarked size={15} className={book.testament.toLowerCase()} /><div><b>{book.titleRu}</b><small>{book.placeCount} мест · {book.eventCount} событий · {book.testament === "OT" ? "ВЗ" : "НЗ"}</small></div><ChevronRight size={17} /></button>)}</div></section>
        <section><h3><CircleUserRound size={17} />Люди Писания</h3><div className="people-chips">{characters.filter((item) => featuredPersonIds.includes(item.id)).map((person) => <button key={person.id} data-character-id={person.id} onClick={() => { selectCharacter(person.id); setOpen(false); }}>{person.nameRu}</button>)}</div></section>
        {lastEvent && <section><h3><History size={17} />Продолжить изучение</h3><button className="continue-card" onClick={() => { selectEvent(lastEvent.id); setOpen(false); }}><div><b>{lastEvent.titleRu}</b><small>{lastEvent.scriptureReferences[0].displayRu}</small></div><ChevronRight size={17} /></button></section>}
        {bookmarkedEvents.length > 0 && <section><h3><Bookmark size={17} />Закладки</h3><div className="study-list">{bookmarkedEvents.slice(0, 5).map((event) => <button key={event.id} onClick={() => { selectEvent(event.id); setOpen(false); }}><Bookmark size={14} /><div><b>{event.titleRu}</b><small>{event.scriptureReferences[0].displayRu}</small></div><ChevronRight size={17} /></button>)}</div></section>}
        <section className="study-note"><BookMarked size={20} /><p><b>Карта следует Писанию.</b><br />Даты и локализации, которых нет в тексте, отмечены как приблизительные или спорные.</p></section>
      </>}
    </aside>
  );
}
