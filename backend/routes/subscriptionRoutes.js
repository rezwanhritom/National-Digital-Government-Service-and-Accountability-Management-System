import express from 'express';
import Subscription from '../models/Subscription.js'; // শেষে .js অবশ্যই দিতে হবে

const router = express.Router();

// ১. নতুন সাবস্ক্রিপশন তৈরি করা (POST: /api/subscriptions)
router.post('/', async (req, res) => {
    try {
        const newSubscription = new Subscription(req.body);
        const savedSubscription = await newSubscription.save();
        res.status(201).json({ message: "Subscription created successfully!", data: savedSubscription });
    } catch (error) {
        res.status(500).json({ error: "Failed to create subscription", details: error.message });
    }
});

// ২. ইউজারের সাবস্ক্রিপশন লিস্ট দেখা (GET: /api/subscriptions/:userId)
router.get('/:userId', async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.params.userId });
        res.status(200).json({ data: subscriptions });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
});

// ৩. সাবস্ক্রিপশন ডিলিট করা (DELETE: /api/subscriptions/:id)
router.delete('/:id', async (req, res) => {
    try {
        await Subscription.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Subscription deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete subscription" });
    }
});

export default router;