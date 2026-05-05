import mongoose from 'mongoose';

const fleetMetricsSchema = new mongoose.Schema(
  {
    // Identifiers
    routeId: { type: String, required: true, trim: true, index: true },
    vehicleId: { type: String, required: true, trim: true, index: true },
    operatorId: { type: String, trim: true, index: true },
    tripId: { type: String, trim: true, index: true },
    
    // Trip details
    scheduleTime: { type: Date, required: true },
    actualArrivalTime: { type: Date },
    actualDepartureTime: { type: Date },
    tripStatus: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'missed', 'delayed', 'early'],
      default: 'scheduled',
    },
    
    // Delay and performance metrics
    delayMinutes: { type: Number, default: 0 }, // Negative for early arrivals
    crowdLevel: { type: Number, min: 0, max: 100 }, // Percentage occupancy
    passengerCount: { type: Number, default: 0 },
    fuelUsed: { type: Number }, // Liters
    distance: { type: Number }, // Kilometers
    
    // SLA tracking
    slaCompliant: { type: Boolean, default: true },
    slaComplianceScore: { type: Number, min: 0, max: 100 }, // Percentage
    
    // Timestamps
    date: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compound indexes for common queries
fleetMetricsSchema.index({ routeId: 1, date: 1 });
fleetMetricsSchema.index({ vehicleId: 1, date: 1 });
fleetMetricsSchema.index({ operatorId: 1, date: 1 });
fleetMetricsSchema.index({ tripStatus: 1, date: 1 });

const FleetMetrics = mongoose.model('FleetMetrics', fleetMetricsSchema);
export default FleetMetrics;
