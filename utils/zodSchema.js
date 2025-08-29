// ✅ utils/zodSchemas.js
import * as z from 'zod';

export const sendOtpSchema = z.object({
  email: z.email()  // ❗ FIXED: use z.string().email()
});

export const verifyOtpRegisterSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters")  // ❗ You were not using it in controller
});

export const verifyOtpLoginSchema = z.object({
  email: z.email(),
  otp: z.string().length(6),
  adminKey: z.string().min(1, "Admin Key is required")
});

export const employeeRegistrationSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),  // ✅ improved validation
  role: z.enum(['SUPERVISOR', 'WORKER']), // 🔍 Better to use enums to avoid typos
  password: z.string().min(6)
});


export const employeeLoginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),  // ✅ improved validation
  password: z.string().min(6)
});