import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Store, VisitHistory } from '../types';

/** マップ購読の取得上限。これを超えるとフィルタで絞るよう促す(読み取り課金・描画負荷の抑制)。 */
export const STORE_QUERY_LIMIT = 2000;
/** Firestore の 'in' 句に渡せる値の上限。これを超える場合はサーバ絞り込みせずクライアントで処理。 */
export const IN_QUERY_LIMIT = 30;

/**
 * stores のリアルタイム購読。
 * areaIds(子孫展開済み)が 1〜30 件ならサーバ側で 'in' 絞り込み。
 * それ以外の条件(ステータス/ジャンル/営業時間)はクライアント側で適用する。
 */
export function subscribeStores(
  areaIds: string[],
  callback: (stores: Store[]) => void,
): () => void {
  const constraints: QueryConstraint[] = [];
  if (areaIds.length > 0 && areaIds.length <= IN_QUERY_LIMIT) {
    constraints.push(where('areaId', 'in', areaIds));
  }
  constraints.push(limit(STORE_QUERY_LIMIT));

  const q = query(collection(db, 'stores'), ...constraints);
  return onSnapshot(q, (snap) => {
    const stores = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Store);
    callback(stores);
  });
}

/** UIからの新規店舗追加(admin)。座標未指定なら geocodeStatus='pending'(未配置→手動配置/後でジオコーディング)。 */
export async function createStore(input: {
  name: string;
  address: string;
  genre: string;
  businessHours: string;
  areaId: string | null;
  statusId: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<string> {
  const hasCoords = input.lat != null && input.lng != null;
  const ref = doc(collection(db, 'stores'));
  const batch = writeBatch(db);
  batch.set(ref, {
    externalCode: null,
    name: input.name,
    address: input.address,
    genre: input.genre,
    businessHours: input.businessHours,
    areaId: input.areaId,
    statusId: input.statusId,
    lat: input.lat,
    lng: input.lng,
    geocodeStatus: hasCoords ? 'ok' : 'pending',
    lastVisitMemo: '',
    lastVisitUserId: null,
    lastVisitAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return ref.id;
}

/** 店舗の位置(緯度経度)を手動で設定。ジオコーディング失敗/未設定店舗の配置・補正に使う(admin)。 */
export async function updateStoreLocation(
  storeId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'stores', storeId), {
    lat,
    lng,
    geocodeStatus: 'ok',
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** 店舗の訪問履歴を新しい順に購読 */
export function subscribeVisitHistory(
  storeId: string,
  callback: (history: VisitHistory[]) => void,
): () => void {
  const q = query(
    collection(db, 'visitHistories'),
    where('storeId', '==', storeId),
    orderBy('visitedAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    const history = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VisitHistory);
    callback(history);
  });
}

/**
 * ステータス更新 + 訪問履歴記録をトランザクションで実行。
 * stores を更新し、同時に visitHistories へ prevStatusId 付きで記録する。
 */
export async function updateStoreStatus(params: {
  storeId: string;
  prevStatusId: string | null;
  newStatusId: string;
  memo: string;
  userId: string;
}): Promise<void> {
  const { storeId, prevStatusId, newStatusId, memo, userId } = params;
  const storeRef = doc(db, 'stores', storeId);
  const historyRef = doc(collection(db, 'visitHistories'));

  // writeBatch はオフラインでもローカルにキューされ、復帰時に自動同期される
  // (runTransaction はサーバー接続必須で圏外では失敗するため使わない)。
  // 変更前ステータスは購読済みの店舗データから渡す。
  const batch = writeBatch(db);
  batch.update(storeRef, {
    statusId: newStatusId,
    lastVisitMemo: memo,
    lastVisitUserId: userId,
    lastVisitAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(historyRef, {
    storeId,
    userId,
    prevStatusId: prevStatusId ?? null,
    statusId: newStatusId,
    memo,
    visitedAt: serverTimestamp(),
  });
  await batch.commit();
}
