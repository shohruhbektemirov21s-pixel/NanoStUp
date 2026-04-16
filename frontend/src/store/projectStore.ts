import { create } from 'zustand';

interface Project {
  id: string;
  title: string;
  status: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  schema_data: any;
}

interface ProjectState {
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  updateStatus: (status: Project['status']) => void;
  setSchema: (schema: any) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  updateStatus: (status) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, status } : null
  })),
  setSchema: (schema) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, schema_data: schema } : null
  })),
}));
