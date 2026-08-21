"use client";

import { Layers3, Route, Waves, X } from "lucide-react";
import { biblicalRegions } from "@/data/biblical-regions";
import { useBibleStore } from "@/store/useBibleStore";

export function FiltersPanel() {
  const open = useBibleStore((state) => state.filtersOpen);
  const close = () => useBibleStore.getState().setFiltersOpen(false);
  const testament = useBibleStore((state) => state.testamentFilter);
  const setTestament = useBibleStore((state) => state.setTestament);
  const regions = useBibleStore((state) => state.historicalRegionsEnabled);
  const selectedRegions = useBibleStore((state) => state.selectedHistoricalRegionIds);
  const toggleRegions = useBibleStore((state) => state.toggleRegions);
  const toggleHistoricalRegion = useBibleStore((state) => state.toggleHistoricalRegion);
  const selectAllHistoricalRegions = useBibleStore((state) => state.selectAllHistoricalRegions);
  const clearHistoricalRegions = useBibleStore((state) => state.clearHistoricalRegions);
  const rivers = useBibleStore((state) => state.biblicalRiversEnabled);
  const toggleRivers = useBibleStore((state) => state.toggleRivers);
  const routes = useBibleStore((state) => state.routesEnabled);
  const toggleRoutes = useBibleStore((state) => state.toggleRoutes);
  if (!open) return null;
  return (
    <div className="overlay side-overlay" role="dialog" aria-modal="true" aria-label="Фильтры">
      <div className="filters-panel">
        <div className="study-head"><div><span className="eyebrow">Отображение</span><h2>Фильтры карты</h2></div><button aria-label="Закрыть" onClick={close}><X size={20} /></button></div>
        <fieldset>
          <legend>Завет</legend>
          <div className="segmented">{([['ALL','Вся история'],['OT','Ветхий'],['NT','Новый']] as const).map(([id,label]) => <button key={id} aria-pressed={testament === id} onClick={() => setTestament(id)}>{label}</button>)}</div>
        </fieldset>
        <fieldset>
          <legend>Учебные слои</legend>
          <label className="switch-row"><span><Route size={19} /><span><b>Соединять точки маршрутом</b><small>Скрывает линии, но сохраняет все точки</small></span></span><input type="checkbox" checked={routes} onChange={toggleRoutes} /></label>
          <label className="switch-row"><span><Waves size={19} /><span><b>Реки, названные в Писании</b><small>Тигр и Евфрат · Быт. 2:14</small></span></span><input type="checkbox" checked={rivers} onChange={toggleRivers} /></label>
          <label className="switch-row"><span><Layers3 size={19} /><span><b>Области и земли Писания</b><small>Выбрано {selectedRegions.length} из {biblicalRegions.length} · границы схематичны</small></span></span><input type="checkbox" checked={regions} onChange={toggleRegions} /></label>
          {regions && (
            <div className="region-selector" aria-label="Выбор областей и земель Писания">
              <div className="region-selector-actions">
                <b>Какие области показать</b>
                <span><button type="button" onClick={selectAllHistoricalRegions}>Все</button><button type="button" onClick={clearHistoricalRegions}>Очистить</button></span>
              </div>
              <div className="region-selector-grid">
                {biblicalRegions.map((region) => (
                  <label key={region.id}>
                    <input type="checkbox" checked={selectedRegions.includes(region.id)} onChange={() => toggleHistoricalRegion(region.id)} />
                    <i style={{ backgroundColor: region.color }} />
                    <span><b>{region.nameRu}</b><small>{region.scripture}</small></span>
                  </label>
                ))}
              </div>
              {!selectedRegions.length && <p>Ни одна область не выбрана: слой останется пустым.</p>}
            </div>
          )}
        </fieldset>
        <div className="filter-note">Маршрут можно скрыть, чтобы оставить только точки. Современные русла Тигра и Евфрата показаны отдельно; они не определяют местоположение Эдемского сада. Контуры областей являются учебной схемой: Писание не задаёт их координаты, а исторические пределы менялись.</div>
        <button className="primary-action" onClick={close}>Показать на карте</button>
      </div>
    </div>
  );
}
