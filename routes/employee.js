import express from 'express';
import { employeeLogin, getMyDetails, markInTime, markOutTime, myAttendance, MyTask,markTaskComplete,allMyTasks,myProgressbar } from '../controllers/employee.js';
import { employeeVerificationMiddleware } from '../middleware/employee.js';
import logout from '../controllers/logout.js';



const router = express.Router();

router.post('/login',employeeLogin)
router.use(employeeVerificationMiddleware);
router.post('/mark-inTimeAttendance',markInTime);
router.post('/mark-outTimeAttendance',markOutTime);
router.get('/get-detail',getMyDetails);
router.get("/my-attendance",myAttendance);
router.get('/my-task',MyTask);
router.post('/all-my-tasks',allMyTasks);
router.post('/mark-taskComplete/:taskId',markTaskComplete);
router.get("/my-task-Progress",myProgressbar)

router.post('/logout',logout)

 



export default router;