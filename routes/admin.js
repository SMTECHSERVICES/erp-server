import express from 'express';
import jwt from 'jsonwebtoken'
import { sendOTPEmail } from '../utils/sendEmail.js';
import Admin from '../model/admin.js';
import {  getAdminDashboardData, getAllEmployee, sendOTP, verifyOtplogin, verifyOtpRegister } from '../controllers/admin.js';
import { superAdminMiddleware } from '../middleware/superAdmin.js';
import logout from '../controllers/logout.js';

const router = express.Router();

//Step 1 :Send Otp
router.post("/send-otp",sendOTP);


// Step 2: Verify OTP and register
router.post("/verify-otp-register",verifyOtpRegister);

//THis route is for adminlogin
router.post("/login",verifyOtplogin);

router.use(superAdminMiddleware)

router.get("/dashboard-data",getAdminDashboardData)

router.get('/all-employee',getAllEmployee)

router.post('/logout',logout)










export default router;