import { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 chars'),
});

export default function Register() {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setError('');
    try {
      const res = await authApi.register(data);
      setAuth({ id: res.userId, firstName: data.firstName, lastName: data.lastName, fullName: res.fullName, email: res.email, isActive: true, createdAt: '' }, res.accessToken, res.refreshToken);
      const me = await authApi.me();
      setUser(me);
      navigate('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed';
      setError(msg);
    }
  };

  return (
    <Container className="py-5" style={{ maxWidth: 560 }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h3 className="mb-3">Create account</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit(onSubmit)}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First name</Form.Label>
                  <Form.Control {...register('firstName')} isInvalid={!!errors.firstName} />
                  <Form.Control.Feedback type="invalid">{errors.firstName?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last name</Form.Label>
                  <Form.Control {...register('lastName')} isInvalid={!!errors.lastName} />
                  <Form.Control.Feedback type="invalid">{errors.lastName?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
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
              {isSubmitting ? 'Creating...' : 'Register'}
            </Button>
          </Form>
          <div className="mt-3 text-center">
            Have an account? <Link to="/login">Sign in</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
