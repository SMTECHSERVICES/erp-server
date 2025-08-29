import express from 'express';
import { employeeLogin, getMyDetails, markInTime, markOutTime, myAttendance, MyTask } from '../controllers/employee.js';
import { employeeVerificationMiddleware } from '../middleware/employee.js';
import logout from '../controllers/logout.js';



const router = express.Router();

router.post('/login',employeeLogin)
router.use(employeeVerificationMiddleware);
router.post('/mark-inTimeAttendance',markInTime);
router.post('/mark-outTimeAttendance',markOutTime);
router.get('/get-detail',getMyDetails);
router.get("/my-attendance",myAttendance);
router.get('/my-task',MyTask)

router.post('/logout',logout)





export default router;