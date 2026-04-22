import FleetMetrics from '../models/FleetMetrics.js';
import TripLog from '../models/TripLog.js';
import SLAPolicy from '../models/SLAPolicy.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get fleet metrics with filters
export const getFleetMetrics = asyncHandler(async (req, res) => {
  const { startDate, endDate, busId, routeId, status } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }
  if (busId) filter.busId = busId;
  if (routeId) filter.routeId = routeId;
  if (status) filter.status = status;

  const metrics = await FleetMetrics.find(filter)
    .populate('busId', 'busNumber plateNumber')
    .populate('routeId', 'routeCode routeName')
    .sort({ timestamp: -1 })
    .limit(100);

  res.json({
    success: true,
    data: metrics,
    count: metrics.length
  });
});

// Get single fleet metric
export const getFleetMetricById = asyncHandler(async (req, res) => {
  const metric = await FleetMetrics.findById(req.params.id)
    .populate('busId')
    .populate('routeId');

  if (!metric) {
    return res.status(404).json({ success: false, message: 'Metric not found' });
  }

  res.json({ success: true, data: metric });
});

// Create fleet metric
export const createFleetMetric = asyncHandler(async (req, res) => {
  const metric = new FleetMetrics(req.body);
  await metric.save();

  res.status(201).json({
    success: true,
    message: 'Fleet metric recorded',
    data: metric
  });
});

// Get trip logs with detailed trip information
export const getTripLogs = asyncHandler(async (req, res) => {
  const { startDate, endDate, busId, status, minDelay, maxDelay } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.tripDate = {};
    if (startDate) filter.tripDate.$gte = new Date(startDate);
    if (endDate) filter.tripDate.$lte = new Date(endDate);
  }
  if (busId) filter.busId = busId;
  if (status) filter.status = status;
  if (minDelay || maxDelay) {
    filter.delayMinutes = {};
    if (minDelay) filter.delayMinutes.$gte = parseInt(minDelay);
    if (maxDelay) filter.delayMinutes.$lte = parseInt(maxDelay);
  }

  const trips = await TripLog.find(filter)
    .populate('busId', 'busNumber plateNumber')
    .populate('routeId', 'routeCode routeName')
    .sort({ tripDate: -1 })
    .limit(200);

  res.json({
    success: true,
    data: trips,
    count: trips.length
  });
});

// Record a new trip
export const recordTrip = asyncHandler(async (req, res) => {
  const { busId, routeId, tripDate, scheduledDeparture, actualDeparture, scheduledArrival, actualArrival, passengersBoarded, passengersAlighted } = req.body;

  // Calculate delay
  const delayMinutes = actualArrival ? Math.round((new Date(actualArrival) - new Date(scheduledArrival)) / 60000) : 0;
  const status = delayMinutes > 5 ? 'DELAYED' : delayMinutes < -5 ? 'EARLY' : 'ON_TIME';

  const trip = new TripLog({
    busId,
    routeId,
    tripDate,
    scheduledDeparture,
    actualDeparture,
    scheduledArrival,
    actualArrival,
    delayMinutes,
    status,
    passengersBoarded: passengersBoarded || 0,
    passengersAlighted: passengersAlighted || 0,
    completedStops: 0,
    missedStops: 0,
    incidents: []
  });

  await trip.save();

  res.status(201).json({
    success: true,
    message: 'Trip recorded successfully',
    data: trip
  });
});

