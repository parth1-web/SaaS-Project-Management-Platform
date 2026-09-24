import { useEffect, useState } from 'react';
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
  ShieldCheck,
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

function useCountUp(target: number, duration = 1300): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const BARS = [42, 68, 50, 82, 60, 92, 74];

function ProductMock() {
  const projects = useCountUp(12);
  const tasks = useCountUp(84);
  const done = useCountUp(92);
  return (
    <div className="sm-mock" aria-hidden>
      <div className="sm-mock-window">
        <div className="sm-mock-traffic">
          <i /><i /><i />
          <span className="sm-mock-url">app.saas.manager/dashboard</span>
          <span className="sm-live-dot"><span />Live</span>
        </div>
        <div className="sm-mock-kpis">
          <div className="sm-mock-kpi"><strong>{projects}</strong><span>projects</span></div>
          <div className="sm-mock-kpi"><strong>{tasks}</strong><span>tasks</span></div>
          <div className="sm-mock-kpi"><strong>{done}%</strong><span>on track</span></div>
        </div>
        <div className="sm-mock-chart">
          {BARS.map((h, i) => (
            <i key={i} style={{ height: `${h}%`, animationDelay: `${0.15 + i * 0.09}s` }} />
          ))}
        </div>
        <div className="sm-mock-board">
          {[
            { col: 'Todo', cards: ['Hero copy', 'Rate limits'] },
            { col: 'Doing', cards: ['JWT rotation'] },
            { col: 'Done', cards: ['Theme', 'Seed data'] },
          ].map((c, ci) => (
            <div key={c.col} className="sm-mock-col sm-fade-up" style={{ animationDelay: `${0.3 + ci * 0.12}s` }}>
              <span>{c.col}</span>
              {c.cards.map((t) => (
                <em key={t}>{t}</em>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthShell({
  mode,
  title,
  subtitle,
  children,
  footer,
}: {
  mode: 'login' | 'register';
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { mode: theme, setMode } = useThemeStore();
  const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  return (
    <div className="sm-auth-pro">
      <span className="sm-auth-bg-orb sm-auth-bg-orb-1" aria-hidden />
      <span className="sm-auth-bg-orb sm-auth-bg-orb-2" aria-hidden />
      <div className="sm-auth-pro-grid">
        <section className="sm-auth-showcase" aria-label="Product preview">
          <span className="d-inline-flex align-items-center gap-2 fw-bold text-white mb-3">
            <span className="sm-auth-logo sm-logo-pulse" aria-hidden>
              <Layers size={18} />
            </span>
            SaaS Manager
          </span>
          <h2 className="text-white fw-bold sm-fade-up" style={{ letterSpacing: '-0.02em', fontSize: 30 }}>
            Ship projects faster, together.
          </h2>
          <p className="sm-fade-up" style={{ color: '#cfe1fb', animationDelay: '0.08s' }}>
            Organizations, Kanban boards, realtime updates and timelines — one calm blue workspace.
          </p>
          <ProductMock />
          <div className="d-flex gap-4 mt-3 small sm-fade-up" style={{ animationDelay: '0.4s', color: '#cfe1fb' }}>
            <span className="d-inline-flex align-items-center gap-1"><FolderKanban size={13} aria-hidden /> Boards</span>
            <span className="d-inline-flex align-items-center gap-1"><KanbanSquare size={13} aria-hidden /> Realtime</span>
            <span className="d-inline-flex align-items-center gap-1"><Bell size={13} aria-hidden /> Notifications</span>
          </div>
        </section>
        <section className="sm-auth-panel">
          <div className="d-flex justify-content-end mb-2">
            <Button variant="light" size="sm" className="border" onClick={() => setMode(dark ? 'light' : 'dark')} aria-label="Toggle color theme">
              {dark ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}{' '}
              <span className="text-capitalize">{theme}</span>
            </Button>
          </div>
          <Card className="sm-card sm-auth-card-new sm-form-enter p-4 position-relative">
            <div className="sm-auth-card-glow" aria-hidden />
            <div className="sm-auth-tabs" role="tablist" aria-label="Account">
              <Link role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} to="/login">
                Sign in
              </Link>
              <Link role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} to="/register">
                Create account
              </Link>
            </div>
            <h1 className="sm-page-title mt-2" style={{ fontSize: 25 }}>{title}</h1>
            <p className="sm-page-sub mb-3">{subtitle}</p>
            {children}
            <div className="mt-3 text-center small">{footer}</div>
          </Card>
          <p className="text-center small mt-2 mb-0" style={{ color: 'var(--sm-text-3)' }}>
            <Zap size={12} aria-hidden /> Protected by JWT + refresh rotation
          </p>
        </section>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  autoComplete,
  register,
  error,
  onStrength,
}: {
  id: string;
  autoComplete: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  error?: string;
  onStrength?: (score: number) => void;
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <Form.Group className="mb-1">
      <Form.Label htmlFor={id}>Password</Form.Label>
      <InputGroup>
        <Form.Control
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...register}
          isInvalid={!!error}
          onKeyUp={(e) => {
            setCaps((e as unknown as KeyboardEvent).getModifierState?.('CapsLock') ?? false);
            if (onStrength) {
              const v = (e.target as HTMLInputElement).value;
              let s = 0;
              if (v.length >= 6) s++;
              if (v.length >= 10) s++;
              if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
              if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
              onStrength(Math.min(4, s));
            }
          }}
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
      {caps && <div className="small text-warning mt-1" role="status">Caps Lock is on</div>}
    </Form.Group>
  );
}

function StrengthMeter({ score }: { score: number }) {
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#dc3545', '#fd7e14', '#0ea5e9', '#10b981'];
  if (!score) return null;
  return (
    <div className="d-flex align-items-center gap-1 mb-3" aria-live="polite" aria-label={`Password strength: ${labels[score]}`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            height: 5, flex: 1, borderRadius: 999,
            background: i <= score ? colors[score] : 'var(--sm-border)',
            transition: 'background 0.2s ease',
          }}
        />
      ))}
      <span className="small ms-1" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

function DemoHint({ onFill }: { onFill: () => void }) {
  return (
    <Alert variant="info" className="d-flex justify-content-between align-items-center py-2 small sm-demo-flash">
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
  const [shake, setShake] = useState(0);
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
      setShake((s) => s + 1);
    }
  };

  return (
    <AuthShell
      mode="login"
      title="Welcome back"
      subtitle="Sign in to your blue workspace."
      footer={<>No account? <Link to="/register">Create one</Link></>}
    >
      <DemoHint onFill={() => { setValue('email', 'demo@saas.local'); setValue('password', 'Demo123!'); }} />
      {error && <Alert key={shake} variant="danger" role="alert" className="sm-shake">{error}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Form.Group className="mb-3">
          <Form.Label htmlFor="login-email">Work email</Form.Label>
          <Form.Control id="login-email" type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
        </Form.Group>
        <PasswordField id="login-password" autoComplete="current-password" register={register('password')} error={errors.password?.message} />
        <div className="d-flex align-items-center gap-1 small mb-3" style={{ color: 'var(--sm-text-3)' }}>
          <ShieldCheck size={13} aria-hidden /> Sessions refresh automatically for 14 days.
        </div>
        <Button type="submit" className="w-100 sm-btn-shine" disabled={isSubmitting}>
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
  const [shake, setShake] = useState(0);
  const [strength, setStrength] = useState(0);
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
      setShake((s) => s + 1);
    }
  };

  return (
    <AuthShell
      mode="register"
      title="Create your account"
      subtitle="Start managing projects in minutes."
      footer={<>Have an account? <Link to="/login">Sign in</Link></>}
    >
      {error && <Alert key={shake} variant="danger" role="alert" className="sm-shake">{error}</Alert>}
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
        <PasswordField id="reg-pass" autoComplete="new-password" register={register('password')} error={errors.password?.message} onStrength={setStrength} />
        <StrengthMeter score={strength} />
        <Button type="submit" className="w-100 sm-btn-shine" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create account →'}
        </Button>
      </form>
    </AuthShell>
  );
}
