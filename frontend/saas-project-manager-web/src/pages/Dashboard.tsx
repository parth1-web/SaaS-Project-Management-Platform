import { useMemo } from 'react';
import { Badge, Card, Col, Row, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, CheckCircle2, FolderKanban, ListTodo, TriangleAlert } from 'lucide-react';
import { dashboardApi } from '../api/miscApi';
import { projectApi } from '../api/projectApi';
import { taskApi } from '../api/taskApi';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { CardSkeletonGrid, EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { organizationApi } from '../api/organizationApi';

const COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();

  const statsQ = useQuery({
    queryKey: ['dashboard', selectedOrgId],
    queryFn: () => dashboardApi.stats(selectedOrgId ?? undefined),
  });
  const projectsQ = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => projectApi.list(selectedOrgId ?? undefined, 1, 6),
  });
  const upcomingQ = useQuery({
    queryKey: ['dashboard-upcoming'],
    queryFn: () => taskApi.search({ page: 1, pageSize: 8 }),
  });
  const activityQ = useQuery({
    queryKey: ['dashboard-activity', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const res = await organizationApi.activity(selectedOrgId, 1, 8);
      return res.items;
    },
    enabled: !!selectedOrgId,
  });

  const upcoming = useMemo(() => {
    const items = upcomingQ.data?.items ?? [];
    return [...items]
      .filter((t) => t.status !== 3)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return +new Date(a.dueDate) - +new Date(b.dueDate);
      })
      .slice(0, 6);
  }, [upcomingQ.data]);

  if (statsQ.isLoading) return <CardSkeletonGrid count={4} />;
  if (statsQ.isError || !statsQ.data)
    return <ErrorState message="We couldn't load your workspace." onRetry={() => statsQ.refetch()} />;

  const d = statsQ.data;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.firstName || user?.fullName?.split(' ')[0] || 'there'}`}
        subtitle="Here's what's happening across your workspace."
      />

      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon={<FolderKanban size={18} />} value={d.totalProjects} label="Projects" sub={`${d.totalOrganizations} organizations`} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon={<ListTodo size={18} />} value={d.totalTasks} label="Tasks" sub={`${d.pendingTasks} pending`} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon={<CheckCircle2 size={18} />} value={d.completedTasks} label="Completed" sub="All time" />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard icon={<TriangleAlert size={18} />} value={d.overdueTasks} label="Overdue" sub="Needs attention" />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xs={12} xl={8}>
          <Card className="sm-card h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>Task Overview</strong>
                <Badge bg="light" text="dark" className="border fw-normal">
                  {d.totalTasks} total
                </Badge>
              </div>
              <div style={{ height: 260 }} role="img" aria-label="Tasks by status chart">
                <ResponsiveContainer>
                  <BarChart data={d.tasksByStatus} margin={{ left: -12 }}>
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {d.tasksByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ height: 180 }} className="mt-2" role="img" aria-label="Tasks by priority chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={d.tasksByPriority} dataKey="count" nameKey="priority" outerRadius={70} label={{ fontSize: 11 }}>
                      {d.tasksByPriority.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} xl={4}>
          <Card className="sm-card h-100">
            <Card.Body>
              <strong>Recent Activity</strong>
              <div className="mt-3">
                {activityQ.isLoading ? (
                  <LoadingState text="Loading activity..." />
                ) : (activityQ.data ?? []).length ? (
                  <ActivityTimeline items={activityQ.data ?? []} />
                ) : (
                  <EmptyState title="No recent activity" hint="Create a project or task to get started." />
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="sm-card">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>My Upcoming Tasks</strong>
            <span className="small text-muted d-inline-flex align-items-center gap-1">
              <CalendarClock size={13} aria-hidden /> sorted by due date
            </span>
          </div>
          {upcomingQ.isLoading ? (
            <LoadingState text="Loading tasks..." />
          ) : upcoming.length === 0 ? (
            <EmptyState title="Nothing due" hint="You're all caught up." />
          ) : (
            <div className="table-responsive">
              <Table hover className="sm-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.title}</td>
                      <td className="text-muted">{t.projectName}</td>
                      <td className="text-muted">{t.assigneeName ?? '—'}</td>
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
          )}
          {projectsQ.data && projectsQ.data.items.length > 0 && (
            <div className="small text-muted mt-2">
              Tracking {projectsQ.data.totalCount} projects
            </div>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
