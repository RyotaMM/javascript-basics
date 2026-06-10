import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import { login, resetPassword } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, authError } = useAuth();

  // ログイン済みならマップへ
  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('パスワード再設定にはメールアドレスの入力が必要です。');
      return;
    }
    try {
      await resetPassword(email.trim());
      setInfo('パスワード再設定用のメールを送信しました。');
    } catch {
      setError('再設定メールの送信に失敗しました。');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            店舗巡回CRM
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" mb={2}>
            ログイン
          </Typography>
          <form onSubmit={handleLogin}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {authError && !error && <Alert severity="warning">{authError}</Alert>}
              {info && <Alert severity="success">{info}</Alert>}
              <TextField
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                fullWidth
              />
              <TextField
                label="パスワード"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={submitting} fullWidth>
                ログイン
              </Button>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleReset}
                sx={{ alignSelf: 'center' }}
              >
                パスワードを忘れた場合
              </Link>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
