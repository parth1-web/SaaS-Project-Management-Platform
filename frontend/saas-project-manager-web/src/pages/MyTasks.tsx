import { Card, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { taskApi } from '../api/taskApi';
import PageHeader from '../components/ui/PageHeader';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Link } from 'react-router-dom';

export default function MyTasks() {
  const meQ = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() });
  const tasksQ = useQuery({
    queryKey: ['my-tasks', meQ.data?.id],
    queryFn: () => taskApi.search({ assignee: meQ.data!.id, page: 1, pageSize: 50 }),
    enabled: !!meQ.data?.id,
  });

  if (meQ.isLoading || tasksQ.isLoading) return <LoadingState text="Loading your tasks..." />;
  if (meQ.isError || tasksQ.isError)
    return <ErrorState message="We couldn't load your tasks." onRetry={() => { meQ.refetch(); tasksQ.refetch(); }} />;

  const items = tasksQ.data?.items ?? [];

  return (
    <>
      <PageHeader title="My Tasks" subtitle={`${items.length} assigned to you across all projects`} />
      {items.length === 0 ? (
        <EmptyState title="No tasks assigned" hint="Tasks assigned to you will show up here." />
      ) : (
        <Card className="sm-card">
          <div className="table-responsive">
            <Table hover className="sm-table mb-0">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tasks/${t.id}`} className="fw-semibold text-decoration-none">
                        {t.title}
                      </Link>
                    </td>
                    <td className="text-muted">{t.projectName}</td>
                    <td className="text-muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}
