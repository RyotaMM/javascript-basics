import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { fetchAppUser } from '../services/authService';
import { claimSession, getDeviceSessionId, watchSession } from '../services/sessionService';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** 認証は成功したがアプリ利用を拒否した理由 (ログイン画面に表示) */
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let sessionUnsub: (() => void) | null = null;
    const stopSession = () => {
      if (sessionUnsub) {
        sessionUnsub();
        sessionUnsub = null;
      }
    };

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      stopSession(); // 前のセッション監視を解除
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      let appUser = null;
      try {
        appUser = await fetchAppUser(fbUser);
      } catch (e) {
        // users ドキュメントの読み取りが Rules 等で失敗
        setAuthError(`ユーザー情報の読み取りに失敗しました: ${String(e)}`);
        setUser(null);
        await auth.signOut();
        setLoading(false);
        return;
      }
      if (!appUser) {
        setAuthError(
          `認証は成功しましたが、ユーザー情報が見つかりません。Firestore の users/${fbUser.uid} を作成してください。`,
        );
        setUser(null);
        await auth.signOut();
      } else if (appUser.disabled) {
        setAuthError('このアカウントは無効化されています。');
        setUser(null);
        await auth.signOut();
      } else {
        setAuthError(null);
        setUser(appUser);
        // 単一セッション制御: この端末をアクティブにし、他端末でのログインを監視
        const sid = getDeviceSessionId();
        try {
          await claimSession(fbUser.uid, sid);
        } catch {
          // セッション書き込み失敗は致命的でないため無視
        }
        sessionUnsub = watchSession(fbUser.uid, sid, () => {
          setAuthError('別の端末でログインされたため、ログアウトしました。');
          setUser(null);
          stopSession();
          auth.signOut();
        });
      }
      setLoading(false);
    });
    return () => {
      unsub();
      stopSession();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin: user?.role === 'admin', authError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
