import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LayoutDashboard, FolderTree, ClipboardList, CalendarDays, ListChecks, LogOut, Menu } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = e => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Close on Escape + lock background scroll while the mobile drawer is open
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const eventId = location.pathname.match(/^\/events\/([^/]+)/)?.[1];
  useEffect(() => {
    if (!eventId) {
      setEventTitle('');
      return undefined;
    }
    let alive = true;
    api.get(`/events/${eventId}`)
      .then(ev => { if (alive) setEventTitle(ev.title || 'Event Execution'); })
      .catch(() => {});
    return () => { alive = false; };
  }, [eventId]);

  const getNavLinks = () => {
    const links = [
      { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'MEMBER'] }
    ];

    if (role === 'ADMIN' || role === 'MANAGER') {
      links.push({ to: '/planning-library', icon: <FolderTree size={18} />, label: 'Planning Library', roles: ['ADMIN', 'MANAGER'] });
    }

    if (role === 'ADMIN') {
      links.push({ to: '/event-plans', icon: <ClipboardList size={18} />, label: 'Event Plans', roles: ['ADMIN'] });
    }

    links.push(
      { to: '/calendar', icon: <CalendarDays size={18} />, label: 'Calendar', roles: ['ADMIN', 'MANAGER', 'MEMBER'] }
    );

    links.push(
      { to: '/execution', icon: <ListChecks size={18} />, label: 'Execution', roles: ['ADMIN', 'MANAGER', 'MEMBER'] }
    );

    return links.filter(link => link.roles.includes(role));
  };

  const getBreadcrumbs = () => {
    if (location.pathname.startsWith('/events/')) {
      return (
        <div className="truncate text-sm">
          <NavLink to="/execution" className="font-medium text-indigo-600 hover:text-indigo-500">Execution</NavLink>
          <span className="mx-1.5 text-slate-400">/</span>
          <span className="truncate font-semibold text-slate-900">{eventTitle || 'Event Execution'}</span>
        </div>
      );
    }
    const titles = {
      '/dashboard': 'Dashboard',
      '/planning-library': 'Planning Library',
      '/event-plans': 'Event Plans',
      '/calendar': 'Calendar',
      '/execution': 'Execution'
    };
    return (
      <h1 className="text-lg font-bold tracking-tight">
        {titles[location.pathname] || location.pathname.replace('/', '').replace(/-/g, ' ') || 'Dashboard'}
      </h1>
    );
  };

  const drawerHidden = !drawerOpen && !isDesktop;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">

      {drawerOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-20 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        id="sidebar"
        {...(drawerHidden ? { inert: '' } : {})}
        aria-hidden={drawerHidden}
        className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <img src="/assets/logo-horizontal.svg" alt="OrganiShift" className="h-8 w-auto" />
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
          {getNavLinks().map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-item relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition ${isActive ? 'active' : ''}`
              }
            >
              <span className="accent-bar absolute left-0 top-1.5 bottom-1.5 hidden w-1 rounded-r bg-indigo-600"></span>
              {link.icon}{link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1"></div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-[11px] font-bold text-white">{user?.name?.charAt(0) || 'U'}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="truncate text-[10px] font-mono text-slate-500">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="rounded p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-[248px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            {getBreadcrumbs()}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
