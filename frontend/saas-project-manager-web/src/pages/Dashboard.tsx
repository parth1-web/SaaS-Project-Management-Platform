import { useMemo } from 'react';
import { Badge, Card, Col, ProgressBar, Row, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CalendarClock, CheckCircle2, FolderKanban, ListTodo, Sparkles, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/miscApi';
import { projectApi } from '../api/projectApi';
import { taskApi } from '../api/taskApi';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import { useThemeStore } from '../store/themeStore';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { CardSkeletonGrid, EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { organizationApi } from '../api/organizationApi';

const BAR_COLORS = ['#2563eb', '#0ea5e9', '#38bdf8', '#1e40af'];
const PIE_COLORS = ['#2563eb', '#0ea5e9', '#f59e0b', '#10b981'];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function duePill(due?: string): { text: string; cls: string } {
  if (!due) return { text: 'No date', cls: 'sm-due-none' };
  const d = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `Overdue · ${d.toLocaleDateString()}`, cls: 'sm-due-over' };
  if (diff === 0) return { text: 'Today', cls: 'sm-due-today' };
  if (diff === 1) return { text: 'Tomorrow', cls: 'sm-due-soon' };
  return { text: d.toLocaleDateString(), cls: 'sm-due-ok' };
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { selectedOrgId } = useOrgStore();
  const { mode } = useThemeStore();
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const axisTick = dark ? '#a9c1e3' : '#45608a';
  const gridStroke = dark ? '#1e3a66' : '#d7e3f5';
  const tooltipStyle = dark
    ? { backgroundColor: '#0d1c38', border: '1px solid #2c4f89', borderRadius: 8, color: '#e3eefc', fontSize: 12 }
    : { backgroundColor: '#ffffff', border: '1px solid #d7e3f5', borderRadius: 8, color: '#0f2447', fontSize: 12 };

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
  const completion = d.totalTasks ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0;
  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <section className="sm-dash-hero p-3 p-md-4 mb-3" aria-label="Workspace overview">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div className="d-inline-flex align-items-center gap-1 small mb-1" style={{ opacity: 0.9 }}>
              <Sparkles size={13} aria-hidden /> {today}
            </div>
            <h1 className="sm-page-title text-white">
              {greeting()}, {firstName}
            </h1>
            <p className="mb-0 mt-1" style={{ color: '#dbeafe' }}>
              {d.totalProjects} projects · {d.pendingTasks} pending · {d.overdueTasks} overdue — completion {completion}%.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/projects" className="btn btn-light btn-sm fw-semibold">
              View projects <ArrowRight size={13} aria-hidden />
            </Link>
            <Link to="/my-tasks" className="btn btn-outline-light btn-sm">
              My tasks
            </Link>
          </div>
        </div>
        <div className="mt-3" style={{ maxWidth: 420 }}>
          <div className="d-flex justify-content-between small mb-1" style={{ color: '#dbeafe' }}>
            <span>Workspace completion</span>
            <span>{completion}%</span>
          </div>
          <ProgressBar now={completion} style={{ height: 7 }} variant="light" aria-label={`Workspace completion ${completion}%`} />
        </div>
      </section>

      <PageHeader title="Command center" subtitle="Live metrics across your workspace." />

      <Row className="g-3 mb-3">
        <Col xs={12} sm={6} xl={3}>
          <StatCard tone="blue" icon={<FolderKanban size={18} />} value={d.totalProjects} label="Projects" sub={`${d.totalOrganizations} organizations`} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard tone="sky" icon={<ListTodo size={18} />} value={d.totalTasks} label="Tasks" sub={`${d.pendingTasks} pending`} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard tone="green" icon={<CheckCircle2 size={18} />} value={d.completedTasks} label="Completed" sub={`${completion}% done`} />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <StatCard tone="amber" icon={<TriangleAlert size={18} />} value={d.overdueTasks} label="Overdue" sub="Needs attention" />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xs={12} xl={8}>
          <Card className="sm-card sm-card-blue h-100">
            <Card.Body>
              <div className="sm-card-head mb-2">
                <strong>Task Overview</strong>
                <Badge bg="primary" className="fw-normal">
                  {d.totalTasks} total
                </Badge>
              </div>
              <div style={{ height: 250 }} role="img" aria-label="Tasks by status chart">
                <ResponsiveContainer>
                  <BarChart data={d.tasksByStatus} margin={{ left: -12, right: 8 }}>
                    <defs>
                      <linearGradient id="smBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 12, fill: axisTick }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisTick }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="url(#smBar)" radius={[7, 7, 0, 0]} maxBarSize={44}>
                      {d.tasksByStatus.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ height: 180 }} className="mt-1" role="img" aria-label="Tasks by priority chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={d.tasksByPriority}
                      dataKey="count"
                      nameKey="priority"
                      outerRadius={72}
                      innerRadius={40}
                      paddingAngle={3}
                      label={{ fontSize: 11, fill: axisTick }}
                      strokeWidth={0}
                    >
                      {d.tasksByPriority.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} xl={4}>
          <Card className="sm-card sm-card-blue h-100">
            <Card.Body>
              <div className="sm-card-head">
                <strong>Recent Activity</strong>
                <Link to="/activity" className="small">
                  View all <ArrowRight size={12} aria-hidden />
                </Link>
              </div>
              <div className="mt-3">
                {activityQ.isLoading ? (
                  <LoadingState text="Loading activity..." />
                ) : (activityQ.data ?? []).length ? (
                  <ActivityTimeline items={activityQ.data ?? []} />
                ) : (
                  <EmptyState title="No recent activity" hint="Select an organization to see its timeline, or create a task." />
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="sm-card sm-card-blue">
        <Card.Body>
          <div className="sm-card-head mb-2">
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
                  {upcoming.map((t) => {
                    const pill = duePill(t.dueDate);
                    return (
                      <tr key={t.id}>
                        <td className="fw-semibold">
                          <Link to={`/tasks/${t.id}`} className="text-decoration-none">
                            {t.title}
                          </Link>
                        </td>
                        <td className="text-muted">{t.projectName}</td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1 text-muted">
                            {t.assigneeName && <Avatar name={t.assigneeName} size={22} />}
                            {t.assigneeName ?? '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`sm-due-pill ${pill.cls}`}>{pill.text}</span>
                        </td>
                        <td>
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                        </td>
                      </tr>
                    );
                  })}
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
