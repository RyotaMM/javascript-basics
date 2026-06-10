import Papa from 'papaparse';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeName } from '../utils/text';
import type { AreaLevel } from '../types';

/** CSVの想定列 (ヘッダー日本語) */
export interface StoreCsvRow {
  externalCode?: string;
  name: string;
  address: string;
  genre: string;
  businessHours: string;
  areaLarge: string;
  areaMedium: string;
  areaSmall: string;
  initialStatus: string;
  memo: string;
  /** CSVに緯度経度があれば使用 (無ければ null → サーバー側でジオコーディング) */
  lat: number | null;
  lng: number | null;
}

/** 緯度・経度のヘッダー候補 (HEADER_MAP は文字列項目用なので別管理) */
const LAT_HEADERS = ['緯度', 'lat', 'latitude'];
const LNG_HEADERS = ['経度', 'lng', 'lon', 'longitude'];

export interface ParseResult {
  rows: StoreCsvRow[];
  errors: string[];
}

/** HEADER_MAP は文字列項目のみ対象 (lat/lng は別処理) */
type StringField =
  | 'externalCode'
  | 'name'
  | 'address'
  | 'genre'
  | 'businessHours'
  | 'areaLarge'
  | 'areaMedium'
  | 'areaSmall'
  | 'initialStatus'
  | 'memo';

const HEADER_MAP: Record<string, StringField> = {
  店舗コード: 'externalCode',
  店舗名: 'name',
  住所: 'address',
  ジャンル: 'genre',
  店舗ジャンル: 'genre',
  営業時間: 'businessHours',
  大エリア: 'areaLarge',
  中エリア: 'areaMedium',
  小エリア: 'areaSmall',
  初期ステータス: 'initialStatus',
  ステータス: 'initialStatus',
  現在のステータス: 'initialStatus',
  現在の最新ステータス: 'initialStatus',
  最新の訪問メモ: 'memo',
  訪問メモ: 'memo',
  メモ: 'memo',
};

