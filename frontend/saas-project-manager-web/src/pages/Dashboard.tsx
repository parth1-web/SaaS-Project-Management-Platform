import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, ProgressBar, Row, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieSectorDataItem, TooltipContentProps } from 'recharts';
import { ArrowRight, CalendarClock, CheckCircle2, FolderKanban, ListTodo, Sparkles, TriangleAlert, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi, demoApi } from '../api/miscApi';
import { projectApi } from '../api/projectApi';
import { taskApi } from '../api/taskApi';
import { useAuthStore } from '../store/authStore';
import { useOrgStore } from '../store/orgStore';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { CardSkeletonGrid, EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import ActivityTimeline from '../components/ui/ActivityTimeline';
import { PriorityBadge, StatusBadge } from '../components/ui/Badges';
import { Avatar } from '../components/ui/Avatar';
import { organizationApi } from '../api/organizationApi';
import { useToastStore } from '../store/toastStore';

type ChartDatum = { status?: string; priority?: string; count?: number };

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748b',
  inprogress: '#2563eb',
  review: '#f59e0b',
  completed: '#10b981',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',
  medium: '#0ea5e9',
  high: '#f59e0b',
  urgent: '#ef4444',
};

function colorFor(map: Record<string, string>, name: string, index: number): string {
  return map[name.toLowerCase()] ?? ['#2563eb', '#0ea5e9', '#f59e0b', '#10b981'][index % 4];
}

function ChartTooltip({ active, payload, total }: TooltipContentProps & { total: number }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const datum = (entry?.payload ?? {}) as ChartDatum;
  const label = datum.status ?? datum.priority ?? String(entry?.name ?? '');
  const value = Number(entry?.value ?? 0);
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="sm-chart-tooltip">
      <div className="sm-chart-tooltip-label">{label}</div>
      <div className="sm-chart-tooltip-row">
        <span>Tasks</span>
        <b>{value}</b>
        <span className="sm-chart-legend-pct">{pct}%</span>
      </div>
    </div>
  );
}

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
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();
  const qc = useQueryClient();
  const { push } = useToastStore();
  const [hoverPriority, setHoverPriority] = useState<number | null>(null);

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

  const seedMut = useMutation({
    mutationFn: () => demoApi.seed(),
    onSuccess: (res) => {
      setSelectedOrgId(res.organizationId);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['orgs'] });
      qc.invalidateQueries({ queryKey: ['orgs-switcher'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread'] });
      push(res.seeded ? 'Demo workspace loaded.' : 'Demo workspace already exists.');
    },
    onError: () => push('Could not load demo data.', 'danger'),
  });

  const upcoming = useMemo(() => {    const items = upcomingQ.data?.items ?? [];
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

  const statusData = d.tasksByStatus;
  const priorityData = d.tasksByPriority;
  const statusTotal = statusData.reduce((sum, s) => sum + s.count, 0);
  const priorityTotal = priorityData.reduce((sum, p) => sum + p.count, 0);
  const statusMax = statusData.length ? Math.ceil((Math.max(...statusData.map((s) => s.count)) * 1.25) || 1) : 1;
  const activeSector = (props: PieSectorDataItem) => (
    <Sector
      cx={props.cx}
      cy={props.cy}
      innerRadius={props.innerRadius}
      outerRadius={Math.min((props.outerRadius ?? 0) + 7, 88)}
      startAngle={props.startAngle}
      endAngle={props.endAngle}
      cornerRadius={props.cornerRadius}
      fill={props.fill}
    />
  );

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

      <PageHeader
        title="Command center"
        subtitle="Live metrics across your workspace."
        actions={
          d.totalProjects === 0 && d.totalTasks === 0 ? (
            <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              <WandSparkles size={14} className="me-1" aria-hidden />
              {seedMut.isPending ? 'Loading demo data...' : 'Load demo data'}
            </Button>
          ) : undefined
        }
      />

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
                <div>
                  <strong>Task distribution</strong>
                  <div className="sm-chart-sub">Live breakdown across your workspace</div>
                </div>
                <Badge bg="primary" className="fw-normal">
                  {d.totalTasks} total
                </Badge>
              </div>
              {statusTotal === 0 ? (
                <EmptyState title="No task data yet" hint="Create a task to populate the distribution charts." />
              ) : (
                <>
                  <div className="sm-chart-title">Tasks by status</div>
                  <div className="sm-chart-bar" role="img" aria-label="Tasks by status chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ top: 20, right: 10, bottom: 2, left: 0 }} barCategoryGap="30%">
                        <defs>
                          {statusData.map((s, i) => (
                            <linearGradient key={s.status} id={`smBarGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colorFor(STATUS_COLORS, s.status, i)} />
                              <stop offset="100%" stopColor={colorFor(STATUS_COLORS, s.status, i)} stopOpacity={0.55} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid stroke="var(--sm-border)" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="status"
                          interval={0}
                          tick={{ fontSize: 12, fill: 'var(--sm-text-2)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          domain={[0, statusMax]}
                          tick={{ fontSize: 12, fill: 'var(--sm-text-2)' }}
                          axisLine={false}
                          tickLine={false}
                          width={34}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--sm-primary-soft)' }}
                          content={(props) => <ChartTooltip {...props} total={statusTotal} />}
                        />
                        <Bar
                          dataKey="count"
                          name="Tasks"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={46}
                          background={{ fill: 'var(--sm-surface-2)', radius: 8 }}
                          animationDuration={800}
                        >
                          {statusData.map((s, i) => (
                            <Cell key={s.status} fill={`url(#smBarGrad-${i})`} />
                          ))}
                          <LabelList dataKey="count" position="top" offset={10} fill="var(--sm-text-2)" fontSize={11} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="sm-chart-title mt-1">Tasks by priority</div>
                  <div className="sm-chart-donut">
                    <div className="sm-chart-donut-plot" role="img" aria-label="Tasks by priority chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={priorityData}
                            dataKey="count"
                            nameKey="priority"
                            innerRadius={48}
                            outerRadius={76}
                            paddingAngle={2}
                            cornerRadius={5}
                            stroke="none"
                            animationDuration={800}
                            activeShape={activeSector}
                            onMouseOver={(_, index) => setHoverPriority(index)}
                            onMouseOut={() => setHoverPriority(null)}
                          >
                            {priorityData.map((p, i) => (
                              <Cell
                                key={p.priority}
                                fill={colorFor(PRIORITY_COLORS, p.priority, i)}
                                fillOpacity={hoverPriority === null || hoverPriority === i ? 1 : 0.3}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={(props) => <ChartTooltip {...props} total={priorityTotal} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="sm-chart-center">
                        <strong>{priorityTotal}</strong>
                        <span>tasks</span>
                      </div>
                    </div>
                    <ul className="sm-chart-legend">
                      {priorityData.map((p, i) => (
                        <li
                          key={p.priority}
                          className={`sm-chart-legend-item ${hoverPriority === i ? 'active' : ''}`}
                          onMouseEnter={() => setHoverPriority(i)}
                          onMouseLeave={() => setHoverPriority(null)}
                        >
                          <span className="sm-chart-dot" style={{ background: colorFor(PRIORITY_COLORS, p.priority, i) }} aria-hidden />
                          <span className="sm-chart-legend-label">{p.priority}</span>
                          <span className="sm-chart-legend-value">{p.count}</span>
                          <span className="sm-chart-legend-pct">
                            {priorityTotal > 0 ? Math.round((p.count / priorityTotal) * 100) : 0}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
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
