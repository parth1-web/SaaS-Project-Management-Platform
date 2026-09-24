import { useState } from 'react';
import { Row, Col, Card, Button, Modal, Form, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { organizationApi } from '../api/organizationApi';
import { LoadingSpinner, ErrorAlert, EmptyState } from '../components/Feedback';

export default function Organizations() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => organizationApi.list(1, 20),
  });

  const createMut = useMutation({
    mutationFn: () => organizationApi.create({ name, description: desc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgs'] });
      setShow(false);
      setName('');
      setDesc('');
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert message="Failed to load organizations" onRetry={() => refetch()} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Organizations</h3>
        <Button onClick={() => setShow(true)}>New Organization</Button>
      </div>
      {!data?.items.length ? (
        <EmptyState title="No organizations found." hint="Create your first organization." />
      ) : (
        <Row className="g-3">
          {data.items.map((o) => (
            <Col key={o.id} md={6} lg={4}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>{o.name}</Card.Title>
                  <Card.Text className="text-muted">{o.description || 'No description'}</Card.Text>
                  <div className="d-flex gap-2 mb-3">
                    <Badge bg="info">{o.userRole}</Badge>
                    <Badge bg="secondary">{o.memberCount} members</Badge>
                    <Badge bg="secondary">{o.projectCount} projects</Badge>
                  </div>
                  <Link to={`/organizations/${o.id}`} className="btn btn-outline-primary btn-sm">
                    View details
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton><Modal.Title>New Organization</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
          <Button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>
            {createMut.isPending ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
