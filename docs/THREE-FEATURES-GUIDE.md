# Three Features Implementation - Complete Guide

## Overview
This document provides a complete guide to the three implemented features for the Dhaka Smart Transit Congestion Intelligence Platform:

1. **Fleet Performance & SLA Monitoring**
2. **System Health & Observability Dashboard**
3. **Data Export & Integration APIs**

---

## Feature 1: Fleet Performance & SLA Monitoring

### Purpose
Track, monitor, and optimize the performance of transit fleet operations with real-time metrics and SLA compliance tracking.

### Key Endpoints

#### Get Fleet Metrics
```bash
GET /api/fleet/metrics?busId=BUS001&startDate=2024-01-01&endDate=2024-01-31&limit=100
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "busId": { "busNumber": "BUS001" },
      "routeId": { "routeName": "Route A" },
      "timestamp": "2024-01-15T10:30:00Z",
      "speed": 45.5,
      "distance": 12.3,
      "fuelConsumption": 2.1,
      "passengerCount": 45,
      "status": "ACTIVE",
      "latitude": 23.8103,
      "longitude": 90.3563
    }
  ],
  "count": 100
}
```

#### Get Fleet Performance Summary
```bash
GET /api/fleet/performance?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "averageSpeed": 42.3,
    "totalDistance": 1205.6,
    "totalFuelConsumption": 98.5,
    "averagePassengers": 38.2,
    "vehicleCount": 45,
    "statusDistribution": {
      "ACTIVE": 35,
      "IDLE": 8,
      "MAINTENANCE": 2
    }
  }
}
```

#### Record Trip
```bash
POST /api/fleet/trips
Content-Type: application/json

{
  "busId": "507f1f77bcf86cd799439011",
  "routeId": "507f1f77bcf86cd799439012",
  "tripDate": "2024-01-15",
  "scheduledDeparture": "2024-01-15T08:00:00Z",
  "actualDeparture": "2024-01-15T08:02:00Z",
  "scheduledArrival": "2024-01-15T08:30:00Z",
  "actualArrival": "2024-01-15T08:35:00Z",
  "passengersBoarded": 45,
  "passengersAlighted": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trip recorded successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "busId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "delayMinutes": 5,
    "status": "DELAYED",
    "passengersBoarded": 45,
    "passengersAlighted": 30,
    "completedStops": 0,
    "missedStops": 0
  }
}
```

#### Get SLA Compliance
```bash
GET /api/fleet/sla-compliance?busId=BUS001&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "onTimePercentage": 92.5,
    "targetPercentage": 95,
    "onTimeTrips": 37,
    "totalTrips": 40,
    "isMeetingSLA": false,
    "slaPolicy": {
      "_id": "507f1f77bcf86cd799439014",
      "routeId": "507f1f77bcf86cd799439012",
      "onTimePercentageTarget": 95,
      "maxAllowedDelayMinutes": 5,
      "description": "Standard SLA Policy"
    }
  }
}
```

#### Create/Update SLA Policy
```bash
POST /api/fleet/sla-policies
Content-Type: application/json

{
  "routeId": "507f1f77bcf86cd799439012",
  "onTimePercentageTarget": 95,
  "maxAllowedDelayMinutes": 5,
  "description": "Standard SLA for main routes"
}
```

### Frontend Integration

#### Fleet Performance Page
Navigate to `/fleet-performance` in the web application to access the fleet monitoring dashboard.

**Features:**
- Real-time metrics visualization
- Date range filtering
- Bus and route filtering
- SLA compliance status
- Performance summary cards
- Data export (CSV/JSON)
- Historical metrics table

---

## Feature 2: System Health & Observability Dashboard

### Purpose
Monitor system health, API performance, and create alerts for operational issues.

### Key Endpoints

#### Get System Health
```bash
GET /api/observability/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "systemMetrics": {
      "cpuUsage": 35.2,
      "memoryUsage": 62.5,
      "diskUsage": 45.0,
      "uptime": 864000,
      "activeConnections": 125
    },
    "apiHealth": {
      "totalRequests": 5432,
      "errorRequests": 45,
      "errorRate": 0.83,
      "averageLatency": 125.5,
      "status": "HEALTHY"
    },
    "recentAlerts": [
      {
        "_id": "507f1f77bcf86cd799439015",
        "severity": "WARNING",
        "message": "API error rate above 5%",
        "timestamp": "2024-01-15T10:25:00Z",
        "status": "ACTIVE"
      }
    ],
    "overallStatus": "HEALTHY"
  }
}
```

#### Get API Metrics
```bash
GET /api/observability/metrics/current
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "endpoint": "/api/fleet/metrics",
      "method": "GET",
      "statusCode": 200,
      "duration": 125,
      "timestamp": "2024-01-15T10:30:00Z",
      "responseSize": 1024,
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

#### Get API Performance Statistics
```bash
GET /api/observability/metrics/history?hours=24
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "/api/fleet/metrics",
      "method": "GET",
      "averageDuration": 125.5,
      "minDuration": 45,
      "maxDuration": 500,
      "requestCount": 1250,
      "errorCount": 12,
      "successRate": 99.04
    }
  ]
}
```

#### Create Alert Rule
```bash
POST /api/observability/alerts/rules
Content-Type: application/json

