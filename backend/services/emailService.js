import nodemailer from 'nodemailer';

// ইমেইল পাঠানোর মেইন ফাংশন
const sendEmailNotification = async (to, subject, text, html = null) => {
    try {
        // ট্রান্সপোর্টার তৈরি (SMTP কনফিগারেশন)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com', // ডিফল্ট হিসেবে জিমেইল
            port: process.env.SMTP_PORT || 587,
            secure: false, // 465 পোর্টের জন্য true, 587 এর জন্য false
            auth: {
                user: process.env.SMTP_USER, // তোমার ইমেইল এড্রেস (.env থেকে আসবে)
                pass: process.env.SMTP_PASS, // অ্যাপ পাসওয়ার্ড (.env থেকে আসবে)
            },
        });

        // ইমেইল অপশন সেট করা
        const mailOptions = {
            from: `"Dhaka Smart Transit" <${process.env.SMTP_USER}>`, // প্রেরকের নাম ও ইমেইল
            to: to, // প্রাপকের ইমেইল
            subject: subject, // ইমেইলের বিষয়
            text: text, // প্লেইন টেক্সট মেসেজ
        };

        // যদি HTML টেমপ্লেট থাকে, তবে সেটি যুক্ত করবে
        if (html) {
            mailOptions.html = html;
        }

        // ইমেইল পাঠানো
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error(`Failed to send email to ${to}. Error:`, error.message);
        return { success: false, error: error.message };
    }
};

export default sendEmailNotification;
