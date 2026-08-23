import { beforeEach, describe, expect, it } from "vitest";
import { biblicalRegions } from "@/data/biblical-regions";
import { useBibleStore } from "@/store/useBibleStore";

describe("режимы отображения карты", () => {
  beforeEach(() => {
    useBibleStore.setState({
      testamentFilter: "ALL",
      activeStorylineId: undefined,
      activeCharacterId: undefined,
      activeLocationId: undefined,
      activeBookId: undefined,
      activeEventId: undefined,
      eventSheetOpen: false,
      studyOpen: false,
      filtersOpen: false,
      timeRange: { start: -2200, end: 100 },
      timelineFocused: false,
      allPointsEnabled: false,
      historicalRegionsEnabled: false,
      selectedHistoricalRegionIds: biblicalRegions.map((region) => region.id),
      routesEnabled: true,
      storyPlaying: false,
    });
  });

  it("снимает фильтры при выборе всех точек", () => {
    useBibleStore.getState().selectBook("mark");
    useBibleStore.getState().showAllPoints();
    const state = useBibleStore.getState();
    expect(state.allPointsEnabled).toBe(true);
    expect(state.activeBookId).toBeUndefined();
    expect(state.activeStorylineId).toBeUndefined();
    expect(state.testamentFilter).toBe("ALL");
  });

  it("скрывает маршрут независимо от точек и выбранного сюжета", () => {
    useBibleStore.getState().selectStoryline("abraham");
    useBibleStore.getState().toggleRoutes();
    const state = useBibleStore.getState();
    expect(state.activeStorylineId).toBe("abraham");
    expect(state.routesEnabled).toBe(false);
  });

  it("включает временной фильтр при изменении двустороннего диапазона", () => {
    useBibleStore.getState().setTimeRange({ start: -600, end: -500 });
    const state = useBibleStore.getState();
    expect(state.timeRange).toEqual({ start: -600, end: -500 });
    expect(state.timelineFocused).toBe(true);
    expect(state.allPointsEnabled).toBe(false);
  });

  it("скрывает карточку, сохраняя выбранную точку, и повторно открывает её", () => {
    useBibleStore.getState().selectEvent("abraham-call");
    expect(useBibleStore.getState().eventSheetOpen).toBe(true);

    useBibleStore.getState().closeEventSheet();
    expect(useBibleStore.getState().activeEventId).toBe("abraham-call");
    expect(useBibleStore.getState().eventSheetOpen).toBe(false);

    useBibleStore.getState().selectEvent("abraham-call");
    expect(useBibleStore.getState().eventSheetOpen).toBe(true);
  });

  it("закрывает фильтры при открытии навигатора изучения", () => {
    useBibleStore.getState().setFiltersOpen(true);
    useBibleStore.getState().setStudyOpen(true);

    const state = useBibleStore.getState();
    expect(state.studyOpen).toBe(true);
    expect(state.filtersOpen).toBe(false);
  });

  it("оставляет активным только последний фильтр книги или эпохи", () => {
    useBibleStore.getState().selectBook("luke");
    useBibleStore.getState().setTimeRange({ start: -1050, end: -586 });
    let state = useBibleStore.getState();
    expect(state.activeBookId).toBeUndefined();
    expect(state.timelineFocused).toBe(true);

    useBibleStore.getState().selectBook("luke");
    state = useBibleStore.getState();
    expect(state.activeBookId).toBe("luke");
    expect(state.timelineFocused).toBe(false);
  });

  it("позволяет выбирать отдельные области независимо от общего переключателя слоя", () => {
    useBibleStore.getState().toggleRegions();
    useBibleStore.getState().clearHistoricalRegions();
    useBibleStore.getState().toggleHistoricalRegion("galilee");
    let state = useBibleStore.getState();
    expect(state.historicalRegionsEnabled).toBe(true);
    expect(state.selectedHistoricalRegionIds).toEqual(["galilee"]);

    useBibleStore.getState().selectAllHistoricalRegions();
    state = useBibleStore.getState();
    expect(state.selectedHistoricalRegionIds).toHaveLength(biblicalRegions.length);
  });
});
