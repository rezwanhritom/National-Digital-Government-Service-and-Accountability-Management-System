import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

function Layout() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-darkbg text-slate-200">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-6 pb-12 pt-24 md:px-12 md:pt-28">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
