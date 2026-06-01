import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // port 587 uses STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_KEY
    }
});

export default transporter;
