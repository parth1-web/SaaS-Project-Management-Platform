import { useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationApi } from '../api/organizationApi';
import PageHeader from '../components/ui/PageHeader';
import { RoleBadge } from '../components/ui/Badges';
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/ui/States';
import { useToastStore } from '../store/toastStore';
import { useOrgStore } from '../store/orgStore';

const schema = z.object({
  name: z.string().min(2, 'Min 2 chars').max(100),
  description: z.string().max(500).optional(),
});

export default function Organizations() {
  const qc = useQueryClient();
  const { push } = useToastStore();
  const { setSelectedOrgId } = useOrgStore();
  const [show, setShow] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => organizationApi.list(1, 50),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (v: z.infer<typeof schema>) => organizationApi.create(v),
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ['orgs'] });
      qc.invalidateQueries({ queryKey: ['orgs-switcher'] });
      setSelectedOrgId(org.id);
      setShow(false);
      reset();
      push('Organization created successfully.');
    },
  });

  if (isLoading) return <CardSkeletonGrid count={6} />;
  if (isError) return <ErrorState message="We couldn't load organizations." onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle={`${data?.totalCount ?? 0} workspaces • switch context from the sidebar`}
        actions={
          <Button onClick={() => setShow(true)}>
            <Plus size={15} className="me-1" aria-hidden /> Create Organization
          </Button>
        }
      />
      {(data?.items ?? []).length === 0 ? (
        <EmptyState
          title="No organizations yet"
          hint="Create your first organization to start organizing your team's work."
          icon={<Building2 size={28} aria-hidden />}
          action={<Button onClick={() => setShow(true)}>Create Organization</Button>}
        />
      ) : (
        <Row className="g-3">
          {(data?.items ?? []).map((o) => (
            <Col key={o.id} xs={12} sm={6} xl={4}>
              <div className="sm-card sm-card-hover h-100 p-3 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="sm-kpi-icon" aria-hidden>
                    <Building2 size={16} />
                  </span>
                  <RoleBadge role={o.userRole} />
                </div>
                <div className="fw-bold" style={{ fontSize: 16 }}>
                  <Link to={`/organizations/${o.id}`} className="text-decoration-none text-dark stretched-link" onClick={() => setSelectedOrgId(o.id)}>
                    {o.name}
                  </Link>
                </div>
                <div className="text-muted small text-truncate-2 mb-2" style={{ minHeight: 34 }}>{o.description || 'No description'}</div>
                <div className="small text-muted mt-auto">
                  {o.memberCount} members • {o.projectCount} projects • Joined {new Date(o.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={show} onHide={() => setShow(false)} centered aria-label="Create organization">
        <Modal.Header closeButton>
          <Modal.Title>Create Organization</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit((v) => createMut.mutate(v))} noValidate>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control {...register('name')} isInvalid={!!errors.name} autoFocus />
              <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} {...register('description')} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating...' : 'Create'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}
