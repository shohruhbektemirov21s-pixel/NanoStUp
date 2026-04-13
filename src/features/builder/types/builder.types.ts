export type BuilderStatus = "idle" | "generating" | "ready" | "error";

export type BuilderState = {
  businessDescription: string;
  status: BuilderStatus;
  lastError: string | null;
};

export type BuilderActions = {
  setBusinessDescription: (value: string) => void;
  setStatus: (status: BuilderStatus) => void;
  setLastError: (message: string | null) => void;
  reset: () => void;
};

export type BuilderStore = BuilderState & BuilderActions;
