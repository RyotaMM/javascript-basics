import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppHeader from '../components/Layout/AppHeader';
import { parseStoreCsv, importStores, type StoreCsvRow } from '../services/csvService';

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<StoreCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setResult(null);
    const { rows, errors } = await parseStoreCsv(file);
    setRows(rows);
    setParseErrors(errors);
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const res = await importStores(rows);
      let msg = `新規 ${res.created}件 / 更新 ${res.updated}件 を反映しました。`;
      if (res.warnings.length) msg += ` ⚠️ ${res.warnings.join(' / ')}`;
      if (res.errors.length) msg += ` (一部エラー: ${res.errors.join(' / ')})`;
      setResult(msg);
      setRows([]);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <AppHeader />
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%', overflowY: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">店舗データ CSVインポート</Typography>
          <Button component={RouterLink} to="/">
            マップに戻る
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={2}>
          列: 店舗コード(任意) / 店舗名 / 住所 / ジャンル / 営業時間 / 大エリア / 中エリア / 小エリア /
          初期ステータス。文字コードは UTF-8・Shift-JIS に対応。エリア・ステータスは名前で自動突合し、
          無ければ作成します。位置情報(緯度経度)は登録後にサーバー側で住所から自動変換します。
        </Typography>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {importing && <LinearProgress sx={{ my: 2 }} />}
        {result && (
          <Alert severity="success" sx={{ my: 2 }}>
            {result}
          </Alert>
        )}

        {parseErrors.length > 0 && (
          <Alert severity="warning" sx={{ my: 2 }}>
            <Typography variant="subtitle2">取り込めない行: {parseErrors.length}件</Typography>
            <List dense>
              {parseErrors.slice(0, 20).map((e, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText primary={e} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {rows.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              プレビュー: {rows.length}件 取り込み可能
            </Typography>
            <List dense sx={{ maxHeight: 240, overflowY: 'auto' }}>
              {rows.slice(0, 10).map((r, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText
                    primary={r.name}
                    secondary={`${r.address} / ${r.genre} / ${r.areaSmall || r.areaMedium || r.areaLarge}`}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing}
              sx={{ mt: 1 }}
            >
              {rows.length}件をインポート
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
