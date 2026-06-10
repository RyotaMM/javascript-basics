import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  Typography,
} from '@mui/material';
import { createStore } from '../../services/storeService';
import { useAreas, useStatuses } from '../../hooks/useMasters';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 地図タップで指定された初期座標 (ピン追加時) */
  initialLat?: number | null;
  initialLng?: number | null;
}

const emptyForm = {
  name: '',
  address: '',
  genre: '',
  businessHours: '',
  areaId: '',
  statusId: '',
  lat: '',
  lng: '',
};

/** 管理者向け: UIから新規店舗を追加するダイアログ */
export default function StoreFormDialog({ open, onClose, initialLat, initialLng }: Props) {
  const areas = useAreas();
  const statuses = useStatuses();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 座標が地図タップで渡された場合は住所必須を外す
  const fromMap = initialLat != null && initialLng != null;

  // 開くたびに初期化。ステータス既定値は「未訪問」(あれば)、座標は地図タップ値を反映
  useEffect(() => {
    if (open) {
      const unvisited = statuses.find((s) => s.name === '未訪問');
      setForm({
        ...emptyForm,
        statusId: unvisited?.id ?? '',
        lat: initialLat != null ? String(initialLat) : '',
        lng: initialLng != null ? String(initialLng) : '',
      });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('店舗名は必須です。');
      return;
    }
    if (!fromMap && !form.address.trim()) {
      setError('住所、または地図上の位置のいずれかが必要です。');
      return;
    }
    const lat = form.lat.trim() ? Number(form.lat) : null;
    const lng = form.lng.trim() ? Number(form.lng) : null;
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
      setError('緯度・経度は数値で入力してください。');
      return;
    }
    setSaving(true);
    try {
      await createStore({
        name: form.name.trim(),
        address: form.address.trim(),
        genre: form.genre.trim(),
        businessHours: form.businessHours.trim(),
        areaId: form.areaId || null,
        statusId: form.statusId || null,
        lat,
        lng,
      });
      onClose();
    } catch (e) {
      setError(`追加に失敗しました: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>店舗を追加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {fromMap && (
            <Alert severity="success">
              地図で指定した位置に登録します。店名だけ入れればOK（住所は任意）。
            </Alert>
          )}
          <TextField label="店舗名 *" value={form.name} onChange={(e) => set('name', e.target.value)} fullWidth />
          <TextField label={fromMap ? '住所 (任意)' : '住所 *'} value={form.address} onChange={(e) => set('address', e.target.value)} fullWidth />
          <TextField label="ジャンル" value={form.genre} onChange={(e) => set('genre', e.target.value)} fullWidth />
          <TextField label="営業時間" value={form.businessHours} onChange={(e) => set('businessHours', e.target.value)} fullWidth />
          <TextField select label="エリア" value={form.areaId} onChange={(e) => set('areaId', e.target.value)} fullWidth>
            <MenuItem value="">未設定</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {'　'.repeat(a.level - 1)}
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="ステータス" value={form.statusId} onChange={(e) => set('statusId', e.target.value)} fullWidth>
            <MenuItem value="">未設定</MenuItem>
            {statuses.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="緯度 (任意)" value={form.lat} onChange={(e) => set('lat', e.target.value)} fullWidth />
            <TextField label="経度 (任意)" value={form.lng} onChange={(e) => set('lng', e.target.value)} fullWidth />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            緯度・経度を空にすると「位置未設定」で登録され、地図上でピンをドラッグして配置できます。
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          追加
        </Button>
      </DialogActions>
    </Dialog>
  );
}
