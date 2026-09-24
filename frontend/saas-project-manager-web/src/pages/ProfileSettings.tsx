import { Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { Bell, Moon, ShieldCheck, User as UserIcon } from 'lucide-react';
import { authApi } from '../api/authApi';
import { Avatar } from '../components/ui/Avatar';
import PageHeader from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useThemeStore, type ThemeMode } from '../store/themeStore';
import { useState } from 'react';

export function Profile() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() });
  if (isLoading) return <LoadingState text="Loading profile..." />;
  if (isError || !data) return <ErrorState message="We couldn't load your profile." onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader title="Profile" subtitle="Personal information and account status." />
      <Row className="g-3">
        <Col xs={12} xl={4}>
          <Card className="sm-card text-center p-4">
            <div className="d-flex justify-content-center mb-2">
              <Avatar name={data.fullName} size={72} />
            </div>
            <h5 className="mb-0">{data.fullName}</h5>
            <div className="text-muted small mb-2">{data.email}</div>
            <Badge bg={data.isActive ? 'success' : 'secondary'}>{data.isActive ? 'Active' : 'Inactive'}</Badge>
          </Card>
        </Col>
        <Col xs={12} xl={8}>
          <Card className="sm-card mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-2">
                <UserIcon size={16} aria-hidden /> <strong>Personal Information</strong>
              </div>
              <Row className="g-2 small">
                <Col sm={6}><Form.Label>First Name</Form.Label><Form.Control value={data.firstName} disabled aria-label="First name" /></Col>
                <Col sm={6}><Form.Label>Last Name</Form.Label><Form.Control value={data.lastName} disabled aria-label="Last name" /></Col>
                <Col sm={12}><Form.Label>Email</Form.Label><Form.Control value={data.email} disabled aria-label="Email" /></Col>
                <Col sm={6}><Form.Label>Joined</Form.Label><Form.Control value={new Date(data.createdAt).toLocaleString()} disabled aria-label="Joined date" /></Col>
                <Col sm={6}><Form.Label>User ID</Form.Label><Form.Control value={data.id} disabled aria-label="User ID" /></Col>
              </Row>
            </Card.Body>
          </Card>
          <Card className="sm-card">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-1">
                <ShieldCheck size={16} aria-hidden /> <strong>Session / Security</strong>
              </div>
              <p className="small text-muted mb-0">
                JWT access token (60 min) + rotating refresh token (14 days). Tokens are stored locally and refreshed automatically by the Axios client.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export function Settings() {
  const { mode, setMode } = useThemeStore();
  const [emailNotif, setEmailNotif] = useState(localStorage.getItem('sm-notif-email') === '1');
  const [pushNotif, setPushNotif] = useState(localStorage.getItem('sm-notif-push') !== '0');

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace preferences." />
      <Row className="g-3">
        <Col xs={12} xl={6}>
          <Card className="sm-card">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Moon size={16} aria-hidden /> <strong>Appearance</strong>
              </div>
              <Form.Group aria-label="Appearance">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                  <Form.Check
                    key={m}
                    type="radio"
                    id={`theme-${m}`}
                    label={m[0].toUpperCase() + m.slice(1)}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                  />
                ))}
              </Form.Group>
              <p className="small text-muted mt-2 mb-0">
                Proper dark theme with dark surfaces, borders and light text — not a color inversion. Preference persists in localStorage.
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} xl={6}>
          <Card className="sm-card mb-3">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Bell size={16} aria-hidden /> <strong>Notifications</strong>
              </div>
              <Form.Check
                type="switch"
                id="notif-push"
                label="Realtime + polling updates"
                checked={pushNotif}
                onChange={(e) => {
                  setPushNotif(e.target.checked);
                  localStorage.setItem('sm-notif-push', e.target.checked ? '1' : '0');
                }}
              />
              <Form.Check
                type="switch"
                id="notif-email"
                label="Email digests (placeholder)"
                checked={emailNotif}
                onChange={(e) => {
                  setEmailNotif(e.target.checked);
                  localStorage.setItem('sm-notif-email', e.target.checked ? '1' : '0');
                }}
              />
            </Card.Body>
          </Card>
          <Card className="sm-card">
            <Card.Body>
              <strong>Environment</strong>
              <p className="small text-muted mb-0">API: {import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}</p>
              <div className="mt-2">
                <Button size="sm" variant="light" className="border" onClick={() => localStorage.clear()}>
                  Clear local session
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
