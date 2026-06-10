import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  Button,
  Divider,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsIcon from '@mui/icons-material/Directions';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useUiStore } from '../../stores/uiStore';
import { useStoreDoc } from '../../hooks/useStoreDoc';
import { useStatuses } from '../../hooks/useMasters';
import { useAuth } from '../../hooks/useAuth';
import { updateStoreStatus } from '../../services/storeService';
import { buildNavigationUrl } from '../../utils/maps';
import type { Status } from '../../types';

function statusName(statuses: Status[], id: string | null): string {
  return statuses.find((s) => s.id === id)?.name ?? '—';
}

function formatTs(ts: { toDate: () => Date } | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function StoreDetailPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const selectedStoreId = useUiStore((s) => s.selectedStoreId);
  const selectStore = useUiStore((s) => s.selectStore);
  const { store, history, pendingWrites } = useStoreDoc(selectedStoreId);
  const statuses = useStatuses();
  const { user } = useAuth();

  const [statusId, setStatusId] = useState('');
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 店舗を開き直したら入力欄を現在値で初期化
  useEffect(() => {
    if (store) {
      setStatusId(store.statusId ?? '');
      setMemo('');
      setSaved(false);
      setSaveError(null);
    }
  }, [store?.id]);

  const handleSave = () => {
    if (!store || !user || !statusId) return;
    setSaveError(null);
    // 楽観的更新: ローカル書き込みは即時反映される。サーバー同期はバックグラウンドで進み、
    // オフライン時は pendingWrites チップが同期待ちを示す。完了/失敗を待たずにUIを進める。
    updateStoreStatus({
      storeId: store.id,
      prevStatusId: store.statusId ?? null,
      newStatusId: statusId,
      memo,
      userId: user.id,
    }).catch(() => setSaveError('サーバーへの同期に失敗しました。再度お試しください。'));
    setSaved(true);
    setMemo('');
  };

  const open = Boolean(selectedStoreId);

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={() => selectStore(null)}
      PaperProps={{
        sx: isMobile
          ? { maxHeight: '80dvh', borderTopLeftRadius: 16, borderTopRightRadius: 16 }
          : { width: 400 },
      }}
    >
      {store && (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" noWrap>
              {store.name}
            </Typography>
            <IconButton onClick={() => selectStore(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          {pendingWrites && (
            <Chip
              icon={<CloudOffIcon />}
              label="同期待ち（変更を送信中）"
              color="warning"
              size="small"
              sx={{ mt: 1 }}
            />
          )}

          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {store.address}
            </Typography>
            {store.genre && (
              <Typography variant="body2" color="text.secondary">
                ジャンル: {store.genre}
              </Typography>
            )}
            {store.businessHours && (
              <Typography variant="body2" color="text.secondary">
                営業時間: {store.businessHours}
              </Typography>
            )}
            <Typography variant="body2">
              現在のステータス: {statusName(statuses, store.statusId)}
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* ステータス更新 + メモ */}
          <Stack spacing={2}>
            {saved && !saveError && <Alert severity="success">更新しました。</Alert>}
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              select
              label="ステータスを更新"
              size="small"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              fullWidth
            >
              {statuses.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="メモ"
              size="small"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="現地の状況・再訪条件など"
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!statusId}
                fullWidth
              >
                更新
              </Button>
              <Button
                variant="outlined"
                startIcon={<DirectionsIcon />}
                onClick={() => window.open(buildNavigationUrl(store), '_blank')}
              >
                ナビ
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 訪問履歴 */}
          <Typography variant="subtitle2" gutterBottom>
            訪問履歴
          </Typography>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              履歴はありません。
            </Typography>
          ) : (
            <List dense disablePadding>
              {history.map((h) => (
                <ListItem key={h.id} disableGutters>
                  <ListItemText
                    primary={`${formatTs(h.visitedAt)}　${statusName(statuses, h.statusId)}`}
                    secondary={h.memo || undefined}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Drawer>
  );
}
