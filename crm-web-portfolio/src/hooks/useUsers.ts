import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AppUser } from '../types';

/** ユーザー一覧の購読 (admin専用画面で使用)。件数が少ないため全件でよい。 */
export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser));
    });
  }, []);
  return users;
}
