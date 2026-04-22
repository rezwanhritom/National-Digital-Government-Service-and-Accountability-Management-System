import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Home from "./pages/Home";
import Incident from './pages/Incident';
import Planner from './pages/Planner';
import CongestionMap from './pages/CongestionMap';
import NearbyLive from './pages/NearbyLive';
import FleetPerformance from './pages/FleetPerformance';
import Observability from './pages/Observability';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/nearby-live" element={<NearbyLive />} />
          <Route path="/incident" element={<Incident />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/congestion" element={<CongestionMap />} />
          <Route path="/fleet-performance" element={<FleetPerformance />} />
          <Route path="/observability" element={<Observability />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
