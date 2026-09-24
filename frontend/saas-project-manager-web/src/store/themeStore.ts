import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setMode: (m: ThemeMode) => void;
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  let resolved: 'light' | 'dark' = 'light';
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    resolved = mode;
  }
  root.setAttribute('data-bs-theme', resolved);
  localStorage.setItem('sm-theme', mode);
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('sm-theme') as ThemeMode) || 'light',
  sidebarCollapsed: false,
  mobileNavOpen: false,
  setMode: (mode) => {
    applyTheme(mode);
    set({ mode });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNav: (open) => set({ mobileNavOpen: open }),
}));

export function initTheme() {
  const saved = (localStorage.getItem('sm-theme') as ThemeMode) || 'light';
  applyTheme(saved);
}

export type { ThemeMode };
