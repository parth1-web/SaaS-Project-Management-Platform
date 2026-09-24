import { Card } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { LoadingSpinner, ErrorAlert } from '../components/Feedback';

export function Profile() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() });
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert message="Failed to load profile" onRetry={() => refetch()} />;
  return (
    <>
      <h3 className="mb-3">Profile</h3>
      <Card className="shadow-sm"><Card.Body>
        <div><strong>Name:</strong> {data?.fullName}</div>
        <div><strong>Email:</strong> {data?.email}</div>
        <div><strong>Joined:</strong> {data?.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}</div>
      </Card.Body></Card>
    </>
  );
}

export function Settings() {
  return (
    <>
      <h3 className="mb-3">Settings</h3>
      <Card className="shadow-sm"><Card.Body>
        <p className="text-muted">API URL: {import.meta.env.VITE_API_URL ?? 'http://localhost:5000'}</p>
        <p className="text-muted">Frontend uses Bootstrap + React-Bootstrap. No Tailwind.</p>
        <p className="text-muted">Notifications poll every 30s; SignalR for realtime task updates.</p>
      </Card.Body></Card>
    </>
  );
}
