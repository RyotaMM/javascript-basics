import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { subscribeVisitHistory } from '../services/storeService';
import type { Store, VisitHistory } from '../types';

/**
 * 単一店舗ドキュメントと訪問履歴を購読。
 * pendingWrites = ローカルの編集がまだサーバーに送られていない (=本当の同期待ち)。
 * includeMetadataChanges でキャッシュ→サーバー反映や送信完了も受け取る。
 */
export function useStoreDoc(storeId: string | null) {
  const [store, setStore] = useState<Store | null>(null);
  const [history, setHistory] = useState<VisitHistory[]>([]);
  const [pendingWrites, setPendingWrites] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setHistory([]);
      setPendingWrites(false);
      return;
    }
    const unsubStore = onSnapshot(
      doc(db, 'stores', storeId),
      { includeMetadataChanges: true },
      (snap) => {
        setStore(snap.exists() ? ({ id: snap.id, ...snap.data() } as Store) : null);
        setPendingWrites(snap.metadata.hasPendingWrites);
      },
    );
    const unsubHistory = subscribeVisitHistory(storeId, setHistory);
    return () => {
      unsubStore();
      unsubHistory();
    };
  }, [storeId]);

  return { store, history, pendingWrites };
}
