import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress } from '@mui/material';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider } from './hooks/useAuth';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';

// 管理者向けの重いページ(recharts/papaparse)は遅延読込でメインバンドルから分離
const ImportPage = lazy(() => import('./pages/ImportPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
      <CircularProgress />
    </Box>
  );
}

const theme = createTheme({
  palette: { mode: 'light' },
});

const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <APIProvider apiKey={mapsApiKey}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/" element={<MapPage />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route
                  path="/admin/import"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ImportPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </APIProvider>
    </ThemeProvider>
  );
}
