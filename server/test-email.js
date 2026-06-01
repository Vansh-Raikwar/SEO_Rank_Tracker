import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

console.log("Testing SMTP with config:");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_KEY
    },
    debug: true,
    logger: true
});

const mailOptions = {
    from: process.env.SMTP_SENDER,
    to: "vanshraikwar880@gmail.com", 
    subject: "Dummy Test Email",
    text: "This is a dummy test email to verify SMTP delivery."
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error("SMTP Error:", error);
    } else {
        console.log("SMTP Success:", info.response);
    }
    process.exit();
});
