import mongoose from 'mongoose';

const slaPolicySchema = new mongoose.Schema(
  {
    // Route identification
    routeId: { type: String, required: true, trim: true, unique: true, index: true },
    routeName: { type: String, trim: true },
    
    // On-time thresholds
    onTimeThresholdMinutes: {
      type: Number,
      default: 5, // Trips within 5 minutes of schedule are considered on-time
    },
    
    // Delay thresholds
    maxAcceptableDelayMinutes: {
      type: Number,
      default: 15, // Beyond this is considered severe delay
    },
    
    // Performance targets
    onTimePercentageTarget: {
      type: Number,
      min: 0,
      max: 100,
      default: 90, // Target: 90% of trips on-time
    },
    
    tripCompletionRateTarget: {
      type: Number,
      min: 0,
      max: 100,
      default: 98, // Target: 98% of scheduled trips completed
    },
    
    averageDelayTarget: {
      type: Number,
      default: 8, // Target: Average delay should not exceed 8 minutes
    },
    
    // Crowding targets
    maxCrowdingPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100, // Max acceptable crowding level
    },
    
    averageCrowdingTarget: {
      type: Number,
      min: 0,
      max: 100,
      default: 70, // Target average crowding
    },
    
    // SLA compliance score calculation
    // Weights for different metrics
    metricsWeights: {
      onTimePercentage: { type: Number, default: 0.4 },
      tripCompletionRate: { type: Number, default: 0.3 },
      averageDelay: { type: Number, default: 0.2 },
      crowding: { type: Number, default: 0.1 },
    },
    
    // Alert thresholds
    alertThresholds: {
      onTimePercentage: { type: Number, default: 85 }, // Alert if drops below
      tripCompletionRate: { type: Number, default: 95 }, // Alert if drops below
      averageDelay: { type: Number, default: 12 }, // Alert if exceeds
    },
    
    // Status
    isActive: { type: Boolean, default: true, index: true },
    
    // Metadata
    description: { type: String, trim: true },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

const SLAPolicy = mongoose.model('SLAPolicy', slaPolicySchema);
export default SLAPolicy;
