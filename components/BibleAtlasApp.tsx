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
  const selectStoryline = useBibleStore((state) => state.selectStoryline);
  const setStudyOpen = useBibleStore((state) => state.setStudyOpen);

  useEffect(() => {
    const initial = readUrlState();
    const state = useBibleStore.getState();
    if (initial.activeEventId && events.some((item) => item.id === initial.activeEventId)) state.selectEvent(initial.activeEventId);
    if (initial.activeStorylineId && storylineById.has(initial.activeStorylineId)) state.selectStoryline(initial.activeStorylineId);
    if (initial.activeCharacterId && characters.some((item) => item.id === initial.activeCharacterId)) state.selectCharacter(initial.activeCharacterId);
    if (initial.activeLocationId && locationById.has(initial.activeLocationId)) state.selectLocation(initial.activeLocationId);
    if (["ALL", "OT", "NT"].includes(initial.testamentFilter ?? "")) state.setTestament(initial.testamentFilter!);
    if (!localStorage.getItem("bible-map-onboarding")) setOnboarding(1);
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
    writeUrlState({ activeEventId, activeStorylineId, activeCharacterId, activeLocationId, testamentFilter });
  }, [ready, activeEventId, activeStorylineId, activeCharacterId, activeLocationId, testamentFilter]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const visibleEvents = useMemo(() => {
    let result = events.filter((event) => testamentFilter === "ALL" || event.testament === testamentFilter);
    if (activeStorylineId) result = result.filter((event) => event.storylineIds.includes(activeStorylineId));
    else if (activeCharacterId) result = result.filter((event) => event.characters.includes(activeCharacterId));
    else if (activeLocationId) result = result.filter((event) => event.locations.some((item) => item.locationId === activeLocationId));
    else {
      const timeFiltered = getVisibleEvents(result, timeWindow.start, timeWindow.end);
      const relative = result.filter((event) => event.chronology.type === "relative" && testamentFilter !== "NT");
      result = [...relative, ...timeFiltered];
    }
    return result;
  }, [testamentFilter, activeStorylineId, activeCharacterId, activeLocationId, timeWindow]);

  const context = activeStorylineId ? storylineById.get(activeStorylineId) : undefined;
  const person = activeCharacterId ? characters.find((item) => item.id === activeCharacterId) : undefined;
  const place = activeLocationId ? locationById.get(activeLocationId) : undefined;
  const closeOnboarding = () => { localStorage.setItem("bible-map-onboarding", "seen"); setOnboarding(0); };

  return (
    <main className="atlas-app">
      <Header onAbout={() => setAboutOpen(true)} />
      <div className="workspace"><StudyPanel /><div className="map-column"><BibleMap visibleEvents={visibleEvents} /><div className="context-card"><div className="context-icon">{context ? <Route /> : person ? <BookOpen /> : place ? <MapPin /> : <Sparkles />}</div><div><span className="eyebrow">{context ? "Сюжетная линия" : person ? "История человека" : place ? "Что здесь произошло?" : "Вся библейская история"}</span><h1>{context?.titleRu ?? person?.nameRu ?? place?.ancientNameRu ?? "Исследуйте историю Писания"}</h1><p>{context?.descriptionRu ?? person?.descriptionRu ?? (place ? `${visibleEvents.length} связанных событий из разных эпох.` : "Двигайте временную шкалу или выберите сюжет — и карта покажет места, маршруты и соответствующие места Писания.")}</p></div>{!context && !person && !place ? <button onClick={() => { selectStoryline("abraham"); setStudyOpen(true); }}><span>Начать с Авраама</span><ArrowRight size={18} /></button> : <button onClick={() => setStudyOpen(true)}><span>{visibleEvents.length} событий</span><ArrowRight size={18} /></button>}</div><Timeline visibleEvents={visibleEvents} /></div></div>
      <EventSheet /><SearchOverlay /><FiltersPanel /><AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {onboarding > 0 && <div className="onboarding"><div className="onboarding-card"><span>{onboarding}/3</span>{onboarding === 1 && <><div className="onboarding-art timeline-art"><i /><i /><i /></div><h2>Путешествуйте по истории</h2><p>Двигайте временную шкалу, чтобы видеть события Писания в их последовательности.</p></>}{onboarding === 2 && <><div className="onboarding-art marker-art"><i /></div><h2>Открывайте события</h2><p>Нажмите на маркер, чтобы увидеть место и точную ссылку на Священное Писание.</p></>}{onboarding === 3 && <><div className="onboarding-art route-art"><i /></div><h2>Следуйте за повествованием</h2><p>Выберите человека или сюжет, чтобы увидеть его путь на карте.</p></>}<div className="onboarding-actions"><button onClick={closeOnboarding}>Пропустить</button><button onClick={() => onboarding < 3 ? setOnboarding(onboarding + 1) : closeOnboarding()}>{onboarding < 3 ? "Далее" : "Начать"}<ArrowRight size={17} /></button></div></div></div>}
    </main>
  );
}
