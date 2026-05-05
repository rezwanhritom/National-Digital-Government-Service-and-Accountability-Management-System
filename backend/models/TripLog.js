import mongoose from 'mongoose';

const tripLogSchema = new mongoose.Schema(
  {
    // Trip identification
    tripId: { type: String, required: true, trim: true, unique: true, index: true },
    routeId: { type: String, required: true, trim: true, index: true },
    vehicleId: { type: String, required: true, trim: true, index: true },
    operatorId: { type: String, trim: true, index: true },
    
    // Schedule information
    scheduleId: { type: String, trim: true },
    scheduledDepartureTime: { type: Date, required: true },
    scheduledArrivalTime: { type: Date, required: true },
    
    // Actual times
    actualDepartureTime: { type: Date },
    actualArrivalTime: { type: Date },
    
    // Trip status and completion
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    cancellationReason: { type: String, trim: true },
    
    // Performance metrics
    passengers: { type: Number, default: 0 },
    crowdLevel: { type: Number, min: 0, max: 100 },
    delayMinutes: { type: Number, default: 0 },
    earlyMinutes: { type: Number, default: 0 },
    distance: { type: Number }, // Kilometers
    fuelUsed: { type: Number }, // Liters
    
    // Stops on this trip
    stops: [
      {
        stopId: String,
        stopName: String,
        scheduledArrival: Date,
        actualArrival: Date,
        passengersBoarded: Number,
        passengersAlighted: Number,
      },
    ],
    
    // Incidents during trip
    incidents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Incident',
      },
    ],
    
    // Notes
    notes: { type: String, trim: true },
    
    // Date tracking
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// Indexes for common queries
tripLogSchema.index({ routeId: 1, date: 1 });
tripLogSchema.index({ vehicleId: 1, date: 1 });
tripLogSchema.index({ status: 1, date: 1 });

const TripLog = mongoose.model('TripLog', tripLogSchema);
export default TripLog;
