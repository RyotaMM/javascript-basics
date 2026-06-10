import { describe, it, expect } from 'vitest';
import { normalizeName } from './text';

describe('normalizeName', () => {
  it('前後と連続する空白を整理する', () => {
    expect(normalizeName('  渋谷　区  ')).toBe('渋谷 区');
  });

  it('全角英数字を半角化する(NFKC)', () => {
    expect(normalizeName('ＮＧ')).toBe('NG');
    expect(normalizeName('３丁目')).toBe('3丁目');
  });

  it('表記ゆれが同じ正規化結果になる', () => {
    expect(normalizeName('設置済み ')).toBe(normalizeName('設置済み'));
  });

  it('空文字はそのまま', () => {
    expect(normalizeName('')).toBe('');
  });
});
