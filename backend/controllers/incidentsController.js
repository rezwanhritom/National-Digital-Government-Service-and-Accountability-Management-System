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
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required' });
    }

    // Handle file uploads
    const media = [];
    if (req.files) {
      req.files.forEach(file => {
        media.push(file.path); // Assuming multer saves to disk
      });
    }

    const geo = await deriveIncidentGeoContext({ latitude: lat, longitude: lon });
    const stops = await loadStopsDataset();
    const areas = buildIncidentAreasFromStops(stops);
    const areaSet = new Set(areas.map((a) => a.area));
    const requestedArea = String(areaRaw ?? '').trim();
    const autoArea = String(geo?.area ?? '').trim();
    const finalArea = areaSet.has(autoArea)
      ? autoArea
      : requestedArea && areaSet.has(requestedArea)
        ? requestedArea
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

    // Real database queries would go here
    // For now, return mock data since DB is not connected
    const mockStats = {
      totalIncidents: 247,
      resolvedIncidents: 189,
      pendingIncidents: 58,
      averageResolutionTime: 3.2,
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
    res.json(mockStats);
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

    // Real aggregation query would go here
    res.json([]);
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

    const incident = await Incident.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json({ message: 'Incident updated', incident });
  } catch (error) {
    next(error);
  }
};