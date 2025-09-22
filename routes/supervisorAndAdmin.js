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

router.post('/employee-Registraion',upload.single("photo"),employeeRegistration);


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


// invoiceGenerator.js
// Usage: import { generateAndSaveInvoice } from './invoiceGenerator.js';

// utils/invoiceGenerator.js
// routes/invoiceRoutes.js

import PDFDocument from "pdfkit";
import stream from "stream";
import { promisify } from "util";
import Invoice from '../model/invoice.js';
import cloudinary from "../utils/cloudinary.js"; // should export configured cloudinary v2 instance


const pipeline = promisify(stream.pipeline);

// --- PDF builder: returns Buffer ---
async function buildInvoicePdfBuffer(data = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const buffers = [];
  doc.on("data", (b) => buffers.push(b));
  const ended = new Promise((resolve) => doc.on("end", resolve));

  // --- HEADER (seller) ---
  doc.fontSize(14).text(data.sellerName || "Seller Name", { align: "left" });
  if (data.sellerAddress) {
    doc.moveDown(0.2);
    (typeof data.sellerAddress === "string" ? data.sellerAddress.split("\n") : (data.sellerAddress || [])).forEach((ln) => {
      doc.fontSize(10).text(ln, { align: "left" });
    });
  }

  doc.moveDown(0.8);
  doc.fontSize(18).text("TAX INVOICE", { align: "center" });
  doc.moveDown(0.6);

  // --- META (invoice number / date) ---
  doc.fontSize(10);
  const invoiceNo = data.invoiceNo || "";
  const invoiceDate = data.invoiceDate || "";
  // left: invoice no, right: date
  doc.text(`Invoice No: ${invoiceNo}`, { continued: true }).text(`    Date: ${invoiceDate}`, { align: "right" });
  doc.moveDown(0.6);

  // --- BILL TO / SHIP TO ---
  doc.fontSize(10).text("Bill To:", { underline: true });
  (data.billTo ? data.billTo.split("\n") : [""]).forEach((ln) => doc.text(ln));
  doc.moveDown(0.4);
  doc.fontSize(10).text("Ship To:", { underline: true });
  (data.shipTo ? data.shipTo.split("\n") : [""]).forEach((ln) => doc.text(ln));
  doc.moveDown(0.6);

  // --- TABLE HEADER ---
  const startX = doc.x;
  doc.font("Helvetica-Bold");
  doc.fontSize(10);
  doc.text("S.No", startX, doc.y, { width: 40 });
  doc.text("Description", startX + 40, doc.y, { width: 260 });
  doc.text("HSN", startX + 300, doc.y, { width: 60, align: "right" });
  doc.text("Rate", startX + 360, doc.y, { width: 60, align: "right" });
  doc.text("Qty", startX + 420, doc.y, { width: 40, align: "right" });
  doc.text("Amount", startX + 460, doc.y, { width: 90, align: "right" });
  doc.moveDown(0.5);
  doc.font("Helvetica");

  // --- ITEMS ---
  const items = Array.isArray(data.items) ? data.items : [];
  let total = 0;
  items.forEach((it, i) => {
    const unit = Number(it.unitPrice || 0);
    const qty = Number(it.qty || 0);
    const amount = Number((unit * qty).toFixed(2));
    total += amount;

    const rowY = doc.y;
    doc.fontSize(10).text(String(i + 1), startX, rowY, { width: 40 });
    doc.text(it.description || "", startX + 40, rowY, { width: 260 });
    doc.text(it.hsn || "", startX + 300, rowY, { width: 60, align: "right" });
    doc.text(unit.toFixed(2), startX + 360, rowY, { width: 60, align: "right" });
    doc.text(qty.toString(), startX + 420, rowY, { width: 40, align: "right" });
    doc.text(amount.toFixed(2), startX + 460, rowY, { width: 90, align: "right" });

    doc.moveDown(0.6);

    // if page bottom reached, add new page and re-draw header (basic)
    if (doc.y > 720) {
      doc.addPage();
      doc.moveDown(1);
    }
  });

  doc.moveDown(0.6);

  // --- TAXES & TOTALS ---
  const sgstPercent = Number(data.sgstPercent || 0);
  const cgstPercent = Number(data.cgstPercent || 0);
  const sgstAmount = Number(((total * sgstPercent) / 100).toFixed(2));
  const cgstAmount = Number(((total * cgstPercent) / 100).toFixed(2));
  const grandTotal = Number((total + sgstAmount + cgstAmount).toFixed(2));

  doc.fontSize(10).text(`Total: ${total.toFixed(2)}`, { align: "right" });
  if (sgstPercent > 0) doc.text(`SGST (${sgstPercent}%): ${sgstAmount.toFixed(2)}`, { align: "right" });
  if (cgstPercent > 0) doc.text(`CGST (${cgstPercent}%): ${cgstAmount.toFixed(2)}`, { align: "right" });
  doc.font("Helvetica-Bold").text(`Grand Total: ${grandTotal.toFixed(2)}`, { align: "right" });
  doc.font("Helvetica");

  doc.moveDown(1);

  // --- BANK DETAILS ---
  doc.fontSize(10).text("Bank Details:", { underline: true });
  if (data.bank) {
    doc.text(`Bank: ${data.bank.name || ""}`);
    doc.text(`A/C: ${data.bank.account || ""}`);
    doc.text(`IFSC: ${data.bank.ifsc || ""}`);
  } else {
    doc.text("Bank details not provided.");
  }

  doc.end();
  await ended;
  return Buffer.concat(buffers);
}

// --- Upload buffer to Cloudinary (stream) ---
function uploadBufferToCloudinary(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder || "invoices",
        public_id: opts.public_id,
        resource_type: "raw",   // 👈 yeh important hai PDF ke liye
        format: "pdf",          // 👈 force pdf format
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const readStream = stream.Readable.from(buffer);
    readStream.pipe(uploadStream);
  });
}


// --- Route: generate PDF, upload, save DB ---
router.post("/invoice/pdf/generate", async (req, res, next) => {
  try {
    const payload = req.body || {};

    // Create PDF buffer
    const pdfBuffer = await buildInvoicePdfBuffer(payload);

    // upload to cloudinary
    const publicId = `${payload.invoiceNo || "inv"}-${Date.now()}`;
    const cloudRes = await uploadBufferToCloudinary(pdfBuffer, { public_id: publicId, folder: "invoices" });

    // save to mongodb
    const invDoc = new Invoice({
      date: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
      url: cloudRes.secure_url, // cloudinary secure url
      publicId: cloudRes.public_id,
    });
    const saved = await invDoc.save();

    return res.status(200).json({ savedInvoice: saved, cloudinary: cloudRes });
  } catch (err) {
    console.error("POST /invoice/pdf/generate error:", err);
    return next(err);
  }
});

// --- Route: get latest invoice metadata ---
router.get("/invoice", async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne().sort({ createdAt: -1, _id: -1 });
    if (!invoice) return res.status(404).json({ message: "No invoice found" });
    return res.status(200).json({
      invoice: { _id: invoice._id, url: invoice.url, date: invoice.date || invoice.createdAt },
    });
  } catch (err) {
    console.error("GET /invoice error:", err);
    return next(err);
  }
});



router.post('/logout',logout)



export default router