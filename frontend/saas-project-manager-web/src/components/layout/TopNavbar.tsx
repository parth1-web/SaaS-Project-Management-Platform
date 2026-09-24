import { Button, Dropdown } from 'react-bootstrap';
import { CircleHelp, Menu, Moon, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { useThemeStore } from '../../store/themeStore';
import { useToastStore } from '../../store/toastStore';

function crumb(path: string): string {
  if (path.startsWith('/dashboard')) return 'Dashboard';
  if (path.startsWith('/my-tasks')) return 'My Tasks';
  if (path.startsWith('/projects')) return 'Projects';
  if (path.startsWith('/organizations')) return 'Organizations';
  if (path.startsWith('/notifications')) return 'Notifications';
  if (path.startsWith('/activity')) return 'Activity';
  if (path.startsWith('/tasks')) return 'Task';
  if (path.startsWith('/profile')) return 'Profile';
  if (path.startsWith('/settings')) return 'Settings';
  return 'Workspace';
}

export default function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const { push } = useToastStore();
  const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        /* ignore */
      }
    }
    logout();
    push('Signed out', 'info');
    navigate('/login');
  };

  return (
    <header className="sm-topbar" role="banner">
      <Button variant="light" size="sm" className="border d-lg-none" onClick={onMenu} aria-label="Open navigation">
        <Menu size={16} aria-hidden />
      </Button>
      <nav className="small text-muted d-none d-md-block" aria-label="Breadcrumb">
        Workspace <span aria-hidden>/</span> <span className="text-dark fw-semibold">{crumb(location.pathname)}</span>
      </nav>
      <div className="d-none d-md-flex flex-grow-1 justify-content-center">
        <SearchBar />
      </div>
      <div className="ms-auto d-flex align-items-center gap-2">
        <NotificationDropdown />
        <Button
          variant="light"
          size="sm"
          className="border d-none d-sm-inline-flex"
          aria-label="Help"
          title="Help"
          onClick={() => push('Docs: see README and docs/api/api.md', 'info')}
        >
          <CircleHelp size={16} aria-hidden />
        </Button>
        <Button
          variant="light"
          size="sm"
          className="border"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title="Appearance"
          onClick={() => setMode(dark ? 'light' : 'dark')}
        >
          {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          <span className="visually-hidden">{mode}</span>
        </Button>
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" size="sm" className="border d-flex align-items-center gap-2" aria-label="Profile menu">
            <Avatar name={user?.fullName || user?.email || 'U'} size={24} />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Header>{user?.fullName || user?.email}</Dropdown.Header>
            <Dropdown.Item as={Link} to="/profile">Profile</Dropdown.Item>
            <Dropdown.Item as={Link} to="/settings">Settings</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout}>Sign out</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}
