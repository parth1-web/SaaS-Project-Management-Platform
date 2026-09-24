import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes/AppRoutes';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/authApi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Bootstrap() {
  const { init, setUser, logout, isAuthenticated } = useAuthStore();
  useEffect(() => {
    init();
    if (localStorage.getItem('accessToken')) {
      authApi.me().then(setUser).catch(() => logout());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