{
  "name": "High API Error Rate",
  "metricName": "api_error_rate",
  "threshold": 5,
  "operator": "gt",
  "severity": "CRITICAL",
  "description": "Alert when API error rate exceeds 5%"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert rule created",
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "name": "High API Error Rate",
    "metricName": "api_error_rate",
    "threshold": 5,
    "operator": "gt",
    "severity": "CRITICAL",
    "isActive": true
  }
}
```

#### Get Alert Rules
```bash
GET /api/observability/alerts/rules?isActive=true
```

#### Get Active Alerts
```bash
GET /api/observability/alerts/active?severity=CRITICAL
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439018",
      "ruleId": {
        "_id": "507f1f77bcf86cd799439017",
        "name": "High API Error Rate",
        "metricName": "api_error_rate"
      },
      "severity": "CRITICAL",
      "message": "API error rate is 7.5%, exceeds threshold of 5%",
      "value": 7.5,
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "ACTIVE"
    }
  ],
  "count": 1
}
```

#### Acknowledge Alert
```bash
PUT /api/observability/alerts/507f1f77bcf86cd799439018/acknowledge
Content-Type: application/json

{
  "status": "ACKNOWLEDGED",
  "resolution": "Restarted API service"
}
```

#### Get Alert Summary
```bash
GET /api/observability/alerts/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bySeverity": {
      "CRITICAL": 2,
      "WARNING": 5,
      "INFO": 8
    },
    "active": 7,
    "resolved": 8,
    "total": 15
  }
}
```

### Frontend Integration

#### Observability Dashboard Page
Navigate to `/observability` in the web application to access the system health monitoring dashboard.

**Features:**
- System health metrics (CPU, Memory, Disk)
- API performance statistics
- Real-time alert monitoring
- Auto-refresh capability (5-second interval)
- Alert rule management
- Alert acknowledgement and resolution
- Alert export functionality
- Tabbed interface for different views

---

## Feature 3: Data Export & Integration APIs

### Purpose
Securely export transit data in various formats with optional anonymization for privacy compliance.

### Key Endpoints

#### Generate API Key
```bash
POST /api/export/api-keys
Content-Type: application/json

{
  "name": "Mobile App Integration",
  "description": "API key for third-party mobile app",
  "expiresIn": 31536000
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key generated",
  "data": {
    "id": "507f1f77bcf86cd799439019",
    "name": "Mobile App Integration",
    "keyToken": "key_abcdef123456_1705315200000",
    "expiresAt": "2025-01-15T10:30:00Z"
  }
}
```

#### Export Trips as CSV
```bash
GET /api/export/trips?startDate=2024-01-01&endDate=2024-01-31&anonymize=false&format=csv
Authorization: Bearer key_abcdef123456_1705315200000
```

**Response:** CSV file download
```csv
Trip Date,Bus Number,Route Code,Scheduled Arrival,Actual Arrival,Delay (minutes),Status,Passengers Boarded,Passengers Alighted
2024-01-15,BUS001,ROUTE_A,2024-01-15T08:30:00Z,2024-01-15T08:35:00Z,5,DELAYED,45,30
```

#### Export Trips as JSON
```bash
GET /api/export/trips?startDate=2024-01-01&endDate=2024-01-31&format=json
Authorization: Bearer key_abcdef123456_1705315200000
```

**Response:**
```json
{
  "success": true,
  "exportDate": "2024-01-15T10:30:00Z",
  "count": 100,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "busId": { "busNumber": "BUS001" },
      "routeId": { "routeCode": "ROUTE_A" },
      "tripDate": "2024-01-15",
      "scheduledArrival": "2024-01-15T08:30:00Z",
      "actualArrival": "2024-01-15T08:35:00Z",
      "delayMinutes": 5,
      "status": "DELAYED"
    }
  ]
}
```

#### Export Fleet Metrics
```bash
GET /api/export/fleet?startDate=2024-01-01&endDate=2024-01-31&anonymize=false
Authorization: Bearer key_abcdef123456_1705315200000
```

**Response:** CSV file with fleet metrics

#### Export Alerts
```bash
GET /api/export/alerts?startDate=2024-01-01&endDate=2024-01-31&severity=CRITICAL
Authorization: Bearer key_abcdef123456_1705315200000
```

**Response:** CSV file with alert logs

#### Anonymized Data Export
```bash
GET /api/export/trips?anonymize=true&startDate=2024-01-01&endDate=2024-01-31
```

**Features:**
- Location anonymization (granular level precision)
- ID hashing with salt
- Timestamp coarsening
- PII removal
- Configurable granularity levels (strict, medium, minimal)

#### Validate API Key
```bash
POST /api/export/validate
Content-Type: application/json

