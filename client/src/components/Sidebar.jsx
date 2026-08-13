import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/layout.module.css';

const linkClass = ({ isActive }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <span className={styles.logoMark}>OS</span>
        <span className={styles.logoText}>OrganiShift</span>
      </div>
      <nav className={styles.nav}>
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/events" className={linkClass}>
          Events
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        )}
        {user?.role === 'admin' && (
          <NavLink to="/admin/users" className={linkClass}>
            Admin Users
          </NavLink>
        )}
      </nav>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Log out
      </button>
    </aside>
  );
}
