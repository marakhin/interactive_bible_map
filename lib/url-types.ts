import type { TestamentFilter } from "@/domain/types";

export interface BibleStateSnapshot {
  activeEventId?: string;
  activeStorylineId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
  testamentFilter: TestamentFilter;
}
