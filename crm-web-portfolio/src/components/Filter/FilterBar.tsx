import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  FormControlLabel,
  Switch,
  Button,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';
import { useFilterStore } from '../../stores/filterStore';
import { useAreas, useStatuses } from '../../hooks/useMasters';
import type { Store } from '../../types';

interface Props {
  /** ジャンル候補抽出用 (現在ロード済みの店舗から重複なしで生成) */
  stores: Store[];
}

const MENU_PROPS = { PaperProps: { style: { maxHeight: 360 } } } as const;

export default function FilterBar({ stores }: Props) {
  const { filter, setFilter, resetFilter } = useFilterStore();
  const areas = useAreas();
  const statuses = useStatuses();

  const genres = Array.from(new Set(stores.map((s) => s.genre).filter(Boolean))).sort();
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id;
  const statusName = (id: string) => statuses.find((s) => s.id === id)?.name ?? id;

  const multi =
    (setKey: 'areaIds' | 'statusIds' | 'genres') => (e: SelectChangeEvent<string[]>) => {
      const v = e.target.value;
      setFilter({ [setKey]: typeof v === 'string' ? v.split(',') : v });
    };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        p: 1,
        flexWrap: 'wrap',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          multiple
          value={filter.areaIds}
          onChange={multi('areaIds')}
          MenuProps={MENU_PROPS}
          displayEmpty
          renderValue={(ids) =>
            ids.length === 0 ? 'エリア: すべて' : `エリア: ${ids.map(areaName).join(', ')}`
          }
        >
          {areas.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              <Checkbox size="small" checked={filter.areaIds.includes(a.id)} />
              <ListItemText primary={`${'　'.repeat(a.level - 1)}${a.name}`} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          multiple
          value={filter.statusIds}
          onChange={multi('statusIds')}
          MenuProps={MENU_PROPS}
          displayEmpty
          renderValue={(ids) =>
            ids.length === 0 ? 'ステータス: すべて' : `ステータス: ${ids.map(statusName).join(', ')}`
          }
        >
          {statuses.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              <Checkbox size="small" checked={filter.statusIds.includes(s.id)} />
              <ListItemText primary={s.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <Select
          multiple
          value={filter.genres}
          onChange={multi('genres')}
          MenuProps={MENU_PROPS}
          displayEmpty
          renderValue={(g) => (g.length === 0 ? 'ジャンル: すべて' : `ジャンル: ${g.join(', ')}`)}
        >
          {genres.map((g) => (
            <MenuItem key={g} value={g}>
              <Checkbox size="small" checked={filter.genres.includes(g)} />
              <ListItemText primary={g} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="営業時間で絞り込み"
        placeholder="例: 日曜 / 24:00"
        value={filter.businessHoursKeyword}
        onChange={(e) => setFilter({ businessHoursKeyword: e.target.value })}
        sx={{ minWidth: 150 }}
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={filter.onlyUnvisited}
            onChange={(e) => setFilter({ onlyUnvisited: e.target.checked })}
          />
        }
        label="未訪問のみ"
      />

      <Button size="small" onClick={resetFilter}>
        クリア
      </Button>
    </Box>
  );
}