{
  "keyToken": "key_abcdef123456_1705315200000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439019",
    "name": "Mobile App Integration",
    "isValid": true
  }
}
```

#### Get API Keys
```bash
GET /api/export/api-keys
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439019",
      "name": "Mobile App Integration",
      "createdAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2025-01-15T10:30:00Z",
      "isActive": true
    }
  ],
  "count": 5
}
```

#### Revoke API Key
```bash
DELETE /api/export/api-keys/507f1f77bcf86cd799439019
```

**Response:**
```json
{
  "success": true,
  "message": "API key revoked"
}
```

### Frontend Integration

#### Data Export Features
Access data export through the Fleet Performance and Observability dashboards:

**Fleet Performance Dashboard:**
- Export button for CSV
- Export button for JSON
- Date range filtering before export
- Anonymization toggle option

**Observability Dashboard:**
- Export Alerts button
- Export Alert Rules option
- Format selection (CSV/JSON)
- Date range filtering

---

## Authentication & Security

### API Key Management
- Generate unique API keys with optional expiration
- Revoke compromised keys instantly
- Track API key usage in audit logs
- Rate limiting (10 requests per 15 minutes for exports)

### Data Privacy
- Optional anonymization for sensitive data
- Location precision coarsening
- PII hashing with salt
- Configurable privacy levels

### Rate Limiting
```
Window: 15 minutes
Limit: 10 export requests per IP
Standard Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

---

## Integration Examples

### Example 1: Monitoring Fleet Performance
```javascript
// Frontend code
const response = await fetch('/api/fleet/metrics?busId=BUS001&limit=50');
const data = await response.json();

// Display performance metrics
console.log(`Average Speed: ${data.data[0].speed} km/h`);
console.log(`Fuel Consumption: ${data.data[0].fuelConsumption} L`);
```

### Example 2: Receiving Alerts
```javascript
// Auto-refresh alerts every 5 seconds
setInterval(async () => {
  const response = await fetch('/api/observability/alerts/active');
  const alerts = await response.json();
  
  alerts.data.forEach(alert => {
    if (alert.severity === 'CRITICAL') {
      // Trigger notification
      sendNotification(`Critical Alert: ${alert.message}`);
    }
  });
}, 5000);
```

### Example 3: Exporting Data
```javascript
// Export trips with anonymization
const response = await fetch('/api/export/trips?anonymize=true&format=csv');
const blob = await response.blob();

// Download file
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `trips_${new Date().getTime()}.csv`;
link.click();
```

---

## Database Models

### FleetMetrics
```
- busId: Reference to Bus
- routeId: Reference to Route
- timestamp: Date
- latitude: Number
- longitude: Number
- speed: Number (km/h)
- distance: Number (km)
- fuelConsumption: Number (L)
- passengerCount: Number
- status: String (ACTIVE, IDLE, MAINTENANCE)
```

### TripLog
```
- busId: Reference to Bus
- routeId: Reference to Route
- tripDate: Date
- scheduledDeparture: Date
- actualDeparture: Date
- scheduledArrival: Date
- actualArrival: Date
- delayMinutes: Number
- status: String (ON_TIME, DELAYED, EARLY)
- passengersBoarded: Number
- passengersAlighted: Number
```

### AlertRule
```
- name: String
- metricName: String
- threshold: Number
- operator: String (gt, lt, eq, gte, lte)
- severity: String (CRITICAL, WARNING, INFO)
- isActive: Boolean
```

### AlertLog
```
- ruleId: Reference to AlertRule
- value: Number
- threshold: Number
- severity: String
- message: String
- status: String (ACTIVE, ACKNOWLEDGED, RESOLVED)
- timestamp: Date
- resolvedAt: Date
```

### ApiKey
```
- name: String
- keyToken: String (hashed)
- createdBy: Reference to User
- createdAt: Date
- expiresAt: Date
- isActive: Boolean
- revokedAt: Date
```

---

## Testing the APIs

### Using cURL
```bash
# Get fleet metrics
curl -X GET "http://localhost:3000/api/fleet/metrics?limit=10" \
  -H "Content-Type: application/json"

# Create alert rule
curl -X POST "http://localhost:3000/api/observability/alerts/rules" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Error Rate",
    "metricName": "api_error_rate",
    "threshold": 5,
    "operator": "gt",
    "severity": "WARNING"
  }'

# Export data
curl -X GET "http://localhost:3000/api/export/trips?anonymize=false" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Using Postman
1. Import the collection from `/docs/postman-collection.json`
2. Set environment variables for base URL and API key
3. Test each endpoint with provided sample requests

---

## Troubleshooting

### Common Issues

**API returns 401 Unauthorized**
- Check API key is valid and not expired
- Verify Authorization header format: `Authorization: Bearer {keyToken}`

**Export takes too long**
- Large date ranges may take longer
- Try reducing the time period
- Check system resources

**Alerts not triggering**
- Verify alert rule is active (`isActive: true`)
- Check metric name matches actual metric
- Ensure threshold and operator are correct

**Rate limit exceeded**
- Wait 15 minutes for the window to reset
- Use multiple API keys for parallel exports
- Consider batch processing

---

## Support & Documentation

For additional help:
- API documentation: `/docs/api-guidelines.md`
- Architecture overview: `/docs/architecture.md`
- Feature details: `/docs/feature-*.md`
- GitHub Issues: Report bugs or request features
