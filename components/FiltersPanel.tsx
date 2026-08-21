"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Filter, Layers3, Route, Waves, X } from "lucide-react";
import { biblicalRegions } from "@/data/biblical-regions";
import { useBibleStore } from "@/store/useBibleStore";

export function FiltersPanel() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const open = useBibleStore((state) => state.filtersOpen);
  const setOpen = useBibleStore((state) => state.setFiltersOpen);
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

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, setOpen]);

  const activeCount = Number(testament !== "ALL") + Number(!routes) + Number(!rivers) + Number(regions);

  return (
    <div className="map-filter-control" ref={rootRef}>
      <button
        className="map-filter-trigger"
        type="button"
        aria-label="Фильтры"
        aria-expanded={open}
        aria-controls="map-filter-dropdown"
        onClick={() => setOpen(!open)}
      >
        <Filter size={15} />
        <span>Фильтры</span>
        {activeCount > 0 && <b aria-label={`Активных настроек: ${activeCount}`}>{activeCount}</b>}
        <ChevronDown className={open ? "open" : undefined} size={14} />
      </button>

      {open && (
        <div id="map-filter-dropdown" className="map-filter-dropdown" role="dialog" aria-label="Фильтры карты">
          <div className="filter-dropdown-head">
            <div><span className="eyebrow">Что показывать</span><h2>Фильтры карты</h2></div>
            <button type="button" aria-label="Закрыть фильтры" onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <fieldset>
            <legend>Завет</legend>
            <div className="segmented">
              {([['ALL', 'Вся история'], ['OT', 'Ветхий'], ['NT', 'Новый']] as const).map(([id, label]) => (
                <button type="button" key={id} aria-pressed={testament === id} onClick={() => setTestament(id)}>{label}</button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Точки, линии и слои</legend>
            <label className="switch-row"><span><Route size={19} /><span><b>Соединять точки маршрутом</b><small>Линии можно скрыть, точки останутся</small></span></span><input type="checkbox" checked={routes} onChange={toggleRoutes} /></label>
            <label className="switch-row"><span><Waves size={19} /><span><b>Реки, названные в Писании</b><small>Тигр и Евфрат · Быт. 2:14</small></span></span><input type="checkbox" checked={rivers} onChange={toggleRivers} /></label>
            <label className="switch-row"><span><Layers3 size={19} /><span><b>Области и земли Писания</b><small>Выбрано {selectedRegions.length} из {biblicalRegions.length}</small></span></span><input type="checkbox" checked={regions} onChange={toggleRegions} /></label>
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

          <div className="filter-note">Современные русла рек и контуры областей показаны как учебная схема; они не определяют местоположение Эдемского сада.</div>
          <button className="filter-done" type="button" onClick={() => setOpen(false)}>Готово</button>
        </div>
      )}
    </div>
  );
}
