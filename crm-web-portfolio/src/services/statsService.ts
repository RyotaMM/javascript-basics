import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 担当者ごとの訪問(ステータス更新)回数を訪問履歴から集計。
 * getCountFromServer を使うため履歴ドキュメントを読み込まず、件数だけ取得=低コスト。
 * 「最終更新者」ベースではなく、累計の訪問アクション数を正確に数える。
 */
export async function countVisitsByUser(
  userIds: string[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    userIds.map(async (uid) => {
      const snap = await getCountFromServer(
        query(collection(db, 'visitHistories'), where('userId', '==', uid)),
      );
      return [uid, snap.data().count] as const;
    }),
  );
  return Object.fromEntries(entries);
}
