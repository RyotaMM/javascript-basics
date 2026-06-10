import { useEffect, useMemo, useState } from 'react';
import { subscribeStores, STORE_QUERY_LIMIT, IN_QUERY_LIMIT } from '../services/storeService';
import { useFilterStore } from '../stores/filterStore';
import { useStatuses, useAreas } from './useMasters';
import { useAuth } from './useAuth';
import { expandAreaIds, storeInArea } from '../utils/area';
import type { Store } from '../types';

const UNVISITED_STATUS_NAME = '未訪問';

/** フィルタ条件に応じた店舗のリアルタイム購読 (複数選択対応) */
export function useStores() {
  const filter = useFilterStore((s) => s.filter);
  const statuses = useStatuses();
  const areas = useAreas();
  const { user } = useAuth();
  const [raw, setRaw] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const areaParent = useMemo(() => {
    const m = new Map<string, string | null>();
    areas.forEach((a) => m.set(a.id, a.parentAreaId));
    return m;
  }, [areas]);

  // staff の担当エリア (admin・未設定は空=全件)
  const assignedAreaIds = useMemo(
    () => (user?.role === 'staff' ? (user.assignedAreaIds ?? []) : []),
    [user],
  );

  // サーバ 'in' 検索に使うエリアID群: フィルタ指定があればそれ、無ければ担当エリア。子孫まで展開。
  const serverAreaIds = useMemo(() => {
    const base = filter.areaIds.length > 0 ? filter.areaIds : assignedAreaIds;
    return expandAreaIds(base, areaParent);
  }, [filter.areaIds, assignedAreaIds, areaParent]);

  // 展開後が31件以上だとサーバ'in'に乗らないので、その時はクライアントで絞る
  const areaServerApplied = serverAreaIds.length > 0 && serverAreaIds.length <= IN_QUERY_LIMIT;

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeStores(areaServerApplied ? serverAreaIds : [], (next) => {
      setRaw(next);
      setLoading(false);
    });
    return unsub;
  }, [serverAreaIds, areaServerApplied]);

  const stores = useMemo(() => {
    let list = raw;

    // エリア: サーバで絞れなかった場合のフォールバック (大エリア選択で子孫>30 等)
    if (!areaServerApplied) {
      const base = filter.areaIds.length > 0 ? filter.areaIds : assignedAreaIds;
      if (base.length > 0) {
        list = list.filter((s) => base.some((id) => storeInArea(s, id, areaParent)));
      }
    }

    // ステータス(複数)
    if (filter.statusIds.length > 0) {
      const set = new Set(filter.statusIds);
      list = list.filter((s) => s.statusId != null && set.has(s.statusId));
    }

    // ジャンル(複数)
    if (filter.genres.length > 0) {
      const set = new Set(filter.genres);
      list = list.filter((s) => set.has(s.genre));
    }

    // 営業時間キーワード
    const kw = filter.businessHoursKeyword.trim();
    if (kw) {
      list = list.filter((s) => (s.businessHours ?? '').includes(kw));
    }

    // 未訪問のみ (ステータス基準)
    if (filter.onlyUnvisited) {
      const unvisited = statuses.find((s) => s.name === UNVISITED_STATUS_NAME);
      list = unvisited
        ? list.filter((s) => s.statusId === unvisited.id)
        : list.filter((s) => !s.lastVisitAt);
    }
    return list;
  }, [raw, filter, statuses, areaParent, assignedAreaIds, areaServerApplied]);

  const capped = raw.length >= STORE_QUERY_LIMIT;
  return { stores, loading, capped };
}
