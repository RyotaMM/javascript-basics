import { create } from 'zustand';

interface LatLng {
  lat: number;
  lng: number;
}

interface UiState {
  /** 詳細パネルに表示中の店舗ID (null=非表示) */
  selectedStoreId: string | null;
  selectStore: (id: string | null) => void;
  /** 現在地ボタン押下のたびに増える。マップ側が監視して現在地へ移動。 */
  locateNonce: number;
  requestLocate: () => void;
  /** 取得済みの現在地 (現在地マーカー表示用) */
  userPos: LatLng | null;
  setUserPos: (pos: LatLng | null) => void;
  /** 現在の地図中心 (位置未設定店舗の配置先に使用) */
  mapCenter: LatLng | null;
  setMapCenter: (pos: LatLng) => void;
  /** ピンで店舗追加モード (地図タップで位置指定) */
  addPinMode: boolean;
  setAddPinMode: (v: boolean) => void;
  /** タップで指定された新規店舗の位置 (フォームに引き渡す) */
  pendingNewPos: LatLng | null;
  setPendingNewPos: (pos: LatLng | null) => void;
  /** ドラッグ移動の確定待ち (確定するまで保存しない)。null=なし */
  pendingMove: { storeId: string; lat: number; lng: number } | null;
  setPendingMove: (m: { storeId: string; lat: number; lng: number } | null) => void;
  /** 「元に戻す」でマーカーを保存位置へ再描画するためのnonce */
  moveRevertNonce: number;
  revertMove: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedStoreId: null,
  selectStore: (id) => set({ selectedStoreId: id }),
  locateNonce: 0,
  requestLocate: () => set((s) => ({ locateNonce: s.locateNonce + 1 })),
  userPos: null,
  setUserPos: (pos) => set({ userPos: pos }),
  mapCenter: null,
  setMapCenter: (pos) => set({ mapCenter: pos }),
  addPinMode: false,
  setAddPinMode: (v) => set({ addPinMode: v }),
  pendingNewPos: null,
  setPendingNewPos: (pos) => set({ pendingNewPos: pos }),
  pendingMove: null,
  setPendingMove: (m) => set({ pendingMove: m }),
  moveRevertNonce: 0,
  revertMove: () =>
    set((s) => ({ pendingMove: null, moveRevertNonce: s.moveRevertNonce + 1 })),
}));
