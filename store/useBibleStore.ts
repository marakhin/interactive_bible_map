"use client";

import { create } from "zustand";
import type { TestamentFilter } from "@/domain/types";

type TimeWindow = { start: number; end: number };
type SearchMode = "all" | "events" | "people" | "places" | "stories";

interface BibleState {
  testamentFilter: TestamentFilter;
  activeTime: number;
  timeWindow: TimeWindow;
  activeEventId?: string;
  activeStorylineId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
  timelineZoom: number;
  historicalRegionsEnabled: boolean;
  searchOpen: boolean;
  studyOpen: boolean;
  filtersOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  sheetTab: "scripture" | "history" | "geography" | "tradition";
  setTestament: (filter: TestamentFilter) => void;
  setTime: (year: number) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setZoom: (zoom: number) => void;
  selectEvent: (id?: string) => void;
  selectStoryline: (id?: string) => void;
  selectCharacter: (id?: string) => void;
  selectLocation: (id?: string) => void;
  setSearchOpen: (value: boolean) => void;
  setStudyOpen: (value: boolean) => void;
  setFiltersOpen: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  setSearchMode: (value: SearchMode) => void;
  setSheetTab: (value: BibleState["sheetTab"]) => void;
  toggleRegions: () => void;
}

export const useBibleStore = create<BibleState>((set) => ({
  testamentFilter: "ALL",
  activeTime: -900,
  timeWindow: { start: -2200, end: 100 },
  timelineZoom: 1,
  historicalRegionsEnabled: false,
  searchOpen: false,
  studyOpen: false,
  filtersOpen: false,
  searchQuery: "",
  searchMode: "all",
  sheetTab: "scripture",
  setTestament: (testamentFilter) => set({ testamentFilter }),
  setTime: (activeTime) => set({ activeTime }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setZoom: (timelineZoom) => set({ timelineZoom }),
  selectEvent: (activeEventId) => set({ activeEventId, sheetTab: "scripture" }),
  selectStoryline: (activeStorylineId) => set({ activeStorylineId, activeCharacterId: undefined, activeLocationId: undefined, activeEventId: undefined }),
  selectCharacter: (activeCharacterId) => set({ activeCharacterId, activeStorylineId: undefined, activeLocationId: undefined, activeEventId: undefined }),
  selectLocation: (activeLocationId) => set({ activeLocationId, activeStorylineId: undefined, activeCharacterId: undefined, activeEventId: undefined }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setStudyOpen: (studyOpen) => set({ studyOpen }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode: (searchMode) => set({ searchMode }),
  setSheetTab: (sheetTab) => set({ sheetTab }),
  toggleRegions: () => set((state) => ({ historicalRegionsEnabled: !state.historicalRegionsEnabled })),
}));
