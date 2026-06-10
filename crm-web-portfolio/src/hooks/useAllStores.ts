import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Store } from '../types';

/** ダッシュボード集計用の取得上限 (読み取り課金の暴走を防ぐ上限)。 */
export const DASHBOARD_QUERY_LIMIT = 5000;

/**
 * 店舗の購読 (ダッシュボード集計用・admin限定)。
 * 集計のため多めに読むが、上限を設けて最悪ケースの読み取り課金を抑える。
 */
export function useAllStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, 'stores'), limit(DASHBOARD_QUERY_LIMIT));
    return onSnapshot(q, (snap) => {
      setStores(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Store));
      setLoading(false);
    });
  }, []);
  const capped = stores.length >= DASHBOARD_QUERY_LIMIT;
  return { stores, loading, capped };
}
