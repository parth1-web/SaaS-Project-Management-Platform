import { Container, Navbar, Nav, NavDropdown, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, Building2, FolderKanban, Bell, LogOut, CheckSquare } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';
import { notificationApi } from '../api/miscApi';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { data: unread } = useQuery({
    queryKey: ['unread'],
    queryFn: () => notificationApi.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      try { await authApi.logout(refresh); } catch { /* ignore */ }
    }
    logout();
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-0">
        <Container fluid>
          <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center gap-2">
            <CheckSquare size={22} /> SaaS PM
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/dashboard"><LayoutDashboard size={16} className="me-1" />Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/organizations"><Building2 size={16} className="me-1" />Organizations</Nav.Link>
              <Nav.Link as={Link} to="/projects"><FolderKanban size={16} className="me-1" />Projects</Nav.Link>
              <Nav.Link as={Link} to="/notifications">
                <Bell size={16} className="me-1" />Notifications{' '}
                {!!unread && <Badge bg="danger">{unread}</Badge>}
              </Nav.Link>
            </Nav>
            <Nav>
              <NavDropdown title={user?.fullName ?? user?.email ?? 'Account'} align="end">
                <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/settings">Settings</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}><LogOut size={14} className="me-1" />Logout</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container fluid className="py-4" style={{ maxWidth: 1200 }}>
        {children}
      </Container>
    </>
  );
}
