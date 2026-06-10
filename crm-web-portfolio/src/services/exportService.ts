import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Store, Status, Area, AppUser } from '../types';

function tsToString(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** CSVの1セルをエスケープ (カンマ・改行・引用符を含む場合) */
function cell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * 全店舗を最新ステータス・メモ・最終訪問情報込みでCSV出力しダウンロード。
 * UTF-8 BOM付きでExcelの文字化けを防ぐ。
 */
export async function exportStoresCsv(): Promise<number> {
  const [storeSnap, statusSnap, areaSnap, userSnap] = await Promise.all([
    getDocs(collection(db, 'stores')),
    getDocs(collection(db, 'statuses')),
    getDocs(collection(db, 'areas')),
    getDocs(collection(db, 'users')),
  ]);

  const statuses = new Map<string, Status>();
  statusSnap.forEach((d) => statuses.set(d.id, { id: d.id, ...d.data() } as Status));
  const areas = new Map<string, Area>();
  areaSnap.forEach((d) => areas.set(d.id, { id: d.id, ...d.data() } as Area));
  const users = new Map<string, AppUser>();
  userSnap.forEach((d) => users.set(d.id, { id: d.id, ...d.data() } as AppUser));

  const header = [
    '店舗コード', '店舗名', '住所', '店舗ジャンル', '営業時間',
    '小エリア', '現在の最新ステータス', '最新の訪問メモ',
    '最終訪問担当者', '最終訪問日時', '緯度', '経度',
  ];

  const lines = [header.map(cell).join(',')];
  storeSnap.forEach((d) => {
    const s = { id: d.id, ...d.data() } as Store;
    const row = [
      s.externalCode ?? '',
      s.name,
      s.address,
      s.genre,
      s.businessHours,
      s.areaId ? areas.get(s.areaId)?.name ?? '' : '',
      s.statusId ? statuses.get(s.statusId)?.name ?? '' : '',
      s.lastVisitMemo,
      s.lastVisitUserId ? users.get(s.lastVisitUserId)?.name ?? '' : '',
      tsToString(s.lastVisitAt),
      s.lat ?? '',
      s.lng ?? '',
    ];
    lines.push(row.map(cell).join(','));
  });

  const csv = '﻿' + lines.join('\r\n'); // BOM + CRLF
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `stores_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return storeSnap.size;
}
