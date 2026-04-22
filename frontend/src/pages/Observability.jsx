import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Observability.css';

export default function Observability() {
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiMetrics, setApiMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('health');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = autoRefresh ? setInterval(fetchData, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthRes, metricsRes, alertsRes, rulesRes] = await Promise.all([
        axios.get('/api/observability/health'),
        axios.get('/api/observability/metrics/current'),
        axios.get('/api/observability/alerts/active'),
        axios.get('/api/observability/alerts/rules')
      ]);

      setSystemHealth(healthRes.data.data);
      setApiMetrics(metricsRes.data.data);
      setAlerts(alertsRes.data.data);
      setAlertRules(rulesRes.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch observability data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await axios.put(`/api/observability/alerts/${alertId}/acknowledge`, {
        status: 'ACKNOWLEDGED'
      });
      await fetchData();
    } catch (err) {
      setError('Failed to acknowledge alert');
    }
  };

  const handleCreateAlertRule = async () => {
    const ruleName = prompt('Enter rule name:');
    if (!ruleName) return;

    try {
      await axios.post('/api/observability/alerts/rules', {
        name: ruleName,
        metricName: 'api_error_rate',
        threshold: 5,
        operator: 'gt',
        severity: 'WARNING'
      });
      await fetchData();
    } catch (err) {
      setError('Failed to create alert rule');
    }
  };

  const handleExportAlerts = async () => {
    try {
      const response = await axios.get('/api/export/alerts', {
        params: { severity: '' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `alerts_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError('Failed to export alerts');
    }
  };

  if (loading && !systemHealth) {
    return <div className="loading">Loading observability dashboard...</div>;
  }

  return (
    <div className="observability-container">
      <h1>System Health & Observability</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="controls">
        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto Refresh (5s)
        </label>
        <button onClick={fetchData} className="btn-primary">Refresh Now</button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          System Health
        </button>
        <button
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts ({alerts.length})
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Alert Rules
        </button>
        <button
          className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          API Metrics
        </button>
      </div>

      {activeTab === 'health' && systemHealth && (
        <div className="health-dashboard">
          <div className="health-section">
            <h2>System Metrics</h2>
            <div className="metrics-grid">
              <div className={`metric-card ${systemHealth.systemMetrics?.cpuUsage > 80 ? 'warning' : 'healthy'}`}>
                <h3>CPU Usage</h3>
                <p className="metric-value">{systemHealth.systemMetrics?.cpuUsage?.toFixed(2) || 0}%</p>
              </div>
              <div className={`metric-card ${systemHealth.systemMetrics?.memoryUsage > 80 ? 'warning' : 'healthy'}`}>
                <h3>Memory Usage</h3>
                <p className="metric-value">{systemHealth.systemMetrics?.memoryUsage?.toFixed(2) || 0}%</p>
              </div>
              <div className={`metric-card ${systemHealth.systemMetrics?.diskUsage > 85 ? 'critical' : 'healthy'}`}>
                <h3>Disk Usage</h3>
                <p className="metric-value">{systemHealth.systemMetrics?.diskUsage?.toFixed(2) || 0}%</p>
              </div>
              <div className="metric-card">
                <h3>Active Connections</h3>
                <p className="metric-value">{systemHealth.systemMetrics?.activeConnections || 0}</p>
              </div>
            </div>
          </div>

          <div className="health-section">
            <h2>API Health</h2>
            <div className="api-health">
              <div className={`api-metric ${systemHealth.apiHealth?.status === 'HEALTHY' ? 'healthy' : 'warning'}`}>
                <p className="status-badge">{systemHealth.apiHealth?.status}</p>
                <div className="metrics-row">
                  <div>
                    <h4>Error Rate</h4>
                    <p>{systemHealth.apiHealth?.errorRate?.toFixed(2) || 0}%</p>
                  </div>
                  <div>
                    <h4>Avg Latency</h4>
                    <p>{systemHealth.apiHealth?.averageLatency?.toFixed(2) || 0}ms</p>
                  </div>
                  <div>
                    <h4>Total Requests</h4>
                    <p>{systemHealth.apiHealth?.totalRequests || 0}</p>
                  </div>
                  <div>
                    <h4>Errors</h4>
                    <p>{systemHealth.apiHealth?.errorRequests || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="alerts-section">
          <div className="section-header">
            <h2>Active Alerts ({alerts.length})</h2>
            <button onClick={handleExportAlerts} className="btn-secondary">Export Alerts</button>
          </div>
          {alerts.length === 0 ? (
            <p className="empty-state">No active alerts</p>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert._id} className={`alert-card severity-${alert.severity?.toLowerCase()}`}>
                  <div className="alert-header">
                    <h4>{alert.ruleId?.name || 'Unknown Rule'}</h4>
                    <span className="severity-badge">{alert.severity}</span>
                  </div>
                  <p>{alert.message}</p>
                  <div className="alert-footer">
                    <span className="timestamp">{new Date(alert.timestamp).toLocaleString()}</span>
                    {alert.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert._id)}
                        className="btn-secondary"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="rules-section">
          <div className="section-header">
            <h2>Alert Rules</h2>
            <button onClick={handleCreateAlertRule} className="btn-primary">+ New Rule</button>
          </div>
          {alertRules.length === 0 ? (
            <p className="empty-state">No alert rules configured</p>
          ) : (
            <table className="rules-table">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Metric</th>
                  <th>Condition</th>
                  <th>Threshold</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alertRules.map((rule) => (
                  <tr key={rule._id}>
                    <td>{rule.name}</td>
                    <td>{rule.metricName}</td>
                    <td>{rule.operator}</td>
                    <td>{rule.threshold}</td>
                    <td><span className={`badge severity-${rule.severity?.toLowerCase()}`}>{rule.severity}</span></td>
                    <td>{rule.isActive ? '✓ Active' : '✗ Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="metrics-section">
          <h2>API Performance Metrics</h2>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Method</th>
                <th>Requests</th>
                <th>Errors</th>
                <th>Success Rate</th>
                <th>Avg Duration (ms)</th>
                <th>Min/Max (ms)</th>
              </tr>
            </thead>
            <tbody>
              {apiMetrics.map((metric) => (
                <tr key={metric._id}>
                  <td>{metric._id}</td>
                  <td><span className="method-badge">{metric.method}</span></td>
                  <td>{metric.requestCount}</td>
                  <td>{metric.errorCount}</td>
                  <td>{metric.successRate?.toFixed(2) || 0}%</td>
                  <td>{metric.averageDuration?.toFixed(2) || 0}</td>
                  <td>{metric.minDuration}/{metric.maxDuration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
