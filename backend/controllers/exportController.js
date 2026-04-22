import Incident from '../models/Incident.js';
import FleetMetrics from '../models/FleetMetrics.js';
import SystemMetrics from '../models/SystemMetrics.js';
import csvExportService from '../services/csvExportService.js';
import dataAnonymizationService from '../services/dataAnonymizationService.js';

export const exportIncidents = async (req, res, next) => {
  try {
    const { format = 'csv', anonymize = 'false', startDate, endDate, limit = 10000 } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) query.submittedAt.$lte = new Date(endDate);
    }

    const incidents = await Incident.find(query)
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit));

    let dataToExport = incidents;

    if (anonymize === 'true') {
      dataToExport = dataAnonymizationService.anonymizeDataset(
        incidents.map(inc => inc.toObject()),
        dataAnonymizationService.getPrivacyConfig('incidents')
      );
    }

    if (format === 'csv') {
      const csv = await csvExportService.exportIncidents(dataToExport);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="incidents.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: dataToExport,
        count: dataToExport.length
      });
    }
  } catch (error) {
    next(error);
  }
};

export const exportFleetData = async (req, res, next) => {
  try {
    const { format = 'csv', anonymize = 'false', startDate, endDate, limit = 10000 } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const fleetData = await FleetMetrics.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    let dataToExport = fleetData;

    if (anonymize === 'true') {
      dataToExport = dataAnonymizationService.anonymizeDataset(
        fleetData.map(item => item.toObject()),
        dataAnonymizationService.getPrivacyConfig('fleet')
      );
    }

    if (format === 'csv') {
      const csv = await csvExportService.exportFleetData(dataToExport);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="fleet-data.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: dataToExport,
        count: dataToExport.length
      });
    }
  } catch (error) {
    next(error);
  }
};

export const exportSystemMetrics = async (req, res, next) => {
  try {
    const { format = 'csv', startDate, endDate, limit = 10000 } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const metrics = await SystemMetrics.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    if (format === 'csv') {
      const csv = await csvExportService.exportMetrics(metrics.map(m => m.toObject()));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="system-metrics.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: metrics,
        count: metrics.length
      });
    }
  } catch (error) {
    next(error);
  }
};

export const exportCongestionData = async (req, res, next) => {
  try {
    const { format = 'csv', anonymize = 'false', startDate, endDate, limit = 10000 } = req.query;

    // Mock congestion data - in real implementation, this would come from a Congestion model
    const mockData = [
      {
        routeId: 'R001',
        segmentId: 'S001',
        timestamp: new Date(),
        congestionLevel: Math.random() * 100,
        location: { lat: 23.8103, lng: 90.4125 },
        vehicleCount: Math.floor(Math.random() * 50),
        avgSpeed: Math.random() * 60
      }
    ];

    let dataToExport = mockData;

    if (anonymize === 'true') {
      dataToExport = dataAnonymizationService.anonymizeDataset(
        mockData,
        dataAnonymizationService.getPrivacyConfig('congestion')
      );
    }

    if (format === 'csv') {
      const csv = await csvExportService.exportMetrics(dataToExport);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="congestion-data.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: dataToExport,
        count: dataToExport.length
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getExportStatus = async (req, res, next) => {
  try {
    // Mock export status - in real implementation, this would track actual export jobs
    res.json({
      success: true,
      data: {
        activeExports: 0,
        completedToday: 5,
        failedToday: 0,
        totalExportsThisMonth: 150
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateExportRequest = async (req, res, next) => {
  try {
    const { dataType, format, anonymize, limit } = req.query;

    const errors = [];

    if (!['incidents', 'fleet', 'metrics', 'congestion'].includes(dataType)) {
      errors.push('Invalid dataType. Must be one of: incidents, fleet, metrics, congestion');
    }

    if (!['csv', 'json'].includes(format)) {
      errors.push('Invalid format. Must be one of: csv, json');
    }

    if (!['true', 'false'].includes(anonymize)) {
      errors.push('Invalid anonymize value. Must be true or false');
    }

    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50000) {
      errors.push('Invalid limit. Must be a number between 1 and 50000');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Check if user has export permissions (mock check)
    const hasPermission = true; // In real implementation, check user permissions

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for data export'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
