import './Layout.css';

function Layout({ children }) {
  return (
    <div className="layout">
      <header className="layout-header">
        <h1>NDGSAMS</h1>
        <p className="tagline">National Digital Government Service and Accountability Management System</p>
      </header>
      <main className="layout-main">{children}</main>
      <footer className="layout-footer">
        <small>&copy; NDGSAMS</small>
      </footer>
    </div>
  );
}

export default Layout;
