"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, MapPin, Route, Sparkles } from "lucide-react";
import { characters } from "@/data/characters";
import { events } from "@/data/events";
import { locationById } from "@/data/locations";
import { storylineById } from "@/data/storylines";
import { getVisibleEvents } from "@/domain/timeline";
import { readUrlState, writeUrlState } from "@/lib/url-state";
import { useBibleStore } from "@/store/useBibleStore";
import { AboutPanel } from "./AboutPanel";
import { BibleMap } from "./BibleMap";
import { EventSheet } from "./EventSheet";
import { FiltersPanel } from "./FiltersPanel";
import { Header } from "./Header";
import { SearchOverlay } from "./SearchOverlay";
import { StudyPanel } from "./StudyPanel";
import { Timeline } from "./Timeline";

export default function BibleAtlasApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(0);
  const testamentFilter = useBibleStore((state) => state.testamentFilter);
  const timeWindow = useBibleStore((state) => state.timeWindow);
  const activeEventId = useBibleStore((state) => state.activeEventId);
  const activeStorylineId = useBibleStore((state) => state.activeStorylineId);
  const activeCharacterId = useBibleStore((state) => state.activeCharacterId);
  const activeLocationId = useBibleStore((state) => state.activeLocationId);
  const activeBookId = useBibleStore((state) => state.activeBookId);
  const timelineFocused = useBibleStore((state) => state.timelineFocused);
  const activeTime = useBibleStore((state) => state.activeTime);
  const timelineZoom = useBibleStore((state) => state.timelineZoom);
  const storyPlaying = useBibleStore((state) => state.storyPlaying);
  const storySpeed = useBibleStore((state) => state.storySpeed);
  const bookmarkIds = useBibleStore((state) => state.bookmarkIds);
  const selectStoryline = useBibleStore((state) => state.selectStoryline);
  const setStudyOpen = useBibleStore((state) => state.setStudyOpen);

  useEffect(() => {
    const initial = readUrlState();
    const state = useBibleStore.getState();
    if (initial.activeEventId && events.some((item) => item.id === initial.activeEventId)) state.selectEvent(initial.activeEventId);
    if (initial.activeStorylineId && storylineById.has(initial.activeStorylineId)) state.selectStoryline(initial.activeStorylineId);
    if (initial.activeCharacterId && characters.some((item) => item.id === initial.activeCharacterId)) state.selectCharacter(initial.activeCharacterId);
    if (initial.activeLocationId && locationById.has(initial.activeLocationId)) state.selectLocation(initial.activeLocationId);
    if (initial.activeBookId && events.some((item) => item.scriptureReferences.some((ref) => ref.bookId === initial.activeBookId))) state.selectBook(initial.activeBookId);
    if (["ALL", "OT", "NT"].includes(initial.testamentFilter ?? "")) state.setTestament(initial.testamentFilter!);
    if (!localStorage.getItem("bible-map-onboarding")) setOnboarding(1);
    try { state.setBookmarks(JSON.parse(localStorage.getItem("bible-map-bookmarks") ?? "[]")); } catch { state.setBookmarks([]); }
    setReady(true);
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); state.setSearchOpen(true); }
      if (event.key === "Escape") { state.selectEvent(undefined); state.setSearchOpen(false); state.setFiltersOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeUrlState({ activeEventId, activeStorylineId, activeCharacterId, activeLocationId, activeBookId, testamentFilter });
    if (activeEventId) localStorage.setItem("bible-map-last-event", activeEventId);
  }, [ready, activeEventId, activeStorylineId, activeCharacterId, activeLocationId, activeBookId, testamentFilter]);

  useEffect(() => { if (ready) localStorage.setItem("bible-map-bookmarks", JSON.stringify(bookmarkIds)); }, [ready, bookmarkIds]);

  useEffect(() => {
    if (!storyPlaying || !activeStorylineId) return;
    const sequence = storylineById.get(activeStorylineId)?.eventIds ?? [];
    if (!sequence.length) return;
    const timer = window.setInterval(() => {
      const current = useBibleStore.getState().activeEventId;
      const currentIndex = current ? sequence.indexOf(current) : -1;
      const next = sequence[(currentIndex + 1) % sequence.length];
      useBibleStore.getState().selectEvent(next);
    }, 4200 / storySpeed);
    return () => window.clearInterval(timer);
  }, [storyPlaying, storySpeed, activeStorylineId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) registration.unregister();
    }).catch(() => undefined);
    if ("caches" in window) caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("biblical-map-")).map((key) => caches.delete(key)))).catch(() => undefined);
  }, []);

  const visibleEvents = useMemo(() => {
    let result = events.filter((event) => testamentFilter === "ALL" || event.testament === testamentFilter);
    if (activeStorylineId) result = result.filter((event) => event.storylineIds.includes(activeStorylineId));
    else if (activeCharacterId) result = result.filter((event) => event.characters.includes(activeCharacterId));
    else if (activeLocationId) result = result.filter((event) => event.locations.some((item) => item.locationId === activeLocationId));
    else if (activeBookId) result = result.filter((event) => event.scriptureReferences.some((ref) => ref.bookId === activeBookId));
    else {
      if (timelineFocused) {
        const radii = [240, 120, 55, 15, 3];
        const radius = radii[timelineZoom - 1];
        result = getVisibleEvents(result, activeTime - radius, activeTime + radius);
      } else {
        result = result.filter((event) => event.importance === 5).slice(0, 18);
      }
    }
    return result;
  }, [testamentFilter, activeStorylineId, activeCharacterId, activeLocationId, activeBookId, timeWindow, timelineFocused, activeTime, timelineZoom]);

  const context = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
  const person = activeCharacterId ? characters.find((item) => item.id === activeCharacterId) : undefined;
  const place = activeLocationId ? locationById.get(activeLocationId) : undefined;
  const book = activeBookId ? events.flatMap((event) => event.scriptureReferences).find((ref) => ref.bookId === activeBookId) : undefined;
  const closeOnboarding = () => { localStorage.setItem("bible-map-onboarding", "seen"); setOnboarding(0); };

  return (
    <main className="atlas-app">
      <Header onAbout={() => setAboutOpen(true)} />
      <div className="workspace"><StudyPanel /><div className="map-column"><BibleMap visibleEvents={visibleEvents} /><div className="context-card"><div className="context-icon">{context ? <Route /> : person || book ? <BookOpen /> : place ? <MapPin /> : <Sparkles />}</div><div><span className="eyebrow">{context ? "Сюжетная линия" : person ? "История человека" : place ? "Что здесь произошло?" : book ? "География книги" : timelineFocused ? "Что происходило в это время?" : "Вся библейская история"}</span><h1>{context?.titleRu ?? person?.nameRu ?? place?.ancientNameRu ?? book?.bookRu ?? (timelineFocused ? `${visibleEvents.length} событий на карте` : "Исследуйте историю Писания")}</h1><p>{context?.descriptionRu ?? person?.descriptionRu ?? (place ? `${visibleEvents.length} связанных событий из разных эпох.` : book ? `Места событий, связанных с книгой «${book.bookRu}».` : timelineFocused ? "Карта показывает события в выбранном временном окне. Изменяйте масштаб шкалы для большей или меньшей детализации." : "Двигайте временную шкалу или выберите сюжет — и карта покажет места, маршруты и соответствующие места Писания.")}</p></div>{!context && !person && !place && !book && !timelineFocused ? <button onClick={() => { selectStoryline("abraham"); setStudyOpen(true); }}><span>Начать с Авраама</span><ArrowRight size={18} /></button> : <button onClick={() => setStudyOpen(true)}><span>{visibleEvents.length} событий</span><ArrowRight size={18} /></button>}</div><Timeline visibleEvents={visibleEvents} /></div></div>
      <EventSheet /><SearchOverlay /><FiltersPanel /><AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {onboarding > 0 && <div className="onboarding"><div className="onboarding-card"><span>{onboarding}/3</span>{onboarding === 1 && <><div className="onboarding-art timeline-art"><i /><i /><i /></div><h2>Путешествуйте по истории</h2><p>Двигайте временную шкалу, чтобы видеть события Писания в их последовательности.</p></>}{onboarding === 2 && <><div className="onboarding-art marker-art"><i /></div><h2>Открывайте события</h2><p>Нажмите на маркер, чтобы увидеть место и точную ссылку на Священное Писание.</p></>}{onboarding === 3 && <><div className="onboarding-art route-art"><i /></div><h2>Следуйте за повествованием</h2><p>Выберите человека или сюжет, чтобы увидеть его путь на карте.</p></>}<div className="onboarding-actions"><button onClick={closeOnboarding}>Пропустить</button><button onClick={() => onboarding < 3 ? setOnboarding(onboarding + 1) : closeOnboarding()}>{onboarding < 3 ? "Далее" : "Начать"}<ArrowRight size={17} /></button></div></div></div>}
    </main>
  );
}
