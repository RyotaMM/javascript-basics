import type { Store } from '../types';

/**
 * 外部マップアプリへのナビゲーション用ディープリンクを生成。
 * iOS では Apple マップ、それ以外は Google マップを優先。
 */
export function buildNavigationUrl(store: Store): string {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (store.lat != null && store.lng != null) {
    if (isIOS) {
      return `https://maps.apple.com/?daddr=${store.lat},${store.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
  }

  // 緯度経度が無い場合は住所で検索
  const q = encodeURIComponent(store.address);
  return isIOS
    ? `https://maps.apple.com/?daddr=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
