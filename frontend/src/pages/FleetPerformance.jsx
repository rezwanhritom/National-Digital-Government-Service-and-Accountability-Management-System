import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/FleetPerformance.css';

export default function FleetPerformance() {
  const [fleetMetrics, setFleetMetrics] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [slaCompliance, setSlaCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterBusId, setFilterBusId] = useState('');
  const [filterRouteId, setFilterRouteId] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchFleetData();
  }, [filterBusId, filterRouteId, dateRange]);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      if (filterBusId) params.busId = filterBusId;
      if (filterRouteId) params.routeId = filterRouteId;

      const [metricsRes, perfRes, slaRes] = await Promise.all([
        axios.get('/api/fleet/metrics', { params }),
        axios.get('/api/fleet/performance', { params }),
        axios.get('/api/fleet/sla-compliance', { params })
      ]);

      setFleetMetrics(metricsRes.data.data);
      setPerformance(perfRes.data.data);
      setSlaCompliance(slaRes.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch fleet data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format
      };
      if (filterBusId) params.busId = filterBusId;
      if (filterRouteId) params.routeId = filterRouteId;

      const response = await axios.get('/api/export/fleet', {
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `fleet_metrics_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentElement.removeChild(link);
      } else {
        const jsonString = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `fleet_metrics_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentElement.removeChild(link);
      }
    } catch (err) {
      setError('Failed to export data');
    }
  };

  if (loading && !fleetMetrics.length) {
    return <div className="loading">Loading fleet performance data...</div>;
  }

  return (
    <div className="fleet-performance-container">
      <h1>Fleet Performance & SLA Monitoring</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <div className="filter-group">
          <label>Bus ID:</label>
          <input
            type="text"
            value={filterBusId}
            onChange={(e) => setFilterBusId(e.target.value)}
            placeholder="Filter by bus ID"
          />
        </div>

        <div className="filter-group">
          <label>Route ID:</label>
          <input
            type="text"
            value={filterRouteId}
            onChange={(e) => setFilterRouteId(e.target.value)}
            placeholder="Filter by route ID"
          />
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
        </div>

        <button onClick={fetchFleetData} className="btn-primary">Refresh</button>
      </div>

      {performance && (
        <div className="performance-summary">
          <div className="summary-card">
            <h3>Average Speed</h3>
            <p className="metric-value">{performance.averageSpeed?.toFixed(2) || 0} km/h</p>
          </div>
          <div className="summary-card">
            <h3>Total Distance</h3>
            <p className="metric-value">{performance.totalDistance?.toFixed(2) || 0} km</p>
          </div>
          <div className="summary-card">
            <h3>Fuel Consumption</h3>
            <p className="metric-value">{performance.totalFuelConsumption?.toFixed(2) || 0} L</p>
          </div>
          <div className="summary-card">
            <h3>Average Passengers</h3>
            <p className="metric-value">{performance.averagePassengers?.toFixed(0) || 0}</p>
          </div>
        </div>
      )}

      {slaCompliance && (
        <div className="sla-section">
          <h2>SLA Compliance</h2>
          <div className="sla-metrics">
            <div className="sla-card">
              <h3>On-Time Percentage</h3>
              <p className="large-metric">{slaCompliance.onTimePercentage?.toFixed(2) || 0}%</p>
              <p className="target">Target: {slaCompliance.targetPercentage}%</p>
              <p className={slaCompliance.isMeetingSLA ? 'status-good' : 'status-warning'}>
                {slaCompliance.isMeetingSLA ? '✓ Meeting SLA' : '✗ Below Target'}
              </p>
            </div>
            <div className="sla-card">
              <h3>On-Time Trips</h3>
              <p className="large-metric">{slaCompliance.onTimeTrips || 0}</p>
              <p className="subtext">out of {slaCompliance.totalTrips || 0} trips</p>
            </div>
          </div>
        </div>
      )}

      <div className="export-section">
        <h3>Export Data</h3>
        <button onClick={() => handleExport('csv')} className="btn-export">Export as CSV</button>
        <button onClick={() => handleExport('json')} className="btn-export">Export as JSON</button>
      </div>

      <div className="metrics-table">
        <h2>Fleet Metrics</h2>
        <table>
          <thead>
            <tr>
              <th>Bus ID</th>
              <th>Route</th>
              <th>Status</th>
              <th>Speed (km/h)</th>
              <th>Distance (km)</th>
              <th>Passengers</th>
              <th>Fuel (L)</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {fleetMetrics.map((metric) => (
              <tr key={metric._id}>
                <td>{metric.busId?.busNumber || 'N/A'}</td>
                <td>{metric.routeId?.routeName || 'N/A'}</td>
                <td><span className={`status ${metric.status?.toLowerCase()}`}>{metric.status}</span></td>
                <td>{metric.speed?.toFixed(2) || 0}</td>
                <td>{metric.distance?.toFixed(2) || 0}</td>
                <td>{metric.passengerCount || 0}</td>
                <td>{metric.fuelConsumption?.toFixed(2) || 0}</td>
                <td>{new Date(metric.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
