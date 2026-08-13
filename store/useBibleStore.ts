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
  activeBookId?: string;
  timelineZoom: number;
  timelineFocused: boolean;
  historicalRegionsEnabled: boolean;
  biblicalRiversEnabled: boolean;
  searchOpen: boolean;
  studyOpen: boolean;
  filtersOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  sheetTab: "scripture" | "history" | "geography" | "tradition";
  bookmarkIds: string[];
  storyPlaying: boolean;
  storySpeed: 0.5 | 1 | 2;
  setTestament: (filter: TestamentFilter) => void;
  setTime: (year: number) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setZoom: (zoom: number) => void;
  selectEvent: (id?: string) => void;
  selectStoryline: (id?: string) => void;
  selectCharacter: (id?: string) => void;
  selectLocation: (id?: string) => void;
  selectBook: (id?: string) => void;
  setSearchOpen: (value: boolean) => void;
  setStudyOpen: (value: boolean) => void;
  setFiltersOpen: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  setSearchMode: (value: SearchMode) => void;
  setSheetTab: (value: BibleState["sheetTab"]) => void;
  setBookmarks: (ids: string[]) => void;
  toggleBookmark: (id: string) => void;
  setStoryPlaying: (value: boolean) => void;
  setStorySpeed: (value: BibleState["storySpeed"]) => void;
  toggleRegions: () => void;
  toggleRivers: () => void;
}

export const useBibleStore = create<BibleState>((set) => ({
  testamentFilter: "ALL",
  activeTime: -900,
  timeWindow: { start: -2200, end: 100 },
  timelineZoom: 1,
  timelineFocused: false,
  historicalRegionsEnabled: false,
  biblicalRiversEnabled: true,
  searchOpen: false,
  studyOpen: false,
  filtersOpen: false,
  searchQuery: "",
  searchMode: "all",
  sheetTab: "scripture",
  bookmarkIds: [],
  storyPlaying: false,
  storySpeed: 1,
  setTestament: (testamentFilter) => set({ testamentFilter }),
  setTime: (activeTime) => set({ activeTime, timelineFocused: true }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setZoom: (timelineZoom) => set({ timelineZoom }),
  selectEvent: (activeEventId) => set({ activeEventId, sheetTab: "scripture" }),
  selectStoryline: (activeStorylineId) => set({ activeStorylineId, activeCharacterId: undefined, activeLocationId: undefined, activeBookId: undefined, activeEventId: undefined, timelineFocused: false, storyPlaying: false }),
  selectCharacter: (activeCharacterId) => set({ activeCharacterId, activeStorylineId: undefined, activeLocationId: undefined, activeBookId: undefined, activeEventId: undefined, timelineFocused: false, storyPlaying: false }),
  selectLocation: (activeLocationId) => set({ activeLocationId, activeStorylineId: undefined, activeCharacterId: undefined, activeBookId: undefined, activeEventId: undefined, timelineFocused: false, storyPlaying: false }),
  selectBook: (activeBookId) => set({ activeBookId, activeLocationId: undefined, activeStorylineId: undefined, activeCharacterId: undefined, activeEventId: undefined, timelineFocused: false, storyPlaying: false }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setStudyOpen: (studyOpen) => set({ studyOpen }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode: (searchMode) => set({ searchMode }),
  setSheetTab: (sheetTab) => set({ sheetTab }),
  setBookmarks: (bookmarkIds) => set({ bookmarkIds }),
  toggleBookmark: (id) => set((state) => ({ bookmarkIds: state.bookmarkIds.includes(id) ? state.bookmarkIds.filter((item) => item !== id) : [...state.bookmarkIds, id] })),
  setStoryPlaying: (storyPlaying) => set({ storyPlaying }),
  setStorySpeed: (storySpeed) => set({ storySpeed }),
  toggleRegions: () => set((state) => ({ historicalRegionsEnabled: !state.historicalRegionsEnabled })),
  toggleRivers: () => set((state) => ({ biblicalRiversEnabled: !state.biblicalRiversEnabled })),
}));
