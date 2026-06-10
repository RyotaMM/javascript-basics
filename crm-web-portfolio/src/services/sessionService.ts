import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const KEY = 'crm_device_session_id';

/**
 * この端末（ブラウザ）の固定セッションID。localStorageに保持するため、
 * 同一端末の複数タブでは同じIDになり、お互いを追い出さない。
 * 別の端末でログインすると別IDになり、後勝ちで前の端末が無効化される。
 */
export function getDeviceSessionId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** このセッションをアクティブにする（＝他端末のセッションを後勝ちで無効化） */
export async function claimSession(uid: string, sessionId: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { activeSessionId: sessionId, sessionUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * アクティブセッションが自分のID以外に変わったら onTakeover を呼ぶ。
 * （別端末で同じアカウントがログインした合図）
 */
export function watchSession(
  uid: string,
  sessionId: string,
  onTakeover: () => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    const active = snap.data()?.activeSessionId as string | undefined;
    if (active && active !== sessionId) onTakeover();
  });
}
