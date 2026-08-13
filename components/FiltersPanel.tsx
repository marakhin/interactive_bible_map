"use client";

import { Layers3, Waves, X } from "lucide-react";
import { useBibleStore } from "@/store/useBibleStore";

export function FiltersPanel() {
  const open = useBibleStore((state) => state.filtersOpen);
  const close = () => useBibleStore.getState().setFiltersOpen(false);
  const testament = useBibleStore((state) => state.testamentFilter);
  const setTestament = useBibleStore((state) => state.setTestament);
  const regions = useBibleStore((state) => state.historicalRegionsEnabled);
  const toggleRegions = useBibleStore((state) => state.toggleRegions);
  const rivers = useBibleStore((state) => state.biblicalRiversEnabled);
  const toggleRivers = useBibleStore((state) => state.toggleRivers);
  if (!open) return null;
  return <div className="overlay side-overlay" role="dialog" aria-modal="true" aria-label="Фильтры"><div className="filters-panel"><div className="study-head"><div><span className="eyebrow">Отображение</span><h2>Фильтры карты</h2></div><button aria-label="Закрыть" onClick={close}><X size={20} /></button></div><fieldset><legend>Завет</legend><div className="segmented">{([['ALL','Вся история'],['OT','Ветхий'],['NT','Новый']] as const).map(([id,label]) => <button key={id} aria-pressed={testament === id} onClick={() => setTestament(id)}>{label}</button>)}</div></fieldset><fieldset><legend>Учебные слои</legend><label className="switch-row"><span><Waves size={19} /><span><b>Реки, названные в Писании</b><small>Тигр и Евфрат · Быт. 2:14</small></span></span><input type="checkbox" checked={rivers} onChange={toggleRivers} /></label><label className="switch-row"><span><Layers3 size={19} /><span><b>Исторические области</b><small>Обобщённый учебный слой, не точные границы</small></span></span><input type="checkbox" checked={regions} onChange={toggleRegions} /></label></fieldset><div className="filter-note">Современные русла Тигра и Евфрата показаны как реально существующие реки, прямо названные в Быт. 2:14. Они не определяют местоположение Эдемского сада.</div><button className="primary-action" onClick={close}>Показать на карте</button></div></div>;
}
