import { useState } from 'react';
import { Alert, Button, Card, Form, InputGroup } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  KanbanSquare,
  Layers,
  Moon,
  Sun,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Enter a valid work email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

function BrandPanel() {
  return (
    <div className="sm-auth-brand p-4 p-lg-5 d-flex flex-column">
      <span className="d-inline-flex align-items-center gap-2 fw-bold text-white mb-4">
        <span className="sm-auth-logo" aria-hidden>
          <Layers size={18} />
        </span>
        SaaS Manager
      </span>
      <h2 className="text-white fw-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
        Ship projects faster, together.
      </h2>
      <p className="mb-4" style={{ color: '#cfe1fb' }}>
        Organizations, Kanban boards, realtime updates and activity timelines — one calm blue workspace.
      </p>
      <ul className="list-unstyled d-flex flex-column gap-3 mb-4">
        <li className="d-flex gap-2 align-items-start">
          <FolderKanban size={17} className="mt-1 flex-shrink-0" aria-hidden />
          <span><strong>Projects & boards</strong><br /><span style={{ color: '#cfe1fb' }}>Grid or list, progress bars, deadlines.</span></span>
        </li>
        <li className="d-flex gap-2 align-items-start">
          <KanbanSquare size={17} className="mt-1 flex-shrink-0" aria-hidden />
          <span><strong>Kanban that stays live</strong><br /><span style={{ color: '#cfe1fb' }}>SignalR status moves, no refresh needed.</span></span>
        </li>
        <li className="d-flex gap-2 align-items-start">
          <Bell size={17} className="mt-1 flex-shrink-0" aria-hidden />
          <span><strong>Never miss a beat</strong><br /><span style={{ color: '#cfe1fb' }}>Assignments, comments and due-date nudges.</span></span>
        </li>
      </ul>
      <div className="d-flex gap-4 mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <span><strong className="text-white">2</strong> <span style={{ color: '#cfe1fb' }}>demo orgs</span></span>
        <span><strong className="text-white">3</strong> <span style={{ color: '#cfe1fb' }}>projects</span></span>
        <span><strong className="text-white">12</strong> <span style={{ color: '#cfe1fb' }}>tasks</span></span>
      </div>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { mode, setMode } = useThemeStore();
  const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  return (
    <div className="sm-auth-split">
      <BrandPanel />
      <div className="sm-auth-form-side">
        <div className="d-flex justify-content-end mb-2">
          <Button
            variant="light"
            size="sm"
            className="border"
            onClick={() => setMode(dark ? 'light' : 'dark')}
            aria-label="Toggle color theme"
          >
            {dark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}{' '}
            <span className="text-capitalize">{mode}</span>
          </Button>
        </div>
        <Card className="sm-card sm-auth-form-card p-4">
          <h1 className="sm-page-title" style={{ fontSize: 26 }}>{title}</h1>
          <p className="sm-page-sub mb-3">{subtitle}</p>
          {children}
          <div className="mt-3 text-center small">{footer}</div>
        </Card>
        <p className="text-center small mt-3 mb-0" style={{ color: 'var(--sm-text-3)' }}>
          <Zap size={12} aria-hidden /> Protected by JWT + refresh rotation
        </p>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  autoComplete,
  register,
  error,
}: {
  id: string;
  autoComplete: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Form.Group className="mb-3">
      <Form.Label htmlFor={id}>Password</Form.Label>
      <InputGroup>
        <Form.Control
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...register}
          isInvalid={!!error}
        />
        <Button
          variant="outline-secondary"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        </Button>
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      </InputGroup>
    </Form.Group>
  );
}

function DemoHint({ onFill }: { onFill: () => void }) {
  return (
    <Alert variant="info" className="d-flex justify-content-between align-items-center py-2 small">
      <span>
        <CheckCircle2 size={13} className="me-1" aria-hidden />
        Demo: <code>demo@saas.local</code> / <code>Demo123!</code>
      </span>
      <Button size="sm" variant="outline-primary" onClick={onFill}>
        Fill
      </Button>
    </Alert>
  );
}

export function LoginRedesign() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
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
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed — check your email and password.';
      setError(msg);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your blue workspace."
      footer={<>No account? <Link to="/register">Create one</Link></>}
    >
      <DemoHint onFill={() => { setValue('email', 'demo@saas.local'); setValue('password', 'Demo123!'); }} />
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="login-email">Work email</Form.Label>
          <Form.Control id="login-email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
        </Form.Group>
        <PasswordField id="login-password" autoComplete="current-password" register={register('password')} error={errors.password?.message} />
        <Button type="submit" className="w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in →'}
        </Button>
      </form>
    </AuthShell>
  );
}

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
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed — try another email.';
      setError(msg);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start managing projects in minutes."
      footer={<>Have an account? <Link to="/login">Sign in</Link></>}
    >
      {error && <Alert variant="danger" role="alert">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="row g-2">
          <Form.Group className="col-6 mb-3">
            <Form.Label htmlFor="reg-first">First name</Form.Label>
            <Form.Control id="reg-first" autoComplete="given-name" placeholder="Ada" {...register('firstName')} isInvalid={!!errors.firstName} />
            <Form.Control.Feedback type="invalid">{errors.firstName?.message}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="col-6 mb-3">
            <Form.Label htmlFor="reg-last">Last name</Form.Label>
            <Form.Control id="reg-last" autoComplete="family-name" placeholder="Lovelace" {...register('lastName')} isInvalid={!!errors.lastName} />
            <Form.Control.Feedback type="invalid">{errors.lastName?.message}</Form.Control.Feedback>
          </Form.Group>
        </div>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="reg-email">Work email</Form.Label>
          <Form.Control id="reg-email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
        </Form.Group>
        <PasswordField id="reg-pass" autoComplete="new-password" register={register('password')} error={errors.password?.message} />
        <Button type="submit" className="w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create account →'}
        </Button>
      </form>
    </AuthShell>
  );
}
