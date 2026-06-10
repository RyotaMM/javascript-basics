import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildNavigationUrl } from './maps';
import type { Store } from '../types';

const base = { id: '1', name: 'x', address: '東京都渋谷区1-1' } as Store;

function setUA(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
}

afterEach(() => vi.restoreAllMocks());

describe('buildNavigationUrl', () => {
  it('緯度経度があれば Google Maps(非iOS) の宛先URLを作る', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0)');
    const url = buildNavigationUrl({ ...base, lat: 35.66, lng: 139.7 });
    expect(url).toContain('google.com/maps/dir/');
    expect(url).toContain('destination=35.66,139.7');
  });

  it('iOSなら Apple マップを使う', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)');
    const url = buildNavigationUrl({ ...base, lat: 35.66, lng: 139.7 });
    expect(url).toContain('maps.apple.com');
    expect(url).toContain('daddr=35.66,139.7');
  });

  it('緯度経度が無ければ住所をエンコードして使う', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0)');
    const url = buildNavigationUrl({ ...base, lat: null, lng: null });
    expect(url).toContain(encodeURIComponent('東京都渋谷区1-1'));
  });
});
