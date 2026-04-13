import { create } from "zustand";

import type { BuilderState, BuilderStatus, BuilderStore } from "../types/builder.types";

const initialState: BuilderState = {
  businessDescription: "",
  status: "idle",
  lastError: null,
};

export const useBuilderStore = create<BuilderStore>((set) => ({
  ...initialState,
  setBusinessDescription: (value) => set({ businessDescription: value }),
  setStatus: (status: BuilderStatus) => set({ status }),
  setLastError: (message) => set({ lastError: message }),
  reset: () => set(initialState),
}));
