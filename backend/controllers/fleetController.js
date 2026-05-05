import FleetMetrics from '../models/FleetMetrics.js';
import TripLog from '../models/TripLog.js';
import SLAPolicy from '../models/SLAPolicy.js';
import mongoose from 'mongoose';

export const getFleetPerformance = async (req, res, next) => {
  try {
    const { routeId, vehicleId, operatorId, startDate, endDate, limit = 100 } = req.query;

    const query = {};
    if (routeId) query.routeId = routeId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (operatorId) query.operatorId = operatorId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const metrics = await FleetMetrics.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate('routeId', 'routeName');

    res.json({
      success: true,
      data: metrics,
      count: metrics.length
    });
  } catch (error) {
    next(error);
  }
};

export const getFleetKPIs = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const [
      totalTrips,
      onTimeTrips,
      delayedTrips,
      avgDelay,
      avgCrowding,
      slaCompliance
    ] = await Promise.all([
      FleetMetrics.countDocuments(dateFilter),
      FleetMetrics.countDocuments({ ...dateFilter, delayMinutes: { $lte: 5 } }),
      FleetMetrics.countDocuments({ ...dateFilter, delayMinutes: { $gt: 5 } }),
      FleetMetrics.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avgDelay: { $avg: '$delayMinutes' } } }
      ]),
      FleetMetrics.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avgCrowding: { $avg: '$crowdLevel' } } }
      ]),
      FleetMetrics.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, avgSLA: { $avg: '$slaComplianceScore' } } }
      ])
    ]);

    const onTimePercentage = totalTrips > 0 ? (onTimeTrips / totalTrips) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalTrips,
        onTimeTrips,
        delayedTrips,
        onTimePercentage: Math.round(onTimePercentage * 100) / 100,
        averageDelay: avgDelay[0]?.avgDelay || 0,
        averageCrowding: avgCrowding[0]?.avgCrowding || 0,
        slaComplianceScore: slaCompliance[0]?.avgSLA || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSLAPolicies = async (req, res, next) => {
  try {
    const policies = await SLAPolicy.find({})
      .sort({ routeId: 1 });

    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

export const updateSLAPolicy = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const updates = req.body;

    const policy = await SLAPolicy.findOneAndUpdate(
      { routeId },
      updates,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

export const getTripLogs = async (req, res, next) => {
  try {
    const { routeId, vehicleId, status, startDate, endDate, limit = 50 } = req.query;

    const query = {};
    if (routeId) query.routeId = routeId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.scheduledDepartureTime = {};
      if (startDate) query.scheduledDepartureTime.$gte = new Date(startDate);
      if (endDate) query.scheduledDepartureTime.$lte = new Date(endDate);
    }

    const trips = await TripLog.find(query)
      .sort({ scheduledDepartureTime: -1 })
      .limit(parseInt(limit))
      .populate('routeId', 'routeName');

    res.json({
      success: true,
      data: trips,
      count: trips.length
    });
  } catch (error) {
    next(error);
  }
};

export const getOperatorPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const performance = await FleetMetrics.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$operatorId',
          totalTrips: { $sum: 1 },
          onTimeTrips: {
            $sum: { $cond: [{ $lte: ['$delayMinutes', 5] }, 1, 0] }
          },
          avgDelay: { $avg: '$delayMinutes' },
          avgCrowding: { $avg: '$crowdLevel' },
          slaScore: { $avg: '$slaComplianceScore' }
        }
      },
      {
        $project: {
          operatorId: '$_id',
          totalTrips: 1,
          onTimeTrips: 1,
          onTimePercentage: {
            $multiply: [{ $divide: ['$onTimeTrips', '$totalTrips'] }, 100]
          },
          avgDelay: { $round: ['$avgDelay', 2] },
          avgCrowding: { $round: ['$avgCrowding', 2] },
          slaScore: { $round: ['$slaScore', 2] }
        }
      },
      { $sort: { onTimePercentage: -1 } }
    ]);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    next(error);
  }
};
