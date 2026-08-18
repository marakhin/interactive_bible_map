import { beforeEach, describe, expect, it } from "vitest";
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
      timelineFocused: false,
      allPointsEnabled: false,
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
});
