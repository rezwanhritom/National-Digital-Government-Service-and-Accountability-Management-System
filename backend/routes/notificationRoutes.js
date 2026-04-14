import sendEmailNotification from '../services/emailService.js';

// ৪. ইমেইল নোটিফিকেশন টেস্টিং রাউট (POST: /api/subscriptions/test-email)
router.post('/test-email', async (req, res) => {
    try {
        const { email, subject, message } = req.body;

        const result = await sendEmailNotification(email, subject, message);

        if (result.success) {
            res.status(200).json({ message: "Test email sent successfully!" });
        } else {
            res.status(500).json({ error: "Failed to send email", details: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});