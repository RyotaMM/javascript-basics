import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { updateStoreLocation } from '../../services/storeService';
import { useUiStore } from '../../stores/uiStore';
import type { Store } from '../../types';

/**
 * 位置未設定(緯度経度なし=ジオコーディング失敗/未処理)の店舗を管理者に可視化。
 * 「地図中心に配置」で現在の地図中心に仮配置し、その後ピンをドラッグで微調整できる。
 */
export default function UnlocatedStores({ stores }: { stores: Store[] }) {
  const [open, setOpen] = useState(false);
  const mapCenter = useUiStore((s) => s.mapCenter);

  const unlocated = stores.filter((s) => s.lat == null || s.lng == null);
  if (unlocated.length === 0) return null;

  const place = (storeId: string) => {
    if (!mapCenter) return;
    updateStoreLocation(storeId, mapCenter.lat, mapCenter.lng);
  };

  return (
    <>
      <Alert
        severity="warning"
        sx={{ borderRadius: 0, py: 0 }}
        action={
          <Button color="inherit" size="small" onClick={() => setOpen(true)}>
            配置する
          </Button>
        }
      >
        位置未設定の店舗が {unlocated.length} 件あります（地図に表示されません）
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>位置未設定の店舗</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            「地図中心に配置」を押すと、現在の地図の中心に仮置きします。地図上のピンをドラッグして正確な位置に調整してください。
          </Typography>
          <List dense>
            {unlocated.map((s) => (
              <ListItem
                key={s.id}
                secondaryAction={
                  <Button size="small" onClick={() => place(s.id)} disabled={!mapCenter}>
                    地図中心に配置
                  </Button>
                }
              >
                <ListItemText primary={s.name} secondary={s.address} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
