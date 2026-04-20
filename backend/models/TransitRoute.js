import mongoose from 'mongoose';

const transitRouteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    stops: [{ type: String, trim: true }],
    scheduleNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

transitRouteSchema.index({ name: 1 }, { unique: true });

const TransitRoute = mongoose.model('TransitRoute', transitRouteSchema);
export default TransitRoute;
