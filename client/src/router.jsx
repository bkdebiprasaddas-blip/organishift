import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Spinner from './components/Spinner';

function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <Spinner full />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ children }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route
          path="/reports"
          element={
            <RequireRole>
              <Reports />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole>
              <AdminUsers />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
