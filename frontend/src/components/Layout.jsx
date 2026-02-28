import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-inner">
          <Link to="/" className="layout-brand">
            <h1>NDGSAMS</h1>
            <p className="tagline">National Digital Government Service and Accountability Management System</p>
          </Link>
          <nav className="layout-nav" aria-label="Main">
            <Link to="/" aria-current={isHome ? 'page' : undefined}>Home</Link>
          </nav>
        </div>
      </header>
      <main className="layout-main">{children}</main>
      <footer className="layout-footer">
        <small>&copy; NDGSAMS</small>
      </footer>
    </div>
  );
}

export default Layout;
