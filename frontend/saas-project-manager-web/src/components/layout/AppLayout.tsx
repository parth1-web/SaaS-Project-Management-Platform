import { Offcanvas } from 'react-bootstrap';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ToastProvider from '../ui/ToastProvider';
import { useThemeStore } from '../../store/themeStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { mobileNavOpen, setMobileNav } = useThemeStore();

  return (
    <div className="sm-app">
      <div className="d-none d-lg-block">
        <Sidebar />
      </div>
      <div className="sm-main">
        <TopNavbar onMenu={() => setMobileNav(true)} />
        <main className="sm-content" role="main">
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
