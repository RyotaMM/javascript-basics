import { describe, it, expect } from 'vitest';
import { storeInArea, storeInAnyArea } from './area';
import type { Store } from '../types';

// 東京都(t) > 渋谷(s) > 宇田川町(u)
const areaParent = new Map<string, string | null>([
  ['t', null],
  ['s', 't'],
  ['u', 's'],
  ['x', null], // 無関係エリア
]);

const store = (areaId: string | null) => ({ id: '1', areaId } as Store);

describe('storeInArea', () => {
  it('店舗の小エリアそのものに一致', () => {
    expect(storeInArea(store('u'), 'u', areaParent)).toBe(true);
  });

  it('祖先エリア(中・大)に含まれると判定', () => {
    expect(storeInArea(store('u'), 's', areaParent)).toBe(true);
    expect(storeInArea(store('u'), 't', areaParent)).toBe(true);
  });

  it('別系統のエリアには含まれない', () => {
    expect(storeInArea(store('u'), 'x', areaParent)).toBe(false);
  });

  it('areaId が null なら常に false', () => {
    expect(storeInArea(store(null), 't', areaParent)).toBe(false);
  });
});

describe('storeInAnyArea', () => {
  it('担当エリア空なら全件 true', () => {
    expect(storeInAnyArea(store('u'), [], areaParent)).toBe(true);
  });

  it('いずれかの担当エリアに含まれれば true', () => {
    expect(storeInAnyArea(store('u'), ['x', 's'], areaParent)).toBe(true);
  });

  it('どの担当エリアにも含まれなければ false', () => {
    expect(storeInAnyArea(store('u'), ['x'], areaParent)).toBe(false);
  });
});
