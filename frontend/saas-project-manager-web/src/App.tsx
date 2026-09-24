import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes/AppRoutes';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/authApi';
import { useThemeStore } from './store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20000 },
  },
});

function Bootstrap() {
  const { init, setUser, logout, isAuthenticated } = useAuthStore();
  const { mode } = useThemeStore();
  useEffect(() => {
    init();
    if (localStorage.getItem('accessToken')) {
      authApi.me().then(setUser).catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      mode === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode;
    root.setAttribute('data-bs-theme', resolved);
  }, [mode]);
  void isAuthenticated;
  return <AppRoutes />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Bootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
