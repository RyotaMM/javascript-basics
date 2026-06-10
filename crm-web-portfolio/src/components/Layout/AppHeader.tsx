import { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../services/authService';
import { exportStoresCsv } from '../../services/exportService';

export default function AppHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [exporting, setExporting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleExport = async () => {
    setMenuAnchor(null);
    setExporting(true);
    try {
      await exportStoresCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <Typography variant="h6" sx={{ fontSize: isMobile ? 15 : 18 }} noWrap>
          店舗巡回CRM
        </Typography>
        <Chip
          size="small"
          icon={online ? <WifiIcon /> : <WifiOffIcon />}
          label={isMobile ? undefined : online ? 'オンライン' : 'オフライン'}
          color={online ? 'success' : 'warning'}
          sx={{ ml: 1, '& .MuiChip-label': isMobile ? { px: 0.5 } : undefined }}
        />
        <Box sx={{ flexGrow: 1 }} />

        {isMobile ? (
          <>
            <IconButton edge="end" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="メニュー">
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem component={RouterLink} to="/" onClick={() => setMenuAnchor(null)}>
                マップ
              </MenuItem>
              {isAdmin && [
                <MenuItem
                  key="dash"
                  onClick={() => {
                    setMenuAnchor(null);
                    navigate('/dashboard');
                  }}
                >
                  ダッシュボード
                </MenuItem>,
                <MenuItem
                  key="import"
                  onClick={() => {
                    setMenuAnchor(null);
                    navigate('/admin/import');
                  }}
                >
                  CSVインポート
                </MenuItem>,
                <MenuItem key="export" onClick={handleExport} disabled={exporting}>
                  CSVエクスポート
                </MenuItem>,
              ]}
              <Divider />
              <MenuItem disabled>{user?.name}</MenuItem>
              <MenuItem onClick={() => logout()}>ログアウト</MenuItem>
            </Menu>
          </>
        ) : (
          <>
            {isAdmin && (
              <>
                <Button size="small" component={RouterLink} to="/dashboard">
                  ダッシュボード
                </Button>
                <Button size="small" component={RouterLink} to="/admin/import">
                  CSVインポート
                </Button>
                <Button size="small" onClick={handleExport} disabled={exporting}>
                  CSVエクスポート
                </Button>
              </>
            )}
            {user && (
              <Typography variant="body2" sx={{ mx: 1 }}>
                {user.name}
              </Typography>
            )}
            <Button size="small" onClick={() => logout()}>
              ログアウト
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
