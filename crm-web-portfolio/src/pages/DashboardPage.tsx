import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import AppHeader from '../components/Layout/AppHeader';
import { useAllStores } from '../hooks/useAllStores';
import { useAreas, useStatuses } from '../hooks/useMasters';
import { useUsers } from '../hooks/useUsers';
import { countVisitsByUser } from '../services/statsService';
import { storeInArea } from '../utils/area';
import type { Area } from '../types';

const FALLBACK_COLOR = '#9e9e9e';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const { stores, loading, capped } = useAllStores();
  const areas = useAreas();
  const statuses = useStatuses();
  const users = useUsers();

  const [areaId, setAreaId] = useState('');
  const [userId, setUserId] = useState('');
  const [visitsByUser, setVisitsByUser] = useState<Record<string, number>>({});

  // 担当者別の訪問回数を訪問履歴から集計 (件数クエリのみ=低コスト)
  useEffect(() => {
    if (users.length === 0) return;
    let active = true;
    countVisitsByUser(users.map((u) => u.id)).then((counts) => {
      if (active) setVisitsByUser(counts);
    });
    return () => {
      active = false;
    };
  }, [users]);

  const visitData = useMemo(
    () =>
      users
        .map((u) => ({ name: u.name, 訪問回数: visitsByUser[u.id] ?? 0 }))
        .filter((d) => d.訪問回数 > 0),
    [users, visitsByUser],
  );

  const areaParent = useMemo(() => {
    const m = new Map<string, string | null>();
    areas.forEach((a) => m.set(a.id, a.parentAreaId));
    return m;
  }, [areas]);

  // フィルタ適用後の店舗
  const filtered = useMemo(() => {
    return stores.filter((s) => {
      if (areaId && !storeInArea(s, areaId, areaParent)) return false;
      if (userId && s.lastVisitUserId !== userId) return false;
      return true;
    });
  }, [stores, areaId, userId, areaParent]);

  // ステータス別の集計 (円グラフ用)
  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((s) => {
      const key = s.statusId ?? '__none__';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return statuses
      .map((st) => ({ name: st.name, value: counts.get(st.id) ?? 0, color: st.color }))
      .filter((d) => d.value > 0);
  }, [filtered, statuses]);

  // 小エリア別の件数 (棒グラフ用)
  const areaData = useMemo(() => {
    const smallAreas = new Map<string, Area>();
    areas.forEach((a) => {
      if (a.level === 3) smallAreas.set(a.id, a);
    });
    const counts = new Map<string, number>();
    filtered.forEach((s) => {
      if (s.areaId && smallAreas.has(s.areaId)) {
        counts.set(s.areaId, (counts.get(s.areaId) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([id, count]) => ({
      area: smallAreas.get(id)?.name ?? id,
      件数: count,
    }));
  }, [filtered, areas]);

  // 訪問率 (一度でも訪問記録があるか)
  const total = filtered.length;
  const visited = filtered.filter((s) => s.lastVisitAt).length;
  const rate = total ? Math.round((visited / total) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <AppHeader />
      {loading && <LinearProgress />}
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto', width: '100%' }}>
        <Typography variant="h6" gutterBottom>
          ダッシュボード
        </Typography>

        {capped && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            店舗数が多いため、グラフは最新 {stores.length} 件に基づく概算です。
          </Alert>
        )}

        {/* フィルタ */}
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>エリア</InputLabel>
            <Select label="エリア" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <MenuItem value="">すべて</MenuItem>
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {'　'.repeat(a.level - 1)}
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>担当者</InputLabel>
            <Select label="担当者" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <MenuItem value="">すべて</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* サマリ */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <StatCard label="対象店舗数" value={String(total)} />
          </Grid>
          <Grid item xs={4}>
            <StatCard label="訪問済み" value={String(visited)} />
          </Grid>
          <Grid item xs={4}>
            <StatCard label="訪問率" value={`${rate}%`} />
          </Grid>
        </Grid>

        {/* グラフ */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                ステータス別
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {statusData.map((d) => (
                        <Cell key={d.name} fill={d.color || FALLBACK_COLOR} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                小エリア別の店舗数
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="件数" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                担当者別の訪問回数（訪問履歴の累計）
              </Typography>
              {visitData.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  訪問履歴がありません。
                </Typography>
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="訪問回数" fill="#2e7d32" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
