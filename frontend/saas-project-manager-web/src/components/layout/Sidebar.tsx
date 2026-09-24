import { NavLink } from 'react-router-dom';
import {
  Activity,
  Bell,
  Building2,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
  User,
} from 'lucide-react';
import { Button } from 'react-bootstrap';
import { ChevronsLeft, ChevronsRight, Layers } from 'lucide-react';
import OrganizationSwitcher from './OrganizationSwitcher';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

const workspace = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} aria-hidden /> },
  { to: '/my-tasks', label: 'My Tasks', icon: <CheckSquare size={17} aria-hidden /> },
  { to: '/projects', label: 'Projects', icon: <FolderKanban size={17} aria-hidden /> },
  { to: '/organizations', label: 'Organizations', icon: <Building2 size={17} aria-hidden /> },
];
const collab = [
  { to: '/notifications', label: 'Notifications', icon: <Bell size={17} aria-hidden /> },
  { to: '/activity', label: 'Activity', icon: <Activity size={17} aria-hidden /> },
];
const personal = [
  { to: '/profile', label: 'Profile', icon: <User size={17} aria-hidden /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={17} aria-hidden /> },
];

function Section({ title, items, collapsed }: { title: string; items: typeof workspace; collapsed: boolean }) {
  return (
    <div className="mb-2">
      {!collapsed && <div className="sm-section-title px-2 mb-1">{title}</div>}
      <nav className="d-flex flex-column gap-1" aria-label={title}>
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) => `sm-nav-link${isActive ? ' active' : ''}`}
            title={i.label}
          >
            {i.icon}
            <span className="sm-nav-label">{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();

  return (
    <aside className={`sm-sidebar p-3${sidebarCollapsed ? ' collapsed' : ''}`} aria-label="Primary">
      <div className="d-flex align-items-center gap-2 mb-3">
        <span className="sm-kpi-icon" aria-hidden>
          <Layers size={18} />
        </span>
        {!sidebarCollapsed && <strong className="sm-nav-label">SaaS Manager</strong>}
        <Button
          variant="light"
          size="sm"
          className="ms-auto border"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </Button>
      </div>

      <div className="mb-3">
        <OrganizationSwitcher compact={sidebarCollapsed} />
      </div>

      <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
        <Section title="Workspace" items={workspace} collapsed={sidebarCollapsed} />
        <Section title="Collaboration" items={collab} collapsed={sidebarCollapsed} />
        <Section title="Personal" items={personal} collapsed={sidebarCollapsed} />
      </div>

      <div className="border-top pt-2 mt-2 d-flex align-items-center gap-2">
        <Avatar name={user?.fullName || user?.email || 'U'} size={32} />
        {!sidebarCollapsed && (
          <span className="sm-user-meta flex-grow-1 text-truncate">
            <span className="d-block fw-semibold small text-truncate">{user?.fullName || 'Account'}</span>
            <span className="d-block text-muted" style={{ fontSize: 12 }}>
              Developer
            </span>
          </span>
        )}
      </div>
    </aside>
  );
}
