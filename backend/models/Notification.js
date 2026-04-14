import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true }, // নোটিফিকেশনের মূল মেসেজ বা ডেটা
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date }
}, { timestamps: true });

export default model('Notification', notificationSchema);