/** UTF-8 で読めない場合は Shift-JIS にフォールバックしてデコード */
async function decodeFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  // 文字化け(置換文字)が多い場合は Shift-JIS とみなす
  const replacementCount = (utf8.match(/�/g) ?? []).length;
  if (replacementCount > 0) {
    try {
      return new TextDecoder('shift_jis').decode(buf);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

export async function parseStoreCsv(file: File): Promise<ParseResult> {
  const text = await decodeFile(file);
  const errors: string[] = [];
  const rows: StoreCsvRow[] = [];

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  parsed.data.forEach((raw, i) => {
    const lineNo = i + 2; // ヘッダー分 +1, 1始まり +1
    const row: Partial<StoreCsvRow> = {};
    let lat: number | null = null;
    let lng: number | null = null;
    for (const [header, value] of Object.entries(raw)) {
      const h = header.trim();
      const key = HEADER_MAP[h];
      if (key) {
        row[key] = (value ?? '').trim();
        continue;
      }
      const lower = h.toLowerCase();
      const v = parseFloat((value ?? '').trim());
      if (LAT_HEADERS.includes(h) || LAT_HEADERS.includes(lower)) {
        lat = Number.isFinite(v) ? v : null;
      } else if (LNG_HEADERS.includes(h) || LNG_HEADERS.includes(lower)) {
        lng = Number.isFinite(v) ? v : null;
      }
    }
    if (!row.name) {
      errors.push(`${lineNo}行目: 店舗名が空です`);
      return;
    }
    if (!row.address) {
      errors.push(`${lineNo}行目: 住所が空です`);
      return;
    }
    rows.push({
      externalCode: row.externalCode || undefined,
      name: row.name,
      address: row.address,
      genre: row.genre ?? '',
      businessHours: row.businessHours ?? '',
      areaLarge: normalizeName(row.areaLarge ?? ''),
      areaMedium: normalizeName(row.areaMedium ?? ''),
      areaSmall: normalizeName(row.areaSmall ?? ''),
      initialStatus: normalizeName(row.initialStatus ?? ''),
      memo: row.memo ?? '',
      lat,
      lng,
    });
  });

  return { rows, errors };
}

/** エリア名→IDを解決。無ければ作成して返す。階層(大中小)を親子で繋ぐ。 */
async function resolveAreaId(
  name: string,
  level: AreaLevel,
  parentAreaId: string | null,
  cache: Map<string, string>,
): Promise<string | null> {
  if (!name) return parentAreaId; // 当該レベルが空なら親をそのまま使う
  name = normalizeName(name);
  const cacheKey = `${level}:${name}:${parentAreaId ?? ''}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const q = query(
    collection(db, 'areas'),
    where('name', '==', name),
    where('level', '==', level),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const id = snap.docs[0].id;
    cache.set(cacheKey, id);
    return id;
  }
  const ref = doc(collection(db, 'areas'));
  const batch = writeBatch(db);
  batch.set(ref, { name, level, parentAreaId, createdAt: serverTimestamp() });
  await batch.commit();
  cache.set(cacheKey, ref.id);
  return ref.id;
}

/**
 * ステータスマスタを名前→IDで読み込む。「未訪問」が無ければ作成して返す。
 * ステータスは管理された語彙のため、CSVの未知名で勝手に新規作成はしない
 * (エリアと違い、表記ゆれで不要なステータスが乱立するのを防ぐ)。
 */
async function loadStatusIndex(): Promise<{
  byName: Map<string, string>;
  unvisitedId: string;
}> {
  const snap = await getDocs(collection(db, 'statuses'));
  const byName = new Map<string, string>();
  snap.forEach((d) => byName.set(normalizeName(d.data().name ?? ''), d.id));

  let unvisitedId = byName.get('未訪問') ?? '';
  if (!unvisitedId) {
    const ref = doc(collection(db, 'statuses'));
    const batch = writeBatch(db);
    batch.set(ref, { name: '未訪問', color: '#9e9e9e', order: 10, createdAt: serverTimestamp() });
    await batch.commit();
    unvisitedId = ref.id;
    byName.set('未訪問', ref.id);
  }
  return { byName, unvisitedId };
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
  /** 取込は行ったが注意が必要な事項 (未知ステータスの読み替え等) */
  warnings: string[];
}

interface ExistingStore {
  id: string;
  address: string;
}

/** 既存店舗を一括ロードし、突合キー(外部コード / 店舗名+住所)で引ける索引を作る */
async function loadExistingIndex(): Promise<{
  byCode: Map<string, ExistingStore>;
  byNameAddr: Map<string, ExistingStore>;
}> {
  const byCode = new Map<string, ExistingStore>();
  const byNameAddr = new Map<string, ExistingStore>();
  const snap = await getDocs(collection(db, 'stores'));
  snap.forEach((d) => {
    const data = d.data();
    const entry: ExistingStore = { id: d.id, address: data.address ?? '' };
    if (data.externalCode) byCode.set(data.externalCode, entry);
    byNameAddr.set(`${data.name}|${data.address}`, entry);
  });
  return { byCode, byNameAddr };
}

/**
 * 店舗を一括 upsert。
 * - 突合キー: 店舗コードがあれば優先、無ければ「店舗名+住所」
 * - 新規: ステータス・メモを初期値として登録、住所をジオコーディング待ちに
 * - 更新: 基本情報(店舗名/住所/ジャンル/営業時間/エリア)のみ更新。
 *   現場が更新する運用データ(ステータス/メモ/最終訪問)はCSVで上書きしない。
 *   住所が変わった場合のみ再ジオコーディング。
 * エリア/ステータスは名前で突合し無ければ自動作成。
 */
export async function importStores(rows: StoreCsvRow[]): Promise<ImportResult> {
  const areaCache = new Map<string, string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const unknownStatusNames = new Set<string>();

  const { byCode, byNameAddr } = await loadExistingIndex();
  const { byName: statusByName, unvisitedId } = await loadStatusIndex();

  // マスタ解決 + 既存突合 (店舗ごと)
  const resolved: Array<{
    row: StoreCsvRow;
    areaId: string | null;
    statusId: string | null;
    existing: ExistingStore | null;
  }> = [];
  for (const row of rows) {
    const largeId = await resolveAreaId(row.areaLarge, 1, null, areaCache);
    const mediumId = await resolveAreaId(row.areaMedium, 2, largeId, areaCache);
    const smallId = await resolveAreaId(row.areaSmall, 3, mediumId, areaCache);
    // ステータス: 既存名のみ採用。未知名は未訪問に読み替えて警告(乱立防止)。
    let statusId = unvisitedId;
    if (row.initialStatus) {
      const found = statusByName.get(row.initialStatus);
      if (found) statusId = found;
      else unknownStatusNames.add(row.initialStatus);
    }
    const existing =
      (row.externalCode && byCode.get(row.externalCode)) ||
      byNameAddr.get(`${row.name}|${row.address}`) ||
      null;
    resolved.push({ row, areaId: smallId ?? mediumId ?? largeId, statusId, existing });
  }
  unknownStatusNames.forEach((n) =>
    warnings.push(`未登録のステータス「${n}」は「未訪問」として取り込みました（必要ならマスタに追加してください）`),
  );

  // 500件ずつバッチ書き込み
  let created = 0;
  let updated = 0;
  for (let i = 0; i < resolved.length; i += 500) {
    const chunk = resolved.slice(i, i + 500);
    const batch = writeBatch(db);
    let chunkCreated = 0;
    let chunkUpdated = 0;
    for (const { row, areaId, statusId, existing } of chunk) {
      if (existing) {
        // 更新: 基本情報のみ。運用データ(ステータス/メモ)は温存。
        const addressChanged = existing.address !== row.address;
        const patch: Record<string, unknown> = {
          externalCode: row.externalCode ?? null,
          name: row.name,
          address: row.address,
          genre: row.genre,
          businessHours: row.businessHours,
          areaId,
          updatedAt: serverTimestamp(),
        };
        if (row.lat != null && row.lng != null) {
          // CSVに座標があれば確定値として採用
          patch.lat = row.lat;
          patch.lng = row.lng;
          patch.geocodeStatus = 'ok';
        } else if (addressChanged) {
          // 住所が変わったら再ジオコーディング待ちに
          patch.lat = null;
          patch.lng = null;
          patch.geocodeStatus = 'pending';
        }
        batch.update(doc(db, 'stores', existing.id), patch);
        chunkUpdated += 1;
      } else {
        // 新規: ステータス・メモを初期値として登録
        const ref = doc(collection(db, 'stores'));
        const hasCoords = row.lat != null && row.lng != null;
        batch.set(ref, {
          externalCode: row.externalCode ?? null,
          name: row.name,
          address: row.address,
          lat: hasCoords ? row.lat : null,
          lng: hasCoords ? row.lng : null,
          geocodeStatus: hasCoords ? 'ok' : 'pending',
          genre: row.genre,
          businessHours: row.businessHours,
          areaId,
          statusId,
          lastVisitMemo: row.memo,
          lastVisitUserId: null,
          lastVisitAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        chunkCreated += 1;
      }
    }
    try {
      await batch.commit();
      created += chunkCreated;
      updated += chunkUpdated;
    } catch (e) {
      errors.push(`バッチ ${i / 500 + 1} の書き込みに失敗: ${String(e)}`);
    }
  }

  return { created, updated, errors, warnings };
}
