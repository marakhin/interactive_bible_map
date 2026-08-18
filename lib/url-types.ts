import type { TestamentFilter } from "@/domain/types";

export interface BibleStateSnapshot {
  activeEventId?: string;
  activeStorylineId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
  activeBookId?: string;
  allPointsEnabled?: boolean;
  testamentFilter: TestamentFilter;
}
