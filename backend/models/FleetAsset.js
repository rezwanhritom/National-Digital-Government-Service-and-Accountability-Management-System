import mongoose from 'mongoose';

const fleetAssetSchema = new mongoose.Schema(
  {
    busCode: { type: String, required: true, trim: true, unique: true },
    operatorName: { type: String, required: true, trim: true },
    gpsDeviceId: { type: String, trim: true, default: '' },
    routeNames: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

fleetAssetSchema.index({ operatorName: 1, isActive: 1 });

const FleetAsset = mongoose.model('FleetAsset', fleetAssetSchema);
export default FleetAsset;