// Get SLA compliance for a bus or route
export const getSLACompliance = asyncHandler(async (req, res) => {
  const { busId, routeId, startDate, endDate } = req.query;

  const filter = {};
  if (busId) filter.busId = busId;
  if (routeId) filter.routeId = routeId;
  if (startDate || endDate) {
    filter.tripDate = {};
    if (startDate) filter.tripDate.$gte = new Date(startDate);
    if (endDate) filter.tripDate.$lte = new Date(endDate);
  }

  // Get trip logs
  const trips = await TripLog.find(filter);

  // Calculate compliance metrics
  const onTimeTrips = trips.filter(t => t.delayMinutes <= 5).length;
  const totalTrips = trips.length;
  const onTimePercentage = totalTrips > 0 ? (onTimeTrips / totalTrips) * 100 : 0;

  // Get applicable SLA policy
  let slaPolicy = null;
  if (routeId) {
    slaPolicy = await SLAPolicy.findOne({ routeId, isActive: true });
  }

  const targetPercentage = slaPolicy?.onTimePercentageTarget || 95;
  const isMeetingSLA = onTimePercentage >= targetPercentage;

  res.json({
    success: true,
    data: {
      onTimePercentage,
      targetPercentage,
      onTimeTrips,
      totalTrips,
      isMeetingSLA,
      slaPolicy: slaPolicy || null
    }
  });
});

// Get SLA policies
export const getSLAPolicies = asyncHandler(async (req, res) => {
  const policies = await SLAPolicy.find({ isActive: true })
    .populate('routeId', 'routeCode routeName')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: policies,
    count: policies.length
  });
});

// Create or update SLA policy
export const upsertSLAPolicy = asyncHandler(async (req, res) => {
  const { routeId, onTimePercentageTarget, maxAllowedDelayMinutes, description } = req.body;

  let policy = await SLAPolicy.findOne({ routeId, isActive: true });

  if (policy) {
    policy.onTimePercentageTarget = onTimePercentageTarget || policy.onTimePercentageTarget;
    policy.maxAllowedDelayMinutes = maxAllowedDelayMinutes || policy.maxAllowedDelayMinutes;
    policy.description = description || policy.description;
    await policy.save();
  } else {
    policy = new SLAPolicy({
      routeId,
      onTimePercentageTarget,
      maxAllowedDelayMinutes,
      description
    });
    await policy.save();
  }

  res.status(201).json({
    success: true,
    message: 'SLA policy saved',
    data: policy
  });
});

// Get fleet performance summary
export const getFleetPerformanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  const summary = await FleetMetrics.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        averageSpeed: { $avg: '$speed' },
        totalDistance: { $sum: '$distance' },
        totalFuelConsumption: { $sum: '$fuelConsumption' },
        averagePassengers: { $avg: '$passengerCount' },
        vehicleCount: { $sum: 1 },
        statusBreakdown: { $push: '$status' }
      }
    },
    {
      $project: {
        _id: 0,
        averageSpeed: { $round: ['$averageSpeed', 2] },
        totalDistance: { $round: ['$totalDistance', 2] },
        totalFuelConsumption: { $round: ['$totalFuelConsumption', 2] },
        averagePassengers: { $round: ['$averagePassengers', 2] },
        vehicleCount: 1,
        statusDistribution: {
          $reduce: {
            input: '$statusBreakdown',
            initialValue: { ACTIVE: 0, IDLE: 0, MAINTENANCE: 0 },
            in: {
              ACTIVE: {
                $cond: [{ $eq: ['$$this', 'ACTIVE'] }, { $add: ['$$value.ACTIVE', 1] }, '$$value.ACTIVE']
              },
              IDLE: {
                $cond: [{ $eq: ['$$this', 'IDLE'] }, { $add: ['$$value.IDLE', 1] }, '$$value.IDLE']
              },
              MAINTENANCE: {
                $cond: [{ $eq: ['$$this', 'MAINTENANCE'] }, { $add: ['$$value.MAINTENANCE', 1] }, '$$value.MAINTENANCE']
              }
            }
          }
        }
      }
    }
  ]);

  res.json({
    success: true,
    data: summary[0] || {
      averageSpeed: 0,
      totalDistance: 0,
      totalFuelConsumption: 0,
      averagePassengers: 0,
      vehicleCount: 0,
      statusDistribution: { ACTIVE: 0, IDLE: 0, MAINTENANCE: 0 }
    }
  });
});
