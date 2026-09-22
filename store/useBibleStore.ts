"use client";

import { create } from "zustand";
import type { TestamentFilter } from "@/domain/types";
import type { TimeRange } from "@/domain/timeline";
import { biblicalRegions } from "@/data/biblical-regions";
import { bibleBookById } from "@/data/books";
import { storylineById } from "@/data/storylines";

type SearchMode = "all" | "events" | "people" | "places" | "stories";

interface BibleState {
  testamentFilter: TestamentFilter;
  timeRange: TimeRange;
  timeWindow: TimeRange;
  activeEventId?: string;
  activeStorylineId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
  activeBookId?: string;
  timelineZoom: number;
  timelineFocused: boolean;
  allPointsEnabled: boolean;
  historicalRegionsEnabled: boolean;
  selectedHistoricalRegionIds: string[];
  biblicalRiversEnabled: boolean;
  routesEnabled: boolean;
  searchOpen: boolean;
  studyOpen: boolean;
  filtersOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  eventSheetOpen: boolean;
  sheetTab: "scripture" | "history" | "geography";
  bookmarkIds: string[];
  storyPlaying: boolean;
  storySpeed: 0.5 | 1 | 2;
  setTestament: (filter: TestamentFilter) => void;
  setTimeRange: (range: TimeRange) => void;
  setTimeWindow: (window: TimeRange) => void;
  setZoom: (zoom: number) => void;
  fitTimeline: (window: TimeRange, zoom: number, range: TimeRange) => void;
  selectEvent: (id?: string) => void;
  focusEvent: (id?: string) => void;
  selectStoryline: (id?: string) => void;
  selectCharacter: (id?: string) => void;
  selectLocation: (id?: string) => void;
  selectBook: (id?: string) => void;
  setSearchOpen: (value: boolean) => void;
  setStudyOpen: (value: boolean) => void;
  setFiltersOpen: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  setSearchMode: (value: SearchMode) => void;
  closeEventSheet: () => void;
  setSheetTab: (value: BibleState["sheetTab"]) => void;
  setBookmarks: (ids: string[]) => void;
  toggleBookmark: (id: string) => void;
  setStoryPlaying: (value: boolean) => void;
  setStorySpeed: (value: BibleState["storySpeed"]) => void;
  showAllPoints: () => void;
  toggleRegions: () => void;
  toggleHistoricalRegion: (id: string) => void;
  selectAllHistoricalRegions: () => void;
  clearHistoricalRegions: () => void;
  toggleRivers: () => void;
  toggleRoutes: () => void;
}

export const useBibleStore = create<BibleState>((set) => ({
  testamentFilter: "ALL",
  timeRange: { start: -2200, end: 100 },
  timeWindow: { start: -2200, end: 100 },
  timelineZoom: 1,
  timelineFocused: false,
  allPointsEnabled: false,
  historicalRegionsEnabled: false,
  selectedHistoricalRegionIds: biblicalRegions.map((region) => region.id),
  biblicalRiversEnabled: true,
  routesEnabled: true,
  searchOpen: false,
  studyOpen: false,
  filtersOpen: false,
  searchQuery: "",
  searchMode: "all",
  eventSheetOpen: false,
  sheetTab: "scripture",
  bookmarkIds: [],
  storyPlaying: false,
  storySpeed: 1,
  setTestament: (testamentFilter) => set({ testamentFilter, allPointsEnabled: false }),
  setTimeRange: (timeRange) => set({
    timeRange,
    timelineFocused: true,
    activeStorylineId: undefined,
    activeCharacterId: undefined,
    activeLocationId: undefined,
    activeBookId: undefined,
    activeEventId: undefined,
    eventSheetOpen: false,
    allPointsEnabled: false,
    storyPlaying: false,
  }),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setZoom: (timelineZoom) => set({ timelineZoom }),
  fitTimeline: (timeWindow, timelineZoom, timeRange) => set({ timeWindow, timelineZoom, timeRange, timelineFocused: false }),
  selectEvent: (activeEventId) => set({ activeEventId, eventSheetOpen: Boolean(activeEventId), sheetTab: "scripture" }),
  focusEvent: (activeEventId) => set({ activeEventId, eventSheetOpen: false }),
  selectStoryline: (activeStorylineId) => set((state) => ({ activeStorylineId, activeCharacterId: undefined, activeLocationId: undefined, activeBookId: undefined, activeEventId: undefined, eventSheetOpen: false, timelineFocused: false, allPointsEnabled: false, storyPlaying: false, testamentFilter: activeStorylineId && state.testamentFilter !== "ALL" && storylineById.get(activeStorylineId)?.testament !== state.testamentFilter ? "ALL" : state.testamentFilter })),
  selectCharacter: (activeCharacterId) => set({ activeCharacterId, activeStorylineId: undefined, activeLocationId: undefined, activeBookId: undefined, activeEventId: undefined, eventSheetOpen: false, timelineFocused: false, allPointsEnabled: false, storyPlaying: false }),
  selectLocation: (activeLocationId) => set({ activeLocationId, activeStorylineId: undefined, activeCharacterId: undefined, activeBookId: undefined, activeEventId: undefined, eventSheetOpen: false, timelineFocused: false, allPointsEnabled: false, storyPlaying: false }),
  selectBook: (activeBookId) => set((state) => ({ activeBookId, activeLocationId: undefined, activeStorylineId: undefined, activeCharacterId: undefined, activeEventId: undefined, eventSheetOpen: false, timelineFocused: false, allPointsEnabled: false, storyPlaying: false, testamentFilter: activeBookId && state.testamentFilter !== "ALL" && bibleBookById.get(activeBookId)?.testament !== state.testamentFilter ? "ALL" : state.testamentFilter })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setStudyOpen: (studyOpen) => set({ studyOpen, ...(studyOpen ? { filtersOpen: false } : {}) }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode: (searchMode) => set({ searchMode }),
  closeEventSheet: () => set({ eventSheetOpen: false }),
  setSheetTab: (sheetTab) => set({ sheetTab }),
  setBookmarks: (bookmarkIds) => set({ bookmarkIds }),
  toggleBookmark: (id) => set((state) => ({ bookmarkIds: state.bookmarkIds.includes(id) ? state.bookmarkIds.filter((item) => item !== id) : [...state.bookmarkIds, id] })),
  setStoryPlaying: (storyPlaying) => set({ storyPlaying }),
  setStorySpeed: (storySpeed) => set({ storySpeed }),
  showAllPoints: () => set({ testamentFilter: "ALL", activeStorylineId: undefined, activeCharacterId: undefined, activeLocationId: undefined, activeBookId: undefined, activeEventId: undefined, eventSheetOpen: false, timelineFocused: false, allPointsEnabled: true, storyPlaying: false }),
  toggleRegions: () => set((state) => ({ historicalRegionsEnabled: !state.historicalRegionsEnabled })),
  toggleHistoricalRegion: (id) => set((state) => ({
    selectedHistoricalRegionIds: state.selectedHistoricalRegionIds.includes(id)
      ? state.selectedHistoricalRegionIds.filter((regionId) => regionId !== id)
      : [...state.selectedHistoricalRegionIds, id],
  })),
  selectAllHistoricalRegions: () => set({ selectedHistoricalRegionIds: biblicalRegions.map((region) => region.id) }),
  clearHistoricalRegions: () => set({ selectedHistoricalRegionIds: [] }),
  toggleRivers: () => set((state) => ({ biblicalRiversEnabled: !state.biblicalRiversEnabled })),
  toggleRoutes: () => set((state) => ({ routesEnabled: !state.routesEnabled })),
}));
