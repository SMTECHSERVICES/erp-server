import express from 'express';
import { addInventoryProduct,
     employeeRegistration,
      getAllWorkers, 
      getInventoryItem, 
      getItemDetails, 
      upadateInventoryProduct,
    assignTaskToWoker,
    getWorkerDetail,
    markTaskComplete,
    createProduction,
    createStages,
    getProduction,
    getProductionDetail,
    finishProduction,
    getAllTask,
    getSupervisorAdminData
    } from '../controllers/supervisorAndAdmin.js';
import { supervisorAndAdminMiddleware } from '../middleware/supervisorAndAdmin.js';
import logout from '../controllers/logout.js';

const router = express.Router();

router.use(supervisorAndAdminMiddleware);

router.get("/inventoryItem",getInventoryItem)

router.get('/product-detail/:productId',getItemDetails)

router.post('/employee-Registraion',employeeRegistration);

router.post('/addProductTo-inventory',addInventoryProduct);

router.patch('/update-inventory/:productId',upadateInventoryProduct);

router.get('/employee',getAllWorkers);

router.get("/employe-detail/:workerId",getWorkerDetail)

router.post('/assign-employee-task/:workerId',assignTaskToWoker);

router.patch("/mark-task-complete/:taskId",markTaskComplete);

router.post("/create-production",createProduction);

router.get("/get-Productions",getProduction)
router.get("/get-Production-Detail/:productionId",getProductionDetail)

router.post('/create-stages/:productionId',createStages);

router.patch("/finishProduction/:productionId",finishProduction);

router.get("/getAllTask",getAllTask)
router.get('/supervisor-dashboard-Data',getSupervisorAdminData)

router.post('/logout',logout)



export default router