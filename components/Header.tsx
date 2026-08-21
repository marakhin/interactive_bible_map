"use client";

import { BookOpenText, Compass, Info, Menu, Search, X } from "lucide-react";
import { useBibleStore } from "@/store/useBibleStore";

export function Header({ onAbout }: { onAbout: () => void }) {
  const setSearchOpen = useBibleStore((state) => state.setSearchOpen);
  const setStudyOpen = useBibleStore((state) => state.setStudyOpen);
  const studyOpen = useBibleStore((state) => state.studyOpen);

  return (
    <header className="app-header">
      <button className="icon-button mobile-only" aria-label="Открыть выбор сюжета" onClick={() => setStudyOpen(!studyOpen)}>{studyOpen ? <X size={21} /> : <Menu size={21} />}</button>
      <button className="brand" onClick={() => setStudyOpen(true)} aria-label="Библейская карта — начать изучение"><span className="brand-mark"><BookOpenText size={21} /></span><span><b>Библейская карта</b><small>Писание во времени и пространстве</small></span></button>
      <nav className="desktop-nav" aria-label="Главная навигация">
        <button onClick={() => setStudyOpen(true)}><Compass size={17} />Изучать</button>
        <button onClick={onAbout}><Info size={17} />О проекте</button>
      </nav>
      <div className="header-actions">
        <button className="search-button" onClick={() => setSearchOpen(true)}><Search size={18} /><span>Найти событие, место, человека…</span><kbd>⌘ K</kbd></button>
        <button className="icon-button" aria-label="Поиск" onClick={() => setSearchOpen(true)}><Search size={20} /></button>
      </div>
    </header>
  );
}
