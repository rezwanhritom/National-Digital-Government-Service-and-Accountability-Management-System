import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Home from "./pages/Home";
import Incident from './pages/Incident';
import Planner from './pages/Planner';
import CongestionMap from './pages/CongestionMap';
import NearbyLive from './pages/NearbyLive';
import FleetPerformance from './pages/FleetPerformance';
import Observability from './pages/Observability';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PendingApproval from './pages/PendingApproval';
import Unauthorized from './pages/Unauthorized';
import AdminConsole from './pages/AdminConsole';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/nearby-live" element={<NearbyLive />} />
            <Route path="/incident" element={<Incident />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/congestion" element={<CongestionMap />} />
            <Route path="/fleet-performance" element={
              <ProtectedRoute allowedRoles={['bus_operator', 'transport_officer', 'system_admin']}>
                <FleetPerformance />
              </ProtectedRoute>
            } />
            <Route path="/observability" element={
              <ProtectedRoute allowedRoles={['ml_devops_engineer', 'transport_officer', 'system_admin']}>
                <Observability />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['system_admin', 'transport_officer', 'ml_devops_engineer']}>
                <AdminConsole />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
