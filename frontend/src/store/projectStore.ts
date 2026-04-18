import { create } from 'zustand';

interface Project {
  id: string;
  title: string;
  status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  schema_data: any;
}

interface ProjectState {
  currentProject: Project | null;
  activeWorkers: number;
  maxWorkers: number;
  setCurrentProject: (project: Project) => void;
  updateStatus: (status: Project['status']) => void;
  setSchema: (schema: any) => void;
  incrementWorkers: () => boolean;
  decrementWorkers: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  activeWorkers: 0,
  maxWorkers: 5, // Safety limit requested by user

  setCurrentProject: (project) => set({ currentProject: project }),
  updateStatus: (status) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, status } : null
  })),
  setSchema: (schema) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, schema_data: schema } : null
  })),
  
  incrementWorkers: () => {
    const { activeWorkers, maxWorkers } = get();
    if (activeWorkers >= maxWorkers) {
      console.warn('Max AI workers limit reached (5). Spawning blocked.');
      return false;
    }
    set({ activeWorkers: activeWorkers + 1 });
    console.log(`[AI Worker] Process spawned. Active: ${activeWorkers + 1}`);
    return true;
  },
  
  decrementWorkers: () => set((state) => ({ 
    activeWorkers: Math.max(0, state.activeWorkers - 1) 
  })),
}));

