import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import styles from '../styles/layout.module.css';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <span className={styles.headerBrand}>
        <span className={styles.headerDot} />
        OrganiShift
      </span>
      <div className={styles.userMenu}>
        <Avatar name={user?.name} />
        <span className={styles.userName}>{user?.name}</span>
        <span className={styles.userRole}>{user?.role}</span>
      </div>
    </header>
  );
}
