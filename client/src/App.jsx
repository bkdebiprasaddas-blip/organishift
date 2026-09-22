import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventTitleProvider } from './context/EventTitleContext';
import { ToastProvider } from './components/common/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlanningLibrary from './pages/PlanningLibrary';
import EventPlans from './pages/EventPlans';
import Calendar from './pages/Calendar';
import EventExecution from './pages/EventExecution';
import ExecutionHub from './pages/ExecutionHub';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
          <span className="text-sm font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <EventTitleProvider>
      <ToastProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes with Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/planning-library" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                <PlanningLibrary />
              </ProtectedRoute>
            } />
            <Route path="/event-plans" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <EventPlans />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/execution" element={<ExecutionHub />} />
            <Route path="/events/:id" element={<EventExecution />} />
          </Route>

          {/* Redirect root to dashboard or login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Router>
      </ToastProvider>
      </EventTitleProvider>
    </AuthProvider>
  );
}

export default App;
