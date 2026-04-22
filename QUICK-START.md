# Quick Start Guide - Three Features

## Getting Started in 5 Minutes

### 1. Start the Backend
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3000`

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

### 3. Access the Dashboards

#### Fleet Performance Dashboard
Navigate to: `http://localhost:5173/fleet-performance`

**What you can do:**
- View real-time fleet metrics (speed, fuel, distance, passengers)
- Filter by date range, bus ID, or route
- Check SLA compliance status
- Export data as CSV or JSON

**Quick Actions:**
- Click "Refresh" to update data
- Select date range to filter historical data
- Click "Export as CSV" or "Export as JSON"

#### Observability Dashboard
Navigate to: `http://localhost:5173/observability`

**What you can do:**
- Monitor system health (CPU, Memory, Disk)
- View API performance metrics
- Manage active alerts
- Create and manage alert rules
- Auto-refresh every 5 seconds

**Quick Actions:**
- Click "Refresh Now" to update immediately
- Toggle "Auto Refresh" for live updates
- Click on tabs to switch between views
- Click "Acknowledge" to resolve alerts
- Click "+ New Rule" to create alerts

### 4. API Testing

#### Test Fleet API
```bash
# Get fleet metrics
curl http://localhost:3000/api/fleet/metrics?limit=10

# Record a new trip
curl -X POST http://localhost:3000/api/fleet/trips \
  -H "Content-Type: application/json" \
  -d '{
    "busId": "507f1f77bcf86cd799439011",
    "routeId": "507f1f77bcf86cd799439012",
    "tripDate": "2024-01-15",
    "scheduledDeparture": "2024-01-15T08:00:00Z",
    "actualDeparture": "2024-01-15T08:02:00Z",
    "scheduledArrival": "2024-01-15T08:30:00Z",
    "actualArrival": "2024-01-15T08:35:00Z",
    "passengersBoarded": 45,
    "passengersAlighted": 30
  }'

# Check SLA compliance
curl http://localhost:3000/api/fleet/sla-compliance
```

#### Test Observability API
```bash
# Get system health
curl http://localhost:3000/api/observability/health

# Get alert rules
curl http://localhost:3000/api/observability/alerts/rules

# Create alert rule
curl -X POST http://localhost:3000/api/observability/alerts/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High CPU Usage",
    "metricName": "cpu_usage",
    "threshold": 80,
    "operator": "gt",
    "severity": "WARNING"
  }'

# Get active alerts
curl http://localhost:3000/api/observability/alerts/active
```

#### Test Export API
```bash
# Generate API key
API_KEY=$(curl -X POST http://localhost:3000/api/export/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "description": "For testing",
    "expiresIn": 86400
  }' | jq -r '.data.keyToken')

# Export trips as CSV
curl "http://localhost:3000/api/export/trips?format=csv" \
  -H "Authorization: Bearer $API_KEY" > trips.csv

# Export with anonymization
curl "http://localhost:3000/api/export/trips?anonymize=true&format=json" \
  -H "Authorization: Bearer $API_KEY" > trips_anonymized.json

# Export alerts
curl "http://localhost:3000/api/export/alerts?format=csv" \
  -H "Authorization: Bearer $API_KEY" > alerts.csv
```

---

## Dashboard Features Overview

### Fleet Performance Dashboard

**Metrics Displayed:**
- Average Speed (km/h)
- Total Distance (km)
- Fuel Consumption (L)
- Average Passengers

**SLA Compliance Section:**
- On-Time Percentage
- Target Percentage
- Trip Count
- Compliance Status (✓ Meeting SLA / ✗ Below Target)

**Data Table Includes:**
- Bus ID and Route Info
- Trip Status (ON_TIME, DELAYED, EARLY)
- Speed and Distance
- Passenger Count
- Timestamp

**Filters:**
- Bus ID
- Route ID
- Start Date
- End Date

**Export Options:**
- Download as CSV
- Download as JSON

### Observability Dashboard

**System Health Metrics:**
- CPU Usage %
- Memory Usage %
- Disk Usage %
- Active Connections

**API Health:**
- Status (HEALTHY, WARNING, CRITICAL)
- Error Rate %
- Average Latency (ms)
- Total Requests
- Error Count

**Alert Management:**
- View Active Alerts with severity
- Acknowledge alerts
- View Alert History
- Create New Alert Rules

