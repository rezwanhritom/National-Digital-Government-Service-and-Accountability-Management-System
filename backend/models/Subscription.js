import { Schema, model } from 'mongoose';

const subscriptionSchema = new Schema({
    userId: { type: String, required: true }, // ইউজারের আইডি
    type: { type: String, required: true }, // যেমন: 'route_delay', 'severe_congestion'
    routeId: { type: String },
    stopId: { type: String },
    commuteId: { type: String },
    thresholds: { type: Schema.Types.Mixed }, // JSON ডেটা রাখার জন্য Mixed type, যেমন: { delay_minutes: 15 }
    channels: { type: [String], required: true } // যেমন: ['email', 'in-app']
}, { timestamps: true }); // এটি স্বয়ংক্রিয়ভাবে createdAt এবং updatedAt ফিল্ড তৈরি করবে

export default model('Subscription', subscriptionSchema);

