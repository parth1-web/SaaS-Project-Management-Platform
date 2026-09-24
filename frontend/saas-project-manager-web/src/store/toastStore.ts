import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'danger' | 'info';
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, variant?: ToastItem['variant']) => void;
  dismiss: (id: number) => void;
}

let seq = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'success') => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
