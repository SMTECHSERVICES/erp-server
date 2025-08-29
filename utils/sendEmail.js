// utils/sendEmail.js

import nodemailer from "nodemailer";

export const sendOTPEmail = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or use your custom SMTP
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App password (not your real password)
      },
    });

    const mailOptions = {
      from: `"SM Services" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your OTP for Login Verification",
      html: `<p>Hello,</p><p>Your OTP is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP email sent");
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};
