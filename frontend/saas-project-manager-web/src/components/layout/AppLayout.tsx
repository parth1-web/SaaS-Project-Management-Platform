import { Offcanvas } from 'react-bootstrap';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import SearchBar from './SearchBar';
import ToastProvider from '../ui/ToastProvider';
import { useThemeStore } from '../../store/themeStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { mobileNavOpen, setMobileNav } = useThemeStore();

  return (
    <div className="sm-app">
      <a href="#main-content" className="visually-hidden-focusable sm-skip-link">
        Skip to main content
      </a>
      <div className="d-none d-lg-block">
        <Sidebar />
      </div>
      <div className="sm-main">
        <TopNavbar onMenu={() => setMobileNav(true)} />
        <div className="d-md-none px-3 pt-2">
          <SearchBar />
        </div>
        <main id="main-content" className="sm-content" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Offcanvas show={mobileNavOpen} onHide={() => setMobileNav(false)} placement="start" aria-label="Navigation">
        <Offcanvas.Body className="p-0">
          <Sidebar />
        </Offcanvas.Body>
      </Offcanvas>
      <ToastProvider />
    </div>
  );
}
