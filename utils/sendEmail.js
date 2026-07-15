// utils/sendEmail.js

import nodemailer from "nodemailer";

export const sendOTPEmail = async (toEmail, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are not configured");
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or use your custom SMTP
      secure: true,
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
    throw new Error(error.message || "Failed to send OTP email");
  }
};