**Alert Tabs:**
1. **System Health** - CPU, Memory, Disk, Connections
2. **Alerts** - Active alerts with acknowledgement
3. **Alert Rules** - Manage alert definitions
4. **API Metrics** - Per-endpoint performance stats

---

## Common Tasks

### Export Fleet Data
1. Go to `/fleet-performance`
2. Set date range with calendar inputs
3. (Optional) Filter by Bus ID or Route ID
4. Click "Export as CSV" or "Export as JSON"
5. File downloads automatically

### Monitor System Health
1. Go to `/observability`
2. Check "Auto Refresh" checkbox for live updates
3. View system metrics in the health section
4. Monitor API error rate and latency
5. Check active alerts tab for issues

### Create an Alert
1. Go to `/observability`
2. Click on "Alert Rules" tab
3. Click "+ New Rule" button
4. Enter rule name and threshold
5. Select severity level
6. Rule will trigger when metric exceeds threshold

### Export with Anonymization
```bash
# Get anonymized trips data
curl "http://localhost:3000/api/export/trips?anonymize=true" \
  -H "Authorization: Bearer YOUR_API_KEY" > anonymized_trips.csv
```

Features anonymized:
- Location precision reduced
- IDs hashed
- Timestamps coarsened
- PII removed

---

## API Key Management

### Generate an API Key
```bash
curl -X POST http://localhost:3000/api/export/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App",
    "description": "Integration with mobile app",
    "expiresIn": 31536000
  }'
```

### List Active API Keys
```bash
curl http://localhost:3000/api/export/api-keys
```

### Revoke an API Key
```bash
curl -X DELETE http://localhost:3000/api/export/api-keys/{keyId}
```

### Use API Key for Exports
```bash
curl "http://localhost:3000/api/export/trips" \
  -H "Authorization: Bearer {keyToken}"
```

---

## Rate Limiting

Export endpoints have rate limiting:
- **Limit**: 10 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Headers**: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset

When limit is exceeded:
- Status Code: 429 (Too Many Requests)
- Message: "Too many export requests from this IP, please try again later."
- Wait 15 minutes to reset counter

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
Solution: Start MongoDB
```bash
mongod  # or MongoDB Atlas if using cloud
```

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
Solution: Change port in `backend/server.js` or kill existing process

### Frontend not connecting to Backend
```
Error: Network Error / CORS
```
Solution: Verify backend is running on `http://localhost:3000`

### Export returns 401 Unauthorized
Problem: Invalid or missing API key
Solution: Generate new API key and include in header:
```bash
Authorization: Bearer YOUR_API_KEY
```

### Dashboard shows no data
Problem: Database is empty
Solution: 
1. Ensure MongoDB is running
2. Check that models are created
3. Use POST endpoints to create sample data

---

## Performance Tips

1. **Limit Date Ranges** - Smaller date ranges load faster
2. **Use Filters** - Filter by bus/route to reduce data
3. **Enable Caching** - Browser caches API responses
4. **Batch Exports** - Export in monthly batches instead of yearly
5. **Off-Peak Times** - Export during low traffic hours

---

## Documentation

For detailed information, see:
- `docs/THREE-FEATURES-GUIDE.md` - Complete API documentation
- `docs/IMPLEMENTATION-COMPLETE.md` - Implementation details
- `docs/architecture.md` - System architecture
- `docs/api-guidelines.md` - API best practices

---

## Support

### Getting Help
1. Check the error message
2. Review troubleshooting section above
3. Check API documentation
4. Review console logs in browser/terminal
5. Check MongoDB for data

### Reporting Issues
1. Note the error message
2. Identify affected feature
3. Provide steps to reproduce
4. Check backend logs

### Logs Location
- Backend: Terminal output (npm start)
- Frontend: Browser console (F12)
- Database: MongoDB logs

---

## Next Steps

After exploring the basic features:

1. **Customize SLA Policies** - Set your own SLA targets
2. **Create Custom Alert Rules** - Define alerts for your needs
3. **Integrate with External Systems** - Use API for data exchange
4. **Set Up Monitoring** - Enable auto-refresh for 24/7 monitoring
5. **Export Historical Data** - Archive data for analysis

---

**You're all set! Start by exploring the Fleet Performance and Observability dashboards.**
