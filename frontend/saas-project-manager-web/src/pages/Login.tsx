import { useState } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setError('');
    try {
      const res = await authApi.login(data);
      setAuth({ id: res.userId, firstName: '', lastName: '', fullName: res.fullName, email: res.email, isActive: true, createdAt: '' }, res.accessToken, res.refreshToken);
      const me = await authApi.me();
      setUser(me);
      navigate('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
      setError(msg);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 480 }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="mb-3">Sign in</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" {...register('email')} isInvalid={!!errors.email} />
              <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" {...register('password')} isInvalid={!!errors.password} />
              <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit" className="w-100" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </Form>
          <div className="mt-3 text-center">
            No account? <Link to="/register">Register</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
