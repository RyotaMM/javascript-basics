import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/** 要件にある初期ステータス (色・表示順付き) */
const DEFAULT_STATUSES = [
  { name: '未訪問', color: '#9e9e9e', order: 10 },
  { name: '再訪問', color: '#2196f3', order: 20 },
  { name: '設置済み', color: '#4caf50', order: 30 },
  { name: 'お断り', color: '#ff9800', order: 40 },
  { name: 'NG', color: '#f44336', order: 50 },
];

/** 初期ステータスを一括作成 (管理者のみ。Rulesでadmin判定) */
export async function seedDefaultStatuses(): Promise<number> {
  const batch = writeBatch(db);
  for (const s of DEFAULT_STATUSES) {
    const ref = doc(collection(db, 'statuses'));
    batch.set(ref, { ...s, createdAt: serverTimestamp() });
  }
  await batch.commit();
  return DEFAULT_STATUSES.length;
}
