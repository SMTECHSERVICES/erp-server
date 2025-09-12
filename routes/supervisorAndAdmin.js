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
    getSupervisorAdminData,
    addPartNo,
    getOnePart,
    getPartDetails,
    getAllPartsNo,
    createSchedule,
    createInventory,
    getSchedule,
    getPartNoSchedule,
    getPartNoInventory,
    updatePartNoInfo,
    getWorkerTasks,
    updateInventoryDetail,
    getPartNoOperations,
    deletePartNo,
    createRawMaterialInventory,
    updateRawMaterialInventory,
    getRawMaterialInfo,
    countPcsOfPartNoCalculator,
    employeeAttendance,
    employeeProgressBar,
    generateInvoicePdf,
 getInvoice
    } from '../controllers/supervisorAndAdmin.js';
import { supervisorAndAdminMiddleware } from '../middleware/supervisorAndAdmin.js';
import logout from '../controllers/logout.js';
import upload from '../middleware/multer.js';

const router = express.Router();

router.use(supervisorAndAdminMiddleware);

//RAW MATERIAL 

router.post("/add-raw-material",createRawMaterialInventory);
router.patch("/update-rawMaterial-Inventory",updateRawMaterialInventory);
router.get("/raw-material-info",getRawMaterialInfo)
router.post("/findPcs",countPcsOfPartNoCalculator)
//ADDING PART NUMBER HERE

router.post("/addPartNo",upload.single("drawingFile"),addPartNo);
router.get("/allPartNo",getAllPartsNo)
router.get('/partNo',getOnePart);
router.get("/part-detail/:id",getPartDetails);
router.patch('/partNoDetail-update/:partNoId',upload.single('drawingFile'),updatePartNoInfo);
router.delete("/partNo-delete/:partNoId",deletePartNo)

router.post("/create-schedule",createSchedule);
router.post("/create-inventory",createInventory);
router.post("/get-schedule",getSchedule)

router.get("/inventoryItem",getInventoryItem);
router.get("/partNoSchedule/:partNoId",getPartNoSchedule);
router.get("/partNoInventory/:partNoId",getPartNoInventory)

router.get('/product-detail/:productId',getItemDetails)

router.post('/employee-Registraion',upload.single("photo"),employeeRegistration);

router.post('/addProductTo-inventory',addInventoryProduct);

router.patch('/update-inventory/:productId',upadateInventoryProduct);

router.get('/employee',getAllWorkers);

router.get("/employe-detail/:workerId",getWorkerDetail);
router.get('/employe-tasks/:workerId',getWorkerTasks)

router.post('/assign-employee-task/:workerId',assignTaskToWoker);
router.put("/update-inventory/:id",updateInventoryDetail)

router.patch("/mark-task-complete/:taskId",markTaskComplete);

router.post("/create-production",createProduction);

router.get("/get-Productions",getProduction)
router.get("/get-Production-Detail/:productionId",getProductionDetail)

router.post('/create-stages/:productionId',createStages);

router.patch("/finishProduction/:productionId",finishProduction);

router.get("/getAllTask",getAllTask);
router.get("/get-partNo-operation/:partNoId",getPartNoOperations)
router.get('/supervisor-dashboard-Data',getSupervisorAdminData);
router.get("/employee-attendance/:employeeId",employeeAttendance);
router.get('/employee/get-progrees/:employeeId',employeeProgressBar);
router.post('/invoice/pdf/generate', generateInvoicePdf);

// helper: returns template page size so you can calculate coordinates on client
router.get('/invoice', getInvoice);


router.post('/logout',logout)



export default router