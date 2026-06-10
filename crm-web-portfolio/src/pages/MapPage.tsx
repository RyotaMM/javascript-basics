import { useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Fab,
  Badge,
  Collapse,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import AppHeader from '../components/Layout/AppHeader';
import FilterBar from '../components/Filter/FilterBar';
import StoreMap from '../components/Map/StoreMap';
import StoreDetailPanel from '../components/Store/StoreDetailPanel';
import StoreFormDialog from '../components/Store/StoreFormDialog';
import UnlocatedStores from '../components/Map/UnlocatedStores';
import { useStores } from '../hooks/useStores';
import { useStatuses } from '../hooks/useMasters';
import { useAuth } from '../hooks/useAuth';
import { seedDefaultStatuses } from '../services/seedService';
import { updateStoreLocation } from '../services/storeService';
import { useFilterStore } from '../stores/filterStore';
import { useUiStore } from '../stores/uiStore';

export default function MapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { stores, capped } = useStores();
  const statuses = useStatuses();
  const { isAdmin } = useAuth();
  const { filter } = useFilterStore();
  const requestLocate = useUiStore((s) => s.requestLocate);
  const addPinMode = useUiStore((s) => s.addPinMode);
  const setAddPinMode = useUiStore((s) => s.setAddPinMode);
  const pendingNewPos = useUiStore((s) => s.pendingNewPos);
  const setPendingNewPos = useUiStore((s) => s.setPendingNewPos);
  const pendingMove = useUiStore((s) => s.pendingMove);
  const setPendingMove = useUiStore((s) => s.setPendingMove);
  const revertMove = useUiStore((s) => s.revertMove);

  const confirmMove = async () => {
    if (!pendingMove) return;
    const m = pendingMove;
    setPendingMove(null);
    await updateStoreLocation(m.storeId, m.lat, m.lng);
  };

  const [seeding, setSeeding] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const showSeed = isAdmin && statuses.length === 0;
  const activeFilterCount =
    filter.areaIds.length +
    filter.statusIds.length +
    filter.genres.length +
    (filter.businessHoursKeyword.trim() ? 1 : 0) +
    (filter.onlyUnvisited ? 1 : 0);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDefaultStatuses();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <AppHeader />
      {showSeed && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={handleSeed} disabled={seeding}>
              初期ステータスを作成
            </Button>
          }
        >
          ステータスマスタが未登録です。初期ステータス（未訪問/再訪問/設置済み/お断り/NG）を作成してください。
        </Alert>
      )}

      {/* スマホ: フィルタは折りたたみ (地図を最大化)。PC: 常時表示。 */}
      {isMobile ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 0.5,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              size="small"
              startIcon={
                <Badge badgeContent={activeFilterCount} color="primary">
                  <TuneIcon fontSize="small" />
                </Badge>
              }
              onClick={() => setFiltersOpen((v) => !v)}
            >
              絞り込み
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ fontSize: 13, color: 'text.secondary' }}>{stores.length}件</Box>
          </Box>
          <Collapse in={filtersOpen}>
            <FilterBar stores={stores} />
          </Collapse>
        </>
      ) : (
        <FilterBar stores={stores} />
      )}

      {capped && (
        <Alert severity="warning" sx={{ borderRadius: 0, py: 0 }}>
          表示上限（{stores.length}件）に達しました。エリアやステータスで絞り込んでください。
        </Alert>
      )}
      {isAdmin && <UnlocatedStores stores={stores} />}
      {addPinMode && (
        <Alert
          severity="info"
          sx={{ borderRadius: 0, py: 0 }}
          action={
            <Button color="inherit" size="small" onClick={() => setAddPinMode(false)}>
              キャンセル
            </Button>
          }
        >
          地図をタップして、新しい店舗の位置を指定してください。
        </Alert>
      )}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <StoreMap stores={stores} statuses={statuses} />
        {/* 店舗追加ボタン (ピンで位置指定) */}
        <Fab
          color={addPinMode ? 'default' : 'secondary'}
          size="medium"
          onClick={() => setAddPinMode(!addPinMode)}
          aria-label="店舗を追加"
          sx={{ position: 'absolute', bottom: 88, right: 16 }}
        >
          <AddIcon />
        </Fab>
        {/* 現在地ボタン */}
        <Fab
          color="primary"
          size="medium"
          onClick={requestLocate}
          aria-label="現在地"
          sx={{ position: 'absolute', bottom: 24, right: 16 }}
        >
          <MyLocationIcon />
        </Fab>
      </Box>

      <StoreDetailPanel />
      <StoreFormDialog
        open={pendingNewPos != null}
        onClose={() => setPendingNewPos(null)}
        initialLat={pendingNewPos?.lat ?? null}
        initialLng={pendingNewPos?.lng ?? null}
      />

      {/* ピン移動の確定/取消 (確定するまで保存しない) */}
      <Snackbar
        open={pendingMove != null}
        message="ピンを移動しました。この位置で確定しますか？"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={
          <>
            <Button color="inherit" size="small" onClick={revertMove}>
              元に戻す
            </Button>
            <Button color="primary" size="small" onClick={confirmMove}>
              確定
            </Button>
          </>
        }
      />
    </Box>
  );
}
