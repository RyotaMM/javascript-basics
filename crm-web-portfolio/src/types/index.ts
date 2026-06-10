import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'staff';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  disabled: boolean;
  /** 担当エリアID(大/中/小いずれも可)。staffはこのエリア配下に表示を絞る。空=全エリア。 */
  assignedAreaIds?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** エリア階層: 1=大, 2=中, 3=小 */
export type AreaLevel = 1 | 2 | 3;

export interface Area {
  id: string;
  name: string;
  level: AreaLevel;
  parentAreaId: string | null;
  createdAt?: Timestamp;
}

export interface Status {
  id: string;
  name: string;
  /** マップピンの色 #RRGGBB */
  color: string;
  order: number;
  createdAt?: Timestamp;
}

export type GeocodeStatus = 'ok' | 'failed' | 'pending';

export interface Store {
  id: string;
  /** CSV突合用の外部コード (任意) */
  externalCode: string | null;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  geocodeStatus: GeocodeStatus;
  genre: string;
  businessHours: string;
  areaId: string | null;
  statusId: string | null;
  lastVisitMemo: string;
  lastVisitUserId: string | null;
  lastVisitAt: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VisitHistory {
  id: string;
  storeId: string;
  userId: string;
  /** 変更前ステータスID (差分分析用) */
  prevStatusId: string | null;
  statusId: string;
  memo: string;
  visitedAt: Timestamp;
}

/** マップ・リストのフィルタ条件 (複数選択対応) */
export interface StoreFilter {
  areaIds: string[];
  statusIds: string[];
  genres: string[];
  /** 営業時間に含む文字での絞り込み (例: "日曜", "24") */
  businessHoursKeyword: string;
  onlyUnvisited: boolean;
}
