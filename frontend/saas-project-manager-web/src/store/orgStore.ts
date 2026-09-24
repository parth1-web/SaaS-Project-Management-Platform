import { create } from 'zustand';

interface OrgState {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  selectedOrgId: localStorage.getItem('sm-org-id'),
  setSelectedOrgId: (id) => {
    if (id) localStorage.setItem('sm-org-id', id);
    else localStorage.removeItem('sm-org-id');
    set({ selectedOrgId: id });
  },
}));
