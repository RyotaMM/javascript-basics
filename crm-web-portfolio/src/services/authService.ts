import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AppUser } from '../types';

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('ログインしていません');
  await updatePassword(auth.currentUser, newPassword);
}

/** Firestore の users/{uid} からアプリ内プロフィール(ロール等)を取得 */
export async function fetchAppUser(fbUser: FirebaseUser): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', fbUser.uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: fbUser.uid,
    email: data.email ?? fbUser.email ?? '',
    name: data.name ?? '',
    role: data.role === 'admin' ? 'admin' : 'staff',
    // boolean の true のみ「無効」とみなす (文字列 "false" を真偽値と誤認しない)
    disabled: data.disabled === true,
    assignedAreaIds: Array.isArray(data.assignedAreaIds) ? data.assignedAreaIds : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
