import { useEffect, useMemo, useState } from 'react';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { taskApi } from '../api/taskApi';
import { projectApi } from '../api/projectApi';
import type { TaskItem } from '../types';
import TaskCard from '../components/TaskCard';
import TaskDetailOffcanvas from '../components/tasks/TaskDetailOffcanvas';
import TaskFormModal, { type TaskFormValues } from '../components/tasks/TaskFormModal';
import PageHeader from '../components/ui/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToastStore } from '../store/toastStore';
import { getProjectHub } from '../utils/signalr';

const columns = [
  { status: 0, title: 'Todo' },
  { status: 1, title: 'In Progress' },
  { status: 2, title: 'Review' },
  { status: 3, title: 'Completed' },
];

export default function TaskBoard() {
  const { id: projectId = '' } = useParams();
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('');

  const projectQ = useQuery({ queryKey: ['project', projectId], queryFn: () => projectApi.get(projectId) });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', projectId, search, assignee, priority],
    queryFn: () =>
      taskApi.list(projectId, {
        search: search || undefined,
        assignee: assignee || undefined,
        priority: priority || undefined,
        page: 1,
        pageSize: 200,
      }),
  });

  useEffect(() => {
    if (!projectId) return;
    const hub = getProjectHub(projectId, {
      TaskCreated: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskUpdated: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskStatusChanged: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
      TaskAssigned: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
    });
    return () => {
      hub.stop().catch(() => undefined);
    };
  }, [projectId, qc]);

  const createMut = useMutation({
    mutationFn: (v: TaskFormValues) =>
      taskApi.create(projectId, {
        title: v.title,
        description: v.description,
        priority: v.priority,
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
        assignedTo: v.assignedTo || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setShowCreate(false);
      push('Task created successfully.');
    },
  });

  const moveMut = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: number }) => taskApi.updateStatus(taskId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      push('Task updated successfully.');
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<number, TaskItem[]>();
    for (const c of columns) map.set(c.status, []);
    for (const t of data?.items ?? []) map.get(t.status)?.push(t);
    return map;
  }, [data]);

  if (isLoading) return <LoadingState text="Loading board..." />;
  if (isError) return <ErrorState message="We couldn't load tasks." onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title={projectQ.data?.name ?? 'Task Board'}
        subtitle={projectQ.data ? `${projectQ.data.organizationName} • ${data?.totalCount ?? 0} tasks` : undefined}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} className="me-1" aria-hidden /> New Task
          </Button>
        }
      />

      <div className="d-flex gap-2 flex-wrap mb-2">
        <InputGroup size="sm" style={{ maxWidth: 240 }}>
          <InputGroup.Text aria-hidden>
            <Search size={14} />
          </InputGroup.Text>
          <Form.Control placeholder="Search" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Form.Control
          size="sm"
          style={{ maxWidth: 180 }}
          placeholder="Assignee user ID"
          aria-label="Filter by assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <Form.Select size="sm" style={{ maxWidth: 150 }} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="">Priority: All</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </Form.Select>
      </div>

      <FilterBar
        filters={[
          ...(search ? [{ key: 'search', label: 'Search', value: search }] : []),
          ...(assignee ? [{ key: 'assignee', label: 'Assignee', value: assignee }] : []),
          ...(priority ? [{ key: 'priority', label: 'Priority', value: priority }] : []),
        ]}
        onRemove={(k) => {
          if (k === 'search') setSearch('');
          if (k === 'assignee') setAssignee('');
          if (k === 'priority') setPriority('');
        }}
        onClear={() => {
          setSearch('');
          setAssignee('');
          setPriority('');
        }}
      />

      {(data?.items ?? []).length === 0 ? (
        <EmptyState title="No tasks yet" hint="Create your first task to start tracking work." action={<Button onClick={() => setShowCreate(true)}>New Task</Button>} />
      ) : (
        <div className="sm-kanban-scroll" role="list" aria-label="Kanban board">
          {columns.map((col) => (
            <section key={col.status} className="sm-kanban-col" aria-label={`${col.title} column`}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong style={{ fontSize: 12, letterSpacing: '0.05em' }}>
                  {col.title.toUpperCase()} ({grouped.get(col.status)?.length ?? 0})
                </strong>
              </div>
              {(grouped.get(col.status) ?? []).map((t) => (
                <div key={t.id} className="mb-1">
                  <TaskCard task={t} onClick={() => setSelectedTaskId(t.id)} />
                  <div className="d-flex gap-1 mb-2">
                    {col.status > 0 && (
                      <Button size="sm" variant="light" className="border" onClick={() => moveMut.mutate({ taskId: t.id, status: col.status - 1 })} aria-label={`Move ${t.title} back`}>
                        ←
                      </Button>
                    )}
                    {col.status < 3 && (
                      <Button size="sm" variant="light" className="border" onClick={() => moveMut.mutate({ taskId: t.id, status: col.status + 1 })} aria-label={`Move ${t.title} forward`}>
                        →
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <TaskFormModal
        show={showCreate}
        busy={createMut.isPending}
        onClose={() => setShowCreate(false)}
        onSubmit={(v) => createMut.mutate(v)}
      />
      <TaskDetailOffcanvas taskId={selectedTaskId} show={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </>
  );
}
