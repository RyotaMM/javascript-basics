import { create } from 'zustand';
import type { StoreFilter } from '../types';

const emptyFilter: StoreFilter = {
  areaIds: [],
  statusIds: [],
  genres: [],
  businessHoursKeyword: '',
  onlyUnvisited: false,
};

interface FilterState {
  filter: StoreFilter;
  setFilter: (patch: Partial<StoreFilter>) => void;
  resetFilter: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filter: emptyFilter,
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  resetFilter: () => set({ filter: { ...emptyFilter } }),
}));
