import { create } from 'zustand';

export interface TerminalTab {
  id: string;
  title: string;
  command: string;
  status: 'idle' | 'running' | 'done' | 'error';
  output: string[];
  createdAt: Date;
  exitCode?: number;
}

interface TerminalStore {
  tabs: TerminalTab[];
  activeTabId: string | null;
  isExpanded: boolean;
  terminalHeight: number;

  // Actions
  addTab: (command: string, title?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  appendOutput: (id: string, line: string) => void;
  setStatus: (id: string, status: TerminalTab['status'], exitCode?: number) => void;
  clearOutput: (id: string) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  setTerminalHeight: (height: number) => void;
}

let tabCounter = 0;

export const useTerminalStore = create<TerminalStore>((set) => ({
  tabs: [],
  activeTabId: null,
  isExpanded: true,
  terminalHeight: 280,

  addTab: (command: string, title?: string) => {
    const id = `terminal-${Date.now()}-${++tabCounter}`;
    const tab: TerminalTab = {
      id,
      title: title || `终端 ${id.split('-')[1]?.slice(-4) || 'new'}`,
      command,
      status: 'idle',
      output: [],
      createdAt: new Date(),
    };

    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
      isExpanded: true,
    }));

    return id;
  },

  removeTab: (id: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (newTabs.length > 0) {
          newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
        } else {
          newActiveId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  appendOutput: (id: string, line: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, output: [...t.output, line] } : t
      ),
    }));
  },

  setStatus: (id: string, status: TerminalTab['status'], exitCode?: number) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, status, exitCode } : t
      ),
    }));
  },

  clearOutput: (id: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, output: [] } : t
      ),
    }));
  },

  toggleExpanded: () => {
    set((state) => ({ isExpanded: !state.isExpanded }));
  },

  setExpanded: (expanded: boolean) => {
    set({ isExpanded: expanded });
  },

  setTerminalHeight: (height: number) => {
    set({ terminalHeight: Math.max(120, Math.min(height, 600)) });
  },
}));
