import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Moon, Sun } from 'lucide-react';
import { Form } from 'react-bootstrap';
import { Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { mode, setMode } = useThemeStore();
  const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  return (
    <div className="sm-auth-wrap">
      <Card className="sm-card sm-auth-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="d-inline-flex align-items-center gap-2 fw-bold">
            <span className="sm-kpi-icon" aria-hidden>
              <Layers size={16} />
            </span>
            SaaS Manager
          </span>
          <Button variant="light" size="sm" className="border" onClick={() => setMode(dark ? 'light' : 'dark')} aria-label="Toggle theme">
            {dark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />} {mode}
          </Button>
        </div>
        <h1 className="sm-page-title" style={{ fontSize: 26 }}>{title}</h1>
        <p className="sm-page-sub mb-3">{subtitle}</p>
        {children}
      </Card>
    </div>
  );
}

export function LoginRedesign() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setError('');
    try {
      const res = await authApi.login(data);
      setAuth(
        { id: res.userId, firstName: '', lastName: '', fullName: res.fullName, email: res.email, isActive: true, createdAt: '' },
        res.accessToken,
        res.refreshToken
      );
      const me = await authApi.me();
      setUser(me);
      navigate('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
      setError(msg);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your workspace.">
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="login-email">Email</Form.Label>
          <Form.Control id="login-email" type="email" autoComplete="email" {...register('email')} isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="login-password">Password</Form.Label>
          <Form.Control id="login-password" type="password" autoComplete="current-password" {...register('password')} isInvalid={!!errors.password} />
          <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
        </Form.Group>
        <Button type="submit" className="w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-3 text-center small">
        No account? <Link to="/register">Create one</Link>
      </div>
    </AuthShell>
  );
}

const registerSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars'),
});

export function RegisterRedesign() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setError('');
    try {
      const res = await authApi.register(data);
      setAuth(
        { id: res.userId, firstName: data.firstName, lastName: data.lastName, fullName: res.fullName, email: res.email, isActive: true, createdAt: '' },
        res.accessToken,
        res.refreshToken
      );
      const me = await authApi.me();
      setUser(me);
      navigate('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed';
      setError(msg);
    }
  };

  return (
    <AuthShell title="Create workspace account" subtitle="Start managing projects in minutes.">
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row g-2">
          <Form.Group className="col-6 mb-3">
            <Form.Label htmlFor="reg-first">First name</Form.Label>
            <Form.Control id="reg-first" {...register('firstName')} isInvalid={!!errors.firstName} />
            <Form.Control.Feedback type="invalid">{errors.firstName?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="col-6 mb-3">
            <Form.Label htmlFor="reg-last">Last name</Form.Label>
            <Form.Control id="reg-last" {...register('lastName')} isInvalid={!!errors.lastName} />
            <Form.Control.Feedback type="invalid">{errors.lastName?.message}</Form.Control.Feedback>
          </Form.Group>
        </div>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="reg-email">Email</Form.Label>
          <Form.Control id="reg-email" type="email" autoComplete="email" {...register('email')} isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="reg-pass">Password</Form.Label>
          <Form.Control id="reg-pass" type="password" autoComplete="new-password" {...register('password')} isInvalid={!!errors.password} />
          <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
        </Form.Group>
        <Button type="submit" className="w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create account'}
        </Button>
      </form>
      <div className="mt-3 text-center small">
        Have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  );
}
