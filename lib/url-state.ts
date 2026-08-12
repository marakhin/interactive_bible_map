import type { BibleStateSnapshot } from "./url-types";

export function readUrlState(): Partial<BibleStateSnapshot> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    activeEventId: params.get("event") ?? undefined,
    activeStorylineId: params.get("story") ?? undefined,
    activeCharacterId: params.get("person") ?? undefined,
    activeLocationId: params.get("place") ?? undefined,
    testamentFilter: (params.get("testament") as BibleStateSnapshot["testamentFilter"]) ?? undefined,
  };
}

export function writeUrlState(state: BibleStateSnapshot) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (state.activeEventId) params.set("event", state.activeEventId);
  if (state.activeStorylineId) params.set("story", state.activeStorylineId);
  if (state.activeCharacterId) params.set("person", state.activeCharacterId);
  if (state.activeLocationId) params.set("place", state.activeLocationId);
  if (state.testamentFilter !== "ALL") params.set("testament", state.testamentFilter);
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
