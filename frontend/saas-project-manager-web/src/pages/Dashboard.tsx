import { Row, Col, Card } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '../api/miscApi';
import { LoadingSpinner, ErrorAlert, EmptyState } from '../components/Feedback';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545'];

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats(),
  });

  if (isLoading) return <LoadingSpinner text="Loading dashboard..." />;
  if (isError) return <ErrorAlert message="Failed to load dashboard" onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="No data" />;

  const metrics = [
    { label: 'Organizations', value: data.totalOrganizations },
    { label: 'Projects', value: data.totalProjects },
    { label: 'Total Tasks', value: data.totalTasks },
    { label: 'Completed', value: data.completedTasks },
    { label: 'Pending', value: data.pendingTasks },
    { label: 'Overdue', value: data.overdueTasks },
  ];

  return (
    <>
      <h3 className="mb-3">Dashboard</h3>
      <Row className="g-3 mb-4">
        {metrics.map((m) => (
          <Col key={m.label} xs={6} md={4} lg={2}>
            <Card className="shadow-sm text-center">
              <Card.Body>
                <div className="fs-3 fw-bold">{m.value}</div>
                <div className="text-muted small">{m.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <Row className="g-3">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Tasks by Status</Card.Title>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={data.tasksByStatus}>
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0d6efd" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Tasks by Priority</Card.Title>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.tasksByPriority} dataKey="count" nameKey="priority" outerRadius={90} label>
                      {data.tasksByPriority.map((_, i) => (
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
      </Row>
    </>
  );
}
