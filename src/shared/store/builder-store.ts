import { create } from 'zustand';
import { WebsiteSchema } from '../../lib/schema/website';

interface BuilderState {
  prompt: string;
  isGenerating: boolean;
  schema: WebsiteSchema | null;
  activePageSlug: string;
  setPrompt: (prompt: string) => void;
  setGenerating: (status: boolean) => void;
  setSchema: (schema: WebsiteSchema | null) => void;
  setActivePage: (slug: string) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  prompt: '',
  isGenerating: false,
  schema: null,
  activePageSlug: '',
  setPrompt: (prompt) => set({ prompt }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setSchema: (schema) => set({ schema }),
  setActivePage: (activePageSlug) => set({ activePageSlug }),
}));
