import Incident from '../models/Incident.js';
import { classifyIncident } from '../services/aiService.js';
import mongoose from 'mongoose';
import {
  buildIncidentAreasFromStops,
  deriveIncidentGeoContext,
  loadStopsDataset,
} from '../services/incidentImpactService.js';

export const getIncidentAreas = async (req, res, next) => {
  try {
    const stops = await loadStopsDataset();
    const areas = buildIncidentAreasFromStops(stops);
    return res.json({ areas });
  } catch (error) {
    next(error);
  }
};

// Submit a new incident
export const submitIncident = async (req, res, next) => {
  try {
    const { category, busId, routeId, latitude, longitude, description, area: areaRaw } = req.body;
    const requestedArea = String(areaRaw ?? '').trim();
    const hasLatitude = latitude !== undefined && latitude !== null && String(latitude).trim() !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && String(longitude).trim() !== '';

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({ message: 'Both latitude and longitude are required when providing coordinates' });
    }

    // Handle file uploads
    const media = [];
    if (req.files) {
      req.files.forEach(file => {
        media.push(file.path); // Assuming multer saves to disk
      });
    }

    const stops = await loadStopsDataset();
    const areas = buildIncidentAreasFromStops(stops);
    const areaMap = new Map(areas.map((a) => [a.area, a]));
    const areaSet = new Set(areaMap.keys());

    let lat;
    let lon;
    if (hasLatitude && hasLongitude) {
      lat = Number(latitude);
      lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ message: 'Valid latitude and longitude are required' });
      }
    } else {
      if (!requestedArea) {
        return res.status(400).json({ message: 'Select an area or provide valid latitude and longitude' });
      }
      const selectedArea = areaMap.get(requestedArea);
      if (!selectedArea) {
        return res.status(422).json({
          message: 'Please choose a valid area',
          available_areas: [...areaSet],
        });
      }
      const centerLat = Number(selectedArea?.center?.lat);
      const centerLng = Number(selectedArea?.center?.lng);
      if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
        return res.status(422).json({ message: `Selected area "${requestedArea}" does not have valid center coordinates` });
      }
      lat = centerLat;
      lon = centerLng;
    }

    const geo = await deriveIncidentGeoContext({ latitude: lat, longitude: lon });
    const autoArea = String(geo?.area ?? '').trim();
    const finalArea = requestedArea && areaSet.has(requestedArea)
      ? requestedArea
      : areaSet.has(autoArea)
        ? autoArea
        : null;
    if (!finalArea) {
      return res.status(422).json({
        message: 'Unable to resolve area from coordinates. Please choose a valid area.',
        available_areas: [...areaSet],
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock response when DB is not connected
      return res.status(201).json({
        message: 'Incident submitted successfully (mock mode - MongoDB connection failed)',
        incident: {
          id: `mock-${Date.now()}`,
          category,
          area: finalArea,
          nearest_stop: geo?.nearest_stop ?? null,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Create incident
    const incident = new Incident({
      category,
      busId,
      routeId,
      location: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      area: finalArea,
      description,
      media,
      submittedBy: req.user ? req.user._id : null, // Assuming auth middleware sets req.user
    });

    await incident.save();

    // Optionally, classify with AI
    try {
      const classification = await classifyIncident({
        text: description,
        location: geo?.location || finalArea,
      });
      incident.aiClassification = classification;
      await incident.save();
    } catch (aiError) {
      console.error('AI classification failed:', aiError);
      // Continue without AI classification
    }

    res.status(201).json({
      message: 'Incident submitted successfully',
      incident: {
        id: incident._id,
        category: incident.category,
        area: incident.area,
        nearest_stop: geo?.nearest_stop ?? null,
        status: incident.status,
        createdAt: incident.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get incidents (for admin or public view)
export const getIncidents = async (req, res, next) => {
  try {
    const { status, category, limit = 10, page = 1 } = req.query;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock data when DB is not connected
      const mockIncidents = [
        {
          _id: 'mock-1',
          category: 'breakdown',
          description: 'Bus broke down on the main road',
          status: 'pending',
          location: { coordinates: [90.4125, 23.8103] },
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'mock-2',
          category: 'overcrowding',
          description: 'Too many passengers on the bus',
          status: 'investigating',
          location: { coordinates: [90.4125, 23.8103] },
          createdAt: new Date().toISOString(),
        },
      ];

      return res.json({
        incidents: mockIncidents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: mockIncidents.length,
          pages: 1,
        },
      });
    }

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const incidents = await Incident.find(query)
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Incident.countDocuments(query);

    res.json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get public dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock dashboard data when DB is not connected
      const mockStats = {
        totalIncidents: 247,
        resolvedIncidents: 189,
        pendingIncidents: 58,
        averageResolutionTime: 3.2, // days
        incidentsByCategory: {
          breakdown: 45,
          unsafe_driving: 32,
          overcrowding: 78,
          road_blockage: 56,
          other: 36
        },
        incidentsByStatus: {
          pending: 58,
          investigating: 23,
          resolved: 166
        },
        incidentsByZone: {
          "Dhaka North": 89,
          "Dhaka South": 76,
          "Dhaka Central": 82
        },
        resolutionTimeByZone: {
          "Dhaka North": 2.8,
          "Dhaka South": 3.5,
          "Dhaka Central": 3.1
        },
        recentActivity: [
          { date: "2026-04-20", incidents: 12, resolved: 8 },
          { date: "2026-04-19", incidents: 15, resolved: 11 },
          { date: "2026-04-18", incidents: 9, resolved: 7 },
          { date: "2026-04-17", incidents: 14, resolved: 10 },
          { date: "2026-04-16", incidents: 11, resolved: 9 }
        ]
      };
      return res.json(mockStats);
    }

    // Real database aggregation queries
    // Total and resolved incidents
    const totalIncidents = await Incident.countDocuments();
    const resolvedIncidents = await Incident.countDocuments({ status: 'resolved' });
    const pendingIncidents = await Incident.countDocuments({ status: 'pending' });

    // Average resolution time (days)
    const resolutionTimeStats = await Incident.aggregate([
      { $match: { status: 'resolved', resolutionTimeHours: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgHours: { $avg: '$resolutionTimeHours' } } }
    ]);
    const averageResolutionTime = resolutionTimeStats.length > 0 
      ? Math.round((resolutionTimeStats[0].avgHours / 24) * 10) / 10 
      : 0;

    // Incidents by category
    const categoryStats = await Incident.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const incidentsByCategory = {};
    categoryStats.forEach(cat => {
      incidentsByCategory[cat._id] = cat.count;
    });

    // Incidents by status
    const statusStats = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const incidentsByStatus = {};
    statusStats.forEach(stat => {
      incidentsByStatus[stat._id] = stat.count;
    });

    // Incidents by zone
    const zoneStats = await Incident.aggregate([
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const incidentsByZone = {};
    zoneStats.forEach(zone => {
      incidentsByZone[zone._id] = zone.count;
    });

    // Resolution time by zone
    const resolutionByZone = await Incident.aggregate([
      { $match: { status: 'resolved', resolutionTimeHours: { $exists: true, $ne: null } } },
      { $group: { _id: '$area', avgHours: { $avg: '$resolutionTimeHours' } } },
      { $sort: { _id: 1 } }
    ]);
    const resolutionTimeByZone = {};
    resolutionByZone.forEach(zone => {
      resolutionTimeByZone[zone._id] = Math.round((zone.avgHours / 24) * 10) / 10;
    });

    // Recent activity (last 5 days)
    const last5Days = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const submittedCount = await Incident.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const resolvedCount = await Incident.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      last5Days.push({
        date: dateStr,
        incidents: submittedCount,
        resolved: resolvedCount
      });
    }

    const stats = {
      totalIncidents,
      resolvedIncidents,
      pendingIncidents,
      averageResolutionTime,
      incidentsByCategory,
      incidentsByStatus,
      incidentsByZone,
      resolutionTimeByZone,
      recentActivity: last5Days
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Get incidents heatmap data (anonymized locations)
export const getIncidentsHeatmap = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock heatmap data
      const mockHeatmap = [
        { lat: 23.8103, lng: 90.4125, intensity: 15 },
        { lat: 23.7516, lng: 90.3800, intensity: 12 },
        { lat: 23.7276, lng: 90.4106, intensity: 18 },
        { lat: 23.7386, lng: 90.3964, intensity: 22 },
        { lat: 23.7948, lng: 90.4141, intensity: 14 },
        { lat: 23.8134, lng: 90.3586, intensity: 9 },
        { lat: 23.8679, lng: 90.3974, intensity: 16 },
        { lat: 23.7271, lng: 90.5258, intensity: 11 }
      ];
      return res.json(mockHeatmap);
    }

    // Real geospatial aggregation query
    // Group incidents into heatmap cells based on geographic proximity
    const heatmapData = await Incident.aggregate([
      {
        $match: {
          location: { $exists: true },
          status: { $ne: 'resolved' } // Only show active incidents
        }
      },
      {
        // Project coordinates and calculate grid cell
        $project: {
          coordinates: '$location.coordinates',
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
          // Calculate grid cell (0.01 degree precision ~1km)
          cellLat: {
            $floor: { $multiply: [{ $arrayElemAt: ['$location.coordinates', 1] }, 100] }
          },
          cellLng: {
            $floor: { $multiply: [{ $arrayElemAt: ['$location.coordinates', 0] }, 100] }
          }
        }
      },
      {
        // Group by grid cell to create heatmap cells
        $group: {
          _id: {
            cellLat: '$cellLat',
            cellLng: '$cellLng'
          },
          count: { $sum: 1 },
          avgLat: { $avg: '$lat' },
          avgLng: { $avg: '$lng' }
        }
      },
      {
        // Sort by count descending
        $sort: { count: -1 }
      },
      {
        // Format output for heatmap
        $project: {
          _id: 0,
          lat: '$avgLat',
          lng: '$avgLng',
          intensity: { $min: ['$count', 100] } // Cap intensity at 100 for visualization
        }
      }
    ]);

    res.json(heatmapData);
  } catch (error) {
    next(error);
  }
};

// Update incident status (admin only)
export const updateIncidentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock response when DB is not connected
      return res.json({
        message: 'Incident updated (mock mode)',
        incident: {
          _id: id,
          status,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    // Build update object based on status change
    const updateObj = { status };
    const now = new Date();

    if (status === 'investigating') {
      updateObj.investigatingAt = now;
    } else if (status === 'resolved') {
      updateObj.resolvedAt = now;
      
      // Calculate resolution time in hours
      const incident = await Incident.findById(id);
      if (incident && incident.submittedAt) {
        const resolutionTimeMs = now - new Date(incident.submittedAt);
        const resolutionTimeHours = Math.round(resolutionTimeMs / (1000 * 60 * 60) * 10) / 10;
        updateObj.resolutionTimeHours = resolutionTimeHours;
      }
    }

    const updatedIncident = await Incident.findByIdAndUpdate(
      id,
      updateObj,
      { new: true, runValidators: true }
    );

    if (!updatedIncident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json({ message: 'Incident updated', incident: updatedIncident });
  } catch (error) {
    next(error);
  }
};

// Get incident media file
export const getIncidentMedia = async (req, res, next) => {
  try {
    const { id, filename } = req.params;

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database connection unavailable' });
    }

    // Find incident and verify media file exists
    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    // Check if file is in incident's media array
    if (!incident.media.includes(filename) && !incident.media.some(m => m.includes(filename))) {
      return res.status(403).json({ message: 'Media file not found for this incident' });
    }

    // Construct file path
    const path = `./uploads/${filename}`;
    
    // Use sendFile to serve the file
    res.sendFile(path, { root: process.cwd() }, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(404).json({ message: 'File not found' });
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get operator performance metrics
export const getOperatorPerformance = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Return mock operator data
      const mockOperators = [
        {
          operator: 'DTCL',
          assignedIncidents: 156,
          resolvedIncidents: 142,
          resolutionRate: 91,
          avgResolutionTimeHours: 48,
          avgResolutionTimeDays: 2.0
        },
        {
          operator: 'Shyamoli',
          assignedIncidents: 98,
          resolvedIncidents: 85,
          resolutionRate: 87,
          avgResolutionTimeHours: 56,
          avgResolutionTimeDays: 2.3
        },
        {
          operator: 'Green Line',
          assignedIncidents: 124,
          resolvedIncidents: 110,
          resolutionRate: 89,
          avgResolutionTimeHours: 52,
          avgResolutionTimeDays: 2.2
        }
      ];
      return res.json(mockOperators);
    }

    // Real database aggregation for operator performance
    const operatorStats = await Incident.aggregate([
      {
        $match: {
          assignedTo: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          assignedIncidents: { $sum: 1 },
          resolvedIncidents: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          totalResolutionHours: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, '$resolutionTimeHours', 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          operator: '$_id',
          _id: 0,
          assignedIncidents: 1,
          resolvedIncidents: 1,
          resolutionRate: {
            $round: [
              { $multiply: [{ $divide: ['$resolvedIncidents', '$assignedIncidents'] }, 100] },
              1
            ]
          },
          avgResolutionTimeHours: {
            $round: [
              { $divide: ['$totalResolutionHours', { $cond: [{ $eq: ['$resolvedCount', 0] }, 1, '$resolvedCount'] }] },
              1
            ]
          },
          avgResolutionTimeDays: {
            $round: [
              { $divide: [
                { $divide: ['$totalResolutionHours', { $cond: [{ $eq: ['$resolvedCount', 0] }, 1, '$resolvedCount'] }] },
                24
              ]},
              1
            ]
          }
        }
      },
      {
        $sort: { resolutionRate: -1 }
      }
    ]);

    res.json(operatorStats);
  } catch (error) {
    next(error);
  }
};