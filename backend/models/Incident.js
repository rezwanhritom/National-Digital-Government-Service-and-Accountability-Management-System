import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['breakdown', 'unsafe_driving', 'overcrowding', 'road_blockage', 'other'],
    },
    busId: { type: String, trim: true },
    routeId: { type: String, trim: true },
    area: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    description: { type: String, required: true, trim: true },
    media: [{ type: String }], // Array of file paths or URLs
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved'],
      default: 'pending',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, if user is logged in
    aiClassification: { type: Object }, // Store AI classification result
  },
  { timestamps: true }
);

// Index for geospatial queries
incidentSchema.index({ location: '2dsphere' });

const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;