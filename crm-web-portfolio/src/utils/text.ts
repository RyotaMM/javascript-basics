/**
 * マスタ名(エリア・ステータス)の表記ゆれを吸収する正規化。
 * NFKC で全角/半角を統一し、連続空白を1つに、前後空白を除去。
 * 例: "渋谷　区 " → "渋谷 区"、"ＮＧ" → "NG"
 */
export function normalizeName(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim();
}
