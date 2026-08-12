"use client";

import { BookMarked, Bookmark, ChevronRight, CircleUserRound, History, Pause, Play, Route, Sparkles, X } from "lucide-react";
import { characters } from "@/data/characters";
import { events } from "@/data/events";
import { storylines } from "@/data/storylines";
import { locationById } from "@/data/locations";
import { track } from "@/lib/analytics";
import { useBibleStore } from "@/store/useBibleStore";

export function StudyPanel() {
  const open = useBibleStore((state) => state.studyOpen);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const activeCharacterId = useBibleStore((state) => state.activeCharacterId);
  const activeLocationId = useBibleStore((state) => state.activeLocationId);
  const setOpen = useBibleStore((state) => state.setStudyOpen);
  const selectStoryline = useBibleStore((state) => state.selectStoryline);
  const selectCharacter = useBibleStore((state) => state.selectCharacter);
  const selectEvent = useBibleStore((state) => state.selectEvent);
  const bookmarkIds = useBibleStore((state) => state.bookmarkIds);
  const storyPlaying = useBibleStore((state) => state.storyPlaying);
  const storySpeed = useBibleStore((state) => state.storySpeed);
  const setStoryPlaying = useBibleStore((state) => state.setStoryPlaying);
  const setStorySpeed = useBibleStore((state) => state.setStorySpeed);
  const bookmarkedEvents = events.filter((event) => bookmarkIds.includes(event.id));
  const lastEventId = typeof window !== "undefined" ? localStorage.getItem("bible-map-last-event") : null;
  const lastEvent = lastEventId ? events.find((event) => event.id === lastEventId) : undefined;
  const selectionEvents = activeStorylineId ? events.filter((event) => event.storylineIds.includes(activeStorylineId)) : activeCharacterId ? events.filter((event) => event.characters.includes(activeCharacterId)) : activeLocationId ? events.filter((event) => event.locations.some((item) => item.locationId === activeLocationId)) : [];
  const activeTitle = activeStorylineId ? storylines.find((item) => item.id === activeStorylineId)?.titleRu : activeCharacterId ? characters.find((item) => item.id === activeCharacterId)?.nameRu : activeLocationId ? locationById.get(activeLocationId)?.ancientNameRu : undefined;
  const selectStory = (id: string) => { selectStoryline(id); track("story_started", { id }); setOpen(false); };

  return (
    <aside className={`study-panel ${open ? "open" : ""}`} aria-label="Выбор пути изучения">
      <div className="study-head"><div><span className="eyebrow">Навигатор</span><h2>Изучать Писание</h2></div><button aria-label="Закрыть" onClick={() => setOpen(false)}><X size={20} /></button></div>
      {activeTitle ? <section className="active-selection"><div className="active-selection-title"><span><History size={17} /></span><div><small>Сейчас на карте</small><b>{activeTitle}</b></div></div>{activeStorylineId && <div className="story-player"><button onClick={() => setStoryPlaying(!storyPlaying)}>{storyPlaying ? <Pause size={17} /> : <Play size={17} />}{storyPlaying ? "Пауза" : "История"}</button><div>{([0.5,1,2] as const).map((speed) => <button key={speed} aria-pressed={storySpeed === speed} onClick={() => setStorySpeed(speed)}>{speed}×</button>)}</div></div>}<div className="event-rail">{selectionEvents.map((event, index) => <button key={event.id} onClick={() => { selectEvent(event.id); setOpen(false); }}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{event.titleRu}</b><small>{event.scriptureReferences[0].displayRu}</small></div><ChevronRight size={16} /></button>)}</div><button className="reset-selection" onClick={() => { selectStoryline(undefined); selectCharacter(undefined); }}>Вернуться ко всей истории</button></section> : <>
        <button className="featured-study" onClick={() => selectStory("abraham")}><span><Sparkles size={19} /></span><div><small>Рекомендуем начать здесь</small><b>Путь Авраама</b><p>Ур → Харран → Сихем → Вефиль → Хеврон</p></div><ChevronRight /></button>
        <section><h3><Route size={17} />Сюжетные линии</h3><div className="study-list">{storylines.filter((item) => item.importance === 5).map((story) => <button key={story.id} onClick={() => selectStory(story.id)}><span className={`story-dot ${story.testament.toLowerCase()}`} style={{ backgroundColor: story.color }} /><div><b>{story.titleRu}</b><small>{story.eventIds.length} событий · {story.testament === "OT" ? "ВЗ" : "НЗ"}</small></div><ChevronRight size={17} /></button>)}</div></section>
        <section><h3><CircleUserRound size={17} />Люди Писания</h3><div className="people-chips">{characters.filter((item) => ["abraham", "moses", "david", "theotokos", "jesus-christ", "paul"].includes(item.id)).map((person) => <button key={person.id} onClick={() => { selectCharacter(person.id); setOpen(false); }}>{person.nameRu}</button>)}</div></section>
        {lastEvent && <section><h3><History size={17} />Продолжить изучение</h3><button className="continue-card" onClick={() => { selectEvent(lastEvent.id); setOpen(false); }}><div><b>{lastEvent.titleRu}</b><small>{lastEvent.scriptureReferences[0].displayRu}</small></div><ChevronRight size={17} /></button></section>}
        {bookmarkedEvents.length > 0 && <section><h3><Bookmark size={17} />Закладки</h3><div className="study-list">{bookmarkedEvents.slice(0,5).map((event) => <button key={event.id} onClick={() => { selectEvent(event.id); setOpen(false); }}><Bookmark size={14} /><div><b>{event.titleRu}</b><small>{event.scriptureReferences[0].displayRu}</small></div><ChevronRight size={17} /></button>)}</div></section>}
        <section className="study-note"><BookMarked size={20} /><p><b>Карта следует Писанию.</b><br />Даты и локализации, которых нет в тексте, отмечены как приблизительные или спорные.</p></section>
      </>}
    </aside>
  );
}
