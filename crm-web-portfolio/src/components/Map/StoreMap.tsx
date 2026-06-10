import { useEffect, useMemo, useRef } from 'react';
import { Map, useMap, AdvancedMarker, Marker } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Marker as ClusterMarker } from '@googlemaps/markerclusterer';
import type { Store, Status } from '../../types';
import { useUiStore } from '../../stores/uiStore';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_CENTER = { lat: 35.6595, lng: 139.7005 }; // 渋谷
const DEFAULT_ZOOM = 13;
const FALLBACK_COLOR = '#9e9e9e';

interface Props {
  stores: Store[];
  statuses: Status[];
}

/** ステータスID -> 色 の早見表 */
function useStatusColors(statuses: Status[]): Record<string, string> {
  return useMemo(() => {
    const dict: Record<string, string> = {};
    statuses.forEach((s) => (dict[s.id] = s.color));
    return dict;
  }, [statuses]);
}

export default function StoreMap({ stores, statuses }: Props) {
  const colors = useStatusColors(statuses);
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
  const addPinMode = useUiStore((s) => s.addPinMode);
  const setAddPinMode = useUiStore((s) => s.setAddPinMode);
  const setPendingNewPos = useUiStore((s) => s.setPendingNewPos);

  return (
    <Map
      mapId={mapId || undefined}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={DEFAULT_ZOOM}
      gestureHandling="greedy"
      disableDefaultUI={true}
      clickableIcons={false}
      draggableCursor={addPinMode ? 'crosshair' : undefined}
      onClick={(e) => {
        if (!addPinMode) return;
        const ll = e.detail.latLng;
        if (ll) {
          setPendingNewPos({ lat: ll.lat, lng: ll.lng });
          setAddPinMode(false);
        }
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Map ID があれば AdvancedMarker + クラスタリング。
          無ければ (課金前の開発時など) 通常の Marker でフォールバック表示。 */}
      {mapId ? (
        <ClusteredMarkers stores={stores} colors={colors} />
      ) : (
        <SimpleMarkers stores={stores} colors={colors} />
      )}
      <LocateController />
      <UserMarker />
      <MapCenterTracker />
    </Map>
  );
}

/** 地図中心を uiStore に保持 (位置未設定店舗の配置先に使用) */
function MapCenterTracker() {
  const map = useMap();
  const setMapCenter = useUiStore((s) => s.setMapCenter);
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const c = map.getCenter();
      if (c) setMapCenter({ lat: c.lat(), lng: c.lng() });
    };
    update();
    const listener = map.addListener('idle', update);
    return () => listener.remove();
  }, [map, setMapCenter]);
  return null;
}

/** 現在地ボタン押下を監視し、地図を現在地へ移動する */
function LocateController() {
  const map = useMap();
  const locateNonce = useUiStore((s) => s.locateNonce);
  const setUserPos = useUiStore((s) => s.setUserPos);

  useEffect(() => {
    if (locateNonce === 0 || !map) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        map.panTo(p);
        map.setZoom(16);
      },
      () => {
        // 取得失敗 (権限拒否など) は無視
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateNonce]);

  return null;
}

/** 現在地マーカー (青いドット) */
function UserMarker() {
  const userPos = useUiStore((s) => s.userPos);
  if (!userPos) return null;
  return (
    <Marker
      position={userPos}
      icon={{
        path: 0, // CIRCLE
        scale: 7,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      }}
      clickable={false}
      zIndex={9999}
    />
  );
}

function visibleStores(stores: Store[]): Store[] {
  return stores.filter((s) => s.lat != null && s.lng != null);
}

/** Map ID あり: AdvancedMarker + マーカークラスタリング */
function ClusteredMarkers({
  stores,
  colors,
}: {
  stores: Store[];
  colors: Record<string, string>;
}) {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Record<string, ClusterMarker>>({});
  const selectStore = useUiStore((s) => s.selectStore);
  const setPendingMove = useUiStore((s) => s.setPendingMove);
  const revertNonce = useUiStore((s) => s.moveRevertNonce);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map });
    }
  }, [map]);

  const setMarkerRef = (marker: ClusterMarker | null, id: string) => {
    if (marker) markersRef.current[id] = marker;
    else delete markersRef.current[id];
  };

  useEffect(() => {
    const c = clusterer.current;
    if (!c) return;
    c.clearMarkers();
    c.addMarkers(Object.values(markersRef.current));
  }, [stores]);

  return (
    <>
      {visibleStores(stores).map((store) => {
        const color = (store.statusId && colors[store.statusId]) || FALLBACK_COLOR;
        return (
          <AdvancedMarker
            key={`${store.id}-${revertNonce}`}
            position={{ lat: store.lat as number, lng: store.lng as number }}
            ref={(m) => setMarkerRef(m, store.id)}
            onClick={() => selectStore(store.id)}
            draggable={isAdmin}
            onDragEnd={(e) => {
              if (e.latLng) setPendingMove({ storeId: store.id, lat: e.latLng.lat(), lng: e.latLng.lng() });
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: color,
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

/** Map ID なし: 通常 Marker（ステータス色をピンに反映）でフォールバック */
function SimpleMarkers({
  stores,
  colors,
}: {
  stores: Store[];
  colors: Record<string, string>;
}) {
  const selectStore = useUiStore((s) => s.selectStore);
  const setPendingMove = useUiStore((s) => s.setPendingMove);
  const revertNonce = useUiStore((s) => s.moveRevertNonce);
  const { isAdmin } = useAuth();
  return (
    <>
      {visibleStores(stores).map((store) => {
        const color = (store.statusId && colors[store.statusId]) || FALLBACK_COLOR;
        return (
          <Marker
            key={`${store.id}-${revertNonce}`}
            position={{ lat: store.lat as number, lng: store.lng as number }}
            onClick={() => selectStore(store.id)}
            draggable={isAdmin}
            onDragEnd={(e) => {
              if (e.latLng) setPendingMove({ storeId: store.id, lat: e.latLng.lat(), lng: e.latLng.lng() });
            }}
            icon={{
              path: 0, // google.maps.SymbolPath.CIRCLE
              scale: 8,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
          />
        );
      })}
    </>
  );
}
