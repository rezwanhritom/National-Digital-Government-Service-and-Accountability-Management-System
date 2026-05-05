import { Parser } from 'json2csv';

class CsvExportService {
  constructor() {
    this.parser = new Parser();
  }

  async exportIncidents(incidents, options = {}) {
    const fields = [
      'category', 'busId', 'routeId', 'area', 'description', 
      'status', 'submittedAt', 'resolvedAt', 'resolutionTimeHours', 'assignedTo'
    ];

    const opts = { fields, ...options };
    const parser = new Parser(opts);
    
    const data = incidents.map(incident => ({
      ...incident.toObject(),
      submittedAt: incident.submittedAt?.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString(),
    }));

    return parser.parse(data);
  }

  async exportFleetData(fleetMetrics, options = {}) {
    const fields = [
      'routeId', 'vehicleId', 'operatorId', 'tripId', 'scheduleTime',
      'actualArrivalTime', 'actualDepartureTime', 'tripStatus', 'delayMinutes',
      'crowdLevel', 'passengerCount', 'slaCompliant', 'slaComplianceScore', 'date'
    ];

    const opts = { fields, ...options };
    const parser = new Parser(opts);
    
    const data = fleetMetrics.map(metric => ({
      ...metric.toObject(),
      scheduleTime: metric.scheduleTime?.toISOString(),
      actualArrivalTime: metric.actualArrivalTime?.toISOString(),
      actualDepartureTime: metric.actualDepartureTime?.toISOString(),
      date: metric.date?.toISOString().split('T')[0],
    }));

    return parser.parse(data);
  }

  async exportMetrics(metricsData, options = {}) {
    const fields = ['metric', 'value', 'timestamp', 'service', 'category'];

    const opts = { fields, ...options };
    const parser = new Parser(opts);
    
    const data = metricsData.map(item => ({
      ...item,
      timestamp: item.timestamp?.toISOString(),
    }));

    return parser.parse(data);
  }
}

export default new CsvExportService();
