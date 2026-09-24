import { useMemo, useState } from 'react';
import { Button, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownWideNarrow, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { projectApi } from '../api/projectApi';
import { organizationApi } from '../api/organizationApi';
import { ProjectStatusLabels } from '../types';
import { useOrgStore } from '../store/orgStore';
import { useToastStore } from '../store/toastStore';
import PageHeader from '../components/ui/PageHeader';
import ProjectCard from '../components/ui/ProjectCard';
import FilterBar from '../components/ui/FilterBar';
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/ui/States';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderKanban } from 'lucide-react';

const schema = z.object({
  organizationId: z.string().min(1, 'Organization required'),
  name: z.string().min(2, 'Min 2 chars').max(150),
  description: z.string().max(1000).optional(),
  status: z.number().min(0).max(3),
});

type FormValues = z.infer<typeof schema>;

export default function Projects() {
  const qc = useQueryClient();
  const { push } = useToastStore();
  const { selectedOrgId } = useOrgStore();
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<'newest' | 'name' | 'progress'>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: () => organizationApi.list(1, 50) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', selectedOrgId],
    queryFn: () => projectApi.list(selectedOrgId ?? undefined, 1, 100),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { organizationId: selectedOrgId ?? '', name: '', description: '', status: 1 },
  });

  const createMut = useMutation({
    mutationFn: (v: FormValues) => projectApi.create(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShow(false);
      reset();
      push('Project created successfully.');
    },
  });

  const filtered = useMemo(() => {
    let items = data?.items ?? [];
    if (search.trim()) items = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) items = items.filter((p) => ProjectStatusLabels[p.status] === statusFilter);
    items = [...items].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'progress') {
        const pa = a.taskCount ? a.completedTasks / a.taskCount : 0;
        const pb = b.taskCount ? b.completedTasks / b.taskCount : 0;
        return pb - pa;
      }
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return items;
  }, [data, search, statusFilter, sort]);

  if (isLoading) return <CardSkeletonGrid count={6} />;
  if (isError) return <ErrorState message="We couldn't load your projects." onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Manage and track all your projects."
        actions={
          <Button onClick={() => setShow(true)}>
            <Plus size={15} className="me-1" aria-hidden /> New Project
          </Button>
        }
      />

      <div className="d-flex gap-2 flex-wrap mb-2">
        <InputGroup size="sm" style={{ maxWidth: 260 }}>
          <InputGroup.Text aria-hidden>
            <Search size={14} />
          </InputGroup.Text>
          <Form.Control placeholder="Search projects..." aria-label="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Form.Select size="sm" style={{ maxWidth: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">Status: All</option>
          {ProjectStatusLabels.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Form.Select>
        <Form.Select size="sm" style={{ maxWidth: 150 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort projects">
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
          <option value="progress">Sort: Progress</option>
        </Form.Select>
        <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
          <Button variant={view === 'grid' ? 'primary' : 'light'} className="border" onClick={() => setView('grid')} aria-label="Grid view" title="Grid view">
            <LayoutGrid size={14} aria-hidden />
          </Button>
          <Button variant={view === 'list' ? 'primary' : 'light'} className="border" onClick={() => setView('list')} aria-label="List view" title="List view">
            <List size={14} aria-hidden />
          </Button>
        </div>
        <span className="small text-muted ms-auto d-inline-flex align-items-center gap-1">
          <ArrowDownWideNarrow size={13} aria-hidden /> {filtered.length} projects
        </span>
      </div>

      <FilterBar
        filters={[
          ...(statusFilter ? [{ key: 'status', label: 'Status', value: statusFilter }] : []),
          ...(search ? [{ key: 'search', label: 'Search', value: search }] : []),
        ]}
        onRemove={(k) => {
          if (k === 'status') setStatusFilter('');
          if (k === 'search') setSearch('');
        }}
        onClear={() => {
          setStatusFilter('');
          setSearch('');
        }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Create your first project to start organizing your team's work."
          icon={<FolderKanban size={28} aria-hidden />}
          action={
            <Button onClick={() => setShow(true)}>
              <Plus size={15} className="me-1" aria-hidden /> Create Project
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <Row className="g-3">
          {filtered.map((p) => (
            <Col key={p.id} xs={12} sm={6} xl={4}>
              <ProjectCard project={p} />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="sm-card p-2">
          {filtered.map((p) => (
            <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom p-2">
              <div>
                <div className="fw-semibold">{p.name}</div>
                <div className="small text-muted">{p.organizationName} • {p.taskCount} tasks</div>
              </div>
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-primary" href={`/projects/${p.id}`}>
                  Details
                </Button>
                <Button size="sm" variant="primary" href={`/projects/${p.id}/tasks`}>
                  Board
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Project</Modal.Title>
        </Modal.Header>
        <form
          onSubmit={handleSubmit((v) => createMut.mutate(v))}
          noValidate
        >
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Organization</Form.Label>
              <Form.Select {...register('organizationId')} isInvalid={!!errors.organizationId} aria-label="Organization">
                <option value="">Select...</option>
                {orgs?.items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.organizationId?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control {...register('name')} isInvalid={!!errors.name} />
              <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} {...register('description')} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select {...register('status', { valueAsNumber: true })}>
                {ProjectStatusLabels.map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMut.isPending}>
              {createMut.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}
