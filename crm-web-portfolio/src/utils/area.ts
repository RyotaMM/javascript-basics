import type { Store } from '../types';

/**
 * 店舗の所属エリアが、指定エリア(またはその子孫)に含まれるかを、親子マップを辿って判定。
 * areaParent: エリアID -> 親エリアID(なければnull)
 */
export function storeInArea(
  store: Store,
  areaId: string,
  areaParent: Map<string, string | null>,
): boolean {
  let cur: string | null | undefined = store.areaId;
  while (cur) {
    if (cur === areaId) return true;
    cur = areaParent.get(cur) ?? null;
  }
  return false;
}

/** 店舗がいずれかの担当エリア(またはその子孫)に含まれるか。担当エリア空なら全件true。 */
export function storeInAnyArea(
  store: Store,
  areaIds: string[],
  areaParent: Map<string, string | null>,
): boolean {
  if (areaIds.length === 0) return true;
  return areaIds.some((id) => storeInArea(store, id, areaParent));
}

/**
 * 指定エリア群に「自分自身＋全子孫」のエリアIDを加えた集合を返す。
 * 店舗は小エリアIDを持つため、中/大エリアを選んだ際の子孫を含めてサーバ'in'検索するのに使う。
 */
export function expandAreaIds(
  areaIds: string[],
  areaParent: Map<string, string | null>,
): string[] {
  if (areaIds.length === 0) return [];
  const selected = new Set(areaIds);
  const result = new Set<string>(areaIds);
  // 全エリアを走査し、祖先に選択エリアが含まれるものを加える
  for (const [id] of areaParent) {
    let cur: string | null | undefined = id;
    while (cur) {
      if (selected.has(cur)) {
        result.add(id);
        break;
      }
      cur = areaParent.get(cur) ?? null;
    }
  }
  return Array.from(result);
}
