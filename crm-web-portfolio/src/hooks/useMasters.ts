import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Area, Status } from '../types';

/** エリアマスタ全件購読 (件数が少ないため全件でよい) */
export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('level'));
    return onSnapshot(q, (snap) => {
      setAreas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Area));
    });
  }, []);
  return areas;
}

/** ステータスマスタ全件購読 (表示順) */
export function useStatuses() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'statuses'), orderBy('order'));
    return onSnapshot(q, (snap) => {
      setStatuses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Status));
    });
  }, []);
  return statuses;
}
