import { describe, expect, it } from "vitest";
import { getEventNavigation } from "@/domain/event-navigation";

describe("переходы карточки между разделами", () => {
  it("продолжает выбранную книгу вместо первого сюжета события", () => {
    const navigation = getEventNavigation("ascension", { activeBookId: "mark", testamentFilter: "ALL" });
    expect(navigation.next?.bookId).toBeDefined();
    expect(navigation.next?.eventId).not.toBe("pentecost");
  });

  it("на границе сюжета Давида переходит в царство и возвращается обратно", () => {
    const next = getEventNavigation("david-covenant", { activeStorylineId: "david", testamentFilter: "ALL" }).next;
    expect(next?.storylineId).toBe("kingdom");
    expect(next?.collectionTitle).toBe("Царство и храм");
    expect(getEventNavigation(next!.eventId, { activeStorylineId: next!.storylineId, testamentFilter: "ALL" }).previous)
      .toMatchObject({ eventId: "david-covenant", storylineId: "david" });
  });

  it("учитывает выбранный сюжет у события с несколькими сюжетами", () => {
    const navigation = getEventNavigation("paul-conversion", { activeStorylineId: "paul-1", testamentFilter: "ALL" });
    expect(navigation.next?.eventId).toBe("antioch-disciples");
  });

  it("не зацикливает последний сюжет и не прыгает из неизвестного события", () => {
    expect(getEventNavigation("paul-rome", { activeStorylineId: "paul-rome", testamentFilter: "ALL" }).next).toBeUndefined();
    expect(getEventNavigation("missing", { activeBookId: "mark", testamentFilter: "ALL" }).next).toBeUndefined();
  });
});
