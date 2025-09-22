import { success } from "zod";
import { ErrorHandler } from "../middleware/errorHandler.js";
import path from "path";
import Invoice from '../model/invoice.js'
import Employee from "../model/employee.js";
import Inventory from "../model/inventory.js";
import { fileURLToPath } from "url";
import { employeeRegistrationSchema, partNoZodSchema } from "../utils/zodSchema.js";
import { timeStringToSeconds,secondsToTimeString } from "../utils/calculteMsAndConvert.js";
import Task from "../model/task.js";
import Production from "../model/production.js";
import dayjs from "dayjs";
import Attendance from "../model/attendance.js";
import PartNo from "../model/partNo.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs"
import { calcPipeRm, calcRoundBarRM } from "../utils/calculateRawMaterialWeight.js";
import { nextTick } from "process";
import Schedule from "../model/schedule.js";
import mongoose from "mongoose";
import { errorMonitor } from "events";
import { ta } from "zod/v4/locales";
import { calcGrossWeight } from "../utils/calcGrossWeight.js";
import RawMaterial from "../model/rawMaterial.js";
import {calculatePcs} from "../utils/calculatePcs.js";

export const employeeRegistration = async (req, res, next) => {
  // const result = employeeRegistrationSchema.safeParse(req.body);
  // if (!result.success) {
  //   return next(new ErrorHandler(result.error.issues[0].message, 400))
  // }

  //console.log(result.data)
  const { name, phone, role } = req.body;
  console.log(req.body)
  if(!name || !phone ||!role){
    return next(new ErrorHandler("Please provide all the details"))
  }
  console.log("hie helloe")

      if (!req.file) {
      return next(new ErrorHandler("Photo  is required", 400));
    }
    console.log("whatsup")
   // console.log(req.file)
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;
    const uploadResult = await cloudinary.uploader.upload(base64File, {
      resource_type: "auto",
      folder: "employeePhotos",
    });
  let p = "vr@123"
  console.log("after p")

  try {
    const newEmployee = await Employee.create({
      name: name,
      password: p,
     
      phone: phone,
      role: role,
      photoUrl:uploadResult.secure_url,
      photoUrlPublicId:uploadResult.public_id
    })

    console.log(newEmployee)

    return res.status(201).json({
      message: 'Employer registration successfull',
      newEmployee
    })
  } catch (error) {
    console.log(error);
    next(error)
  }
}

function parseMonthString(monthStr) {
  if (!monthStr) return null;

  monthStr = monthStr.trim();

  // case 1: YYYY-MM or YYYY/MM
  const isoMatch = monthStr.match(/^(\d{4})[ -\/]?(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
  }

  // case 2: MM-YYYY or MM/YYYY (e.g. 08-2025)
  const revMatch = monthStr.match(/^(\d{1,2})[ -\/]?(\d{4})$/);
  if (revMatch) {
    const m = Number(revMatch[1]);
    const year = Number(revMatch[2]);
    if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
  }

  // case 3: "August 2025" or "Aug 2025" (any case)
  const wordsMatch = monthStr.match(/([A-Za-z]+)\s+(\d{4})/);
  if (wordsMatch) {
    const monthName = wordsMatch[1].toLowerCase();
    const year = Number(wordsMatch[2]);
    const monthNames = [
      "january","february","march","april","may","june",
      "july","august","september","october","november","december"
    ];
    const idx = monthNames.findIndex(m => m.startsWith(monthName));
    if (idx >= 0) return { year, monthIndex: idx };
  }

  // last attempt: Date.parse on first day (may be locale-dependent)
  const tryDate = new Date(monthStr);
  if (!isNaN(tryDate.getTime())) {
    return { year: tryDate.getFullYear(), monthIndex: tryDate.getMonth() };
  }

  return null;
}

export const employeeAttendance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { filter, month } = req.query; // filter: "week" | "last15days". month: various formats

    if (!employeeId) {
      return next(new ErrorHandler("Please provide the employeeId", 400));
    }

    const isEmployee = await Employee.findById(employeeId);
    if (!isEmployee) {
      return next(new ErrorHandler("This employee is not registered", 404));
    }

    let startDateUTC, endDateUTC;
    const now = new Date();

    if (month) {
      // parse month string robustly
      const parsed = parseMonthString(month);
      if (!parsed) {
        return next(new ErrorHandler("Invalid month format. Use YYYY-MM or 'August 2025'.", 400));
      }
      const { year, monthIndex } = parsed;

      // Start at 00:00:00.000 UTC of first day
      startDateUTC = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));

      // Last day of month: create Date UTC for first day of next month then subtract 1 ms
      const firstOfNextMonthUTC = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
      endDateUTC = new Date(firstOfNextMonthUTC.getTime() - 1); // 23:59:59.999 UTC of last day
    } else if (filter === "week") {
      // compute current week's Monday..Sunday in UTC
      // find today's UTC day-of-week (0 Sun .. 6 Sat)
      const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const dayOfWeek = utcToday.getUTCDay(); // 0-6
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayUTC = new Date(utcToday);
      mondayUTC.setUTCDate(utcToday.getUTCDate() + diffToMonday);
      mondayUTC.setUTCHours(0,0,0,0);
      startDateUTC = mondayUTC;

      const sundayUTC = new Date(startDateUTC);
      sundayUTC.setUTCDate(startDateUTC.getUTCDate() + 6);
      sundayUTC.setUTCHours(23,59,59,999);
      endDateUTC = sundayUTC;
    } else {
      // default: last 15 days (including today) using UTC day boundaries
      const endUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      const startUTC = new Date(endUTC);
      startUTC.setUTCDate(endUTC.getUTCDate() - 14); // 14 days back + today = 15 days
      startUTC.setUTCHours(0,0,0,0);
      startDateUTC = startUTC;
      endDateUTC = endUTC;
    }

    // debug logs (remove in production)
    console.log("employeeAttendance range:", startDateUTC.toISOString(), "->", endDateUTC.toISOString());

    // Query using UTC-based range
    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDateUTC, $lte: endDateUTC },
    }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      filter: month ? `month-${month}` : (filter || "last15days"),
      employee: {
        id: isEmployee._id,
        name: isEmployee.name,
        role: isEmployee.role,
      },
      range: {
        startDate: startDateUTC,
        endDate: endDateUTC,
      },
      totalRecords: attendanceRecords.length,
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("employeeAttendance error:", error);
    return next(error);
  }
};

// function parseMonthString(monthStr) {
//   if (!monthStr) return null;
//   monthStr = monthStr.trim();

//   // YYYY-MM or YYYY/MM or YYYY-MM-DD
//   const isoMatch = monthStr.match(/^(\d{4})[ -\/]?(\d{1,2})/);
//   if (isoMatch) {
//     const year = Number(isoMatch[1]);
//     const m = Number(isoMatch[2]);
//     if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
//   }

//   // MM-YYYY or MM/YYYY (e.g. 08-2025)
//   const revMatch = monthStr.match(/^(\d{1,2})[ -\/]?(\d{4})$/);
//   if (revMatch) {
//     const m = Number(revMatch[1]);
//     const year = Number(revMatch[2]);
//     if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
//   }

//   // "August 2025" or "Aug 2025"
//   const wordsMatch = monthStr.match(/([A-Za-z]+)\s+(\d{4})/);
//   if (wordsMatch) {
//     const monthName = wordsMatch[1].toLowerCase();
//     const year = Number(wordsMatch[2]);
//     const monthNames = [
//       "january","february","march","april","may","june",
//       "july","august","september","october","november","december"
//     ];
//     const idx = monthNames.findIndex(m => m.startsWith(monthName));
//     if (idx >= 0) return { year, monthIndex: idx };
//   }

//   // fallback: try Date parse
//   const tryDate = new Date(monthStr);
//   if (!isNaN(tryDate.getTime())) {
//     return { year: tryDate.getFullYear(), monthIndex: tryDate.getMonth() };
//   }

//   return null;
// }

export const employeeProgressBar = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query; // optional: month filter

    if (!employeeId) {
      return next(new ErrorHandler("Please provide Employee Id", 400));
    }

    const isEmployee = await Employee.findById(employeeId);
    if (!isEmployee) {
      return next(new ErrorHandler("This employee does not exist in database", 404));
    }

    const now = new Date();
    let startUTC, endUTC;

    if (month) {
      const parsed = parseMonthString(month);
      if (!parsed) {
        return next(new ErrorHandler("Invalid month format. Use YYYY-MM or 'August 2025' or '08-2025'.", 400));
      }
      const { year, monthIndex } = parsed;
      // start = 00:00:00.000 UTC of first day
      startUTC = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      // end = last ms of that month in UTC
      const firstOfNextMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
      endUTC = new Date(firstOfNextMonth.getTime() - 1);
    } else {
      // default: last 15 days (including today) using UTC day boundaries
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 14); // 14 days back + today = 15 days
      start.setUTCHours(0,0,0,0);
      startUTC = start;
      endUTC = end;
    }

    // debug log (remove in production)
    console.log("employeeProgressBar range:", startUTC.toISOString(), "->", endUTC.toISOString());

    // Find tasks assigned to this employee within the date range
    const tasks = await Task.find({
      assignedTo: employeeId,
      date: { $gte: startUTC, $lte: endUTC },
    })
      .sort({ date: 1 })
      .populate({
        path: "partNo",
        select: "partNo partName", // adjust to your PartNo schema fields
      })
      .lean();

    // compute totals and per-task percentages
    let totalAssigned = 0; // sum of targets
    let totalCompleted = 0; // sum of completionQuantity

    const tasksWithStats = tasks.map((t) => {
      const target = Number(t.target || 0);
      const completed = Number(t.completionQuantity || 0);

      totalAssigned += target;
      totalCompleted += completed;

      const percent = target > 0 ? Number(((completed / target) * 100).toFixed(2)) : null;

      return {
        _id: t._id,
        partNo: t.partNo ? { id: t.partNo._id, partNo: t.partNo.partNo, partName: t.partNo.partName } : null,
        machineName: t.machineName,
        machineNumber: t.machineNumber,
        description: t.description,
        date: t.date,
        shift: t.shift,
        status: t.status,
        target,
        completionQuantity: completed,
        percentComplete: percent, // null if target == 0
      };
    });

    const overallPercent = totalAssigned > 0 ? Number(((totalCompleted / totalAssigned) * 100).toFixed(2)) : null;

    return res.status(200).json({
      success: true,
      employee: {
        id: isEmployee._id,
        name: isEmployee.name,
        role: isEmployee.role,
      },
      range: {
        startDate: startUTC,
        endDate: endUTC,
      },
      totals: {
        totalAssigned,
        totalCompleted,
        overallPercent, // null if no assigned targets
      },
      tasks: tasksWithStats,
      totalTasks: tasksWithStats.length,
    });
  } catch (error) {
    console.error("employeeProgressBar error:", error);
    return next(error);
  }
};

//RAW MATERIAL

export const createRawMaterialInventory = async(req,res,next)=>{
  try {
    const {type} = req.body;
    console.log(type)
    if(type!=="Pipe" && type!=="Round Bar"){
      return next(new ErrorHandler("Please provide the right type",400))
    }

    const newRawMaterial =await RawMaterial.create({
      type:type,
      quantity:0,
    })

    return res.status(201).json({
      message:'Raw material created',
      newRawMaterial
    })

  } catch (error) {
    next(error)
  }
}

export const getRawMaterialInfo = async (req, res, next) => {
  try {
    //console.log("hie helloo ")
    const { type, page = 1, limit = 10, startDate, endDate } = req.query;

    // Validate type if passed
    if (type && !["Pipe", "Round Bar"].includes(type)) {
      return next(new ErrorHandler("Invalid type filter", 400));
    }

    // Parse date filters if provided
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    if (end) {
      end.setHours(23, 59, 59, 999); // include full day
    }

    // Helper function to filter by date range
    const filterByDate = (movements) => {
      if (!start && !end) return movements;
      return movements.filter((m) => {
        const d = new Date(m.date);
        return (!start || d >= start) && (!end || d <= end);
      });
    };

    // 1. Fetch materials separately
    const pipeMaterial = await RawMaterial.findOne({ type: "Pipe" });
    const roundBarMaterial = await RawMaterial.findOne({ type: "Round Bar" });

    const totalQuantities = {
      Pipe: pipeMaterial ? pipeMaterial.quantity : 0,
      "Round Bar": roundBarMaterial ? roundBarMaterial.quantity : 0,
    };

    // 2. Last 10 stock movements for each (with date filter applied)
    const lastMovements = {
      Pipe: pipeMaterial
        ? filterByDate(pipeMaterial.stockMovements)
            .sort((a, b) => b.date - a.date)
            .slice(0, 10)
        : [],
      "Round Bar": roundBarMaterial
        ? filterByDate(roundBarMaterial.stockMovements)
            .sort((a, b) => b.date - a.date)
            .slice(0, 10)
        : [],
    };

    // 3. If filter applied → send paginated movements of that type (date filtered)
    let filteredMovements = [];
    let totalMovements = 0;

    if (type) {
      const material = type === "Pipe" ? pipeMaterial : roundBarMaterial;

      if (!material) {
        return next(new ErrorHandler("Raw material not found", 404));
      }

      let movements = filterByDate(material.stockMovements);
      totalMovements = movements.length;

      const skip = (page - 1) * limit;
      filteredMovements = movements
        .sort((a, b) => b.date - a.date)
        .slice(skip, skip + parseInt(limit));
    }

    res.status(200).json({
      success: true,
      totalQuantities, // Pipe & Round Bar separately
      lastMovements,   // last 10 of both (filtered by date range if given)
      ...(type && {
        filtered: {
          type,
          page: parseInt(page),
          limit: parseInt(limit),
          totalMovements,
          data: filteredMovements,
        },
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const updateRawMaterialInventory = async (req, res, next) => {
  try {
    const { type, quantity, reason, movementType } = req.body;
    const userId = req.user?._id; // assuming user is attached via auth middleware

    if (!type || !quantity || !movementType) {
      return next(new ErrorHandler("Type, quantity, and movementType are required", 400));
    }

    if (!["Pipe", "Round Bar"].includes(type)) {
      return next(new ErrorHandler("Invalid raw material type", 400));
    }

    if (!["IN", "OUT"].includes(movementType)) {
      return next(new ErrorHandler("Movement type must be IN or OUT", 400));
    }

    const material = await RawMaterial.findOne({ type });
    if (!material) {
      return next(new ErrorHandler("Raw material not found", 404));
    }

    // Update quantity based on movement type
    if (movementType === "IN") {
      material.quantity += quantity;
    } else if (movementType === "OUT") {
      if (material.quantity < quantity) {
        return next(new ErrorHandler("Insufficient stock", 400));
      }
      material.quantity -= quantity;
    }

    // Push stock movement log
    material.stockMovements.push({
      type: movementType,
      quantity,
      reason,
      user: userId,
    });

    await material.save();

    res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

//GET THE PCS THAT CAN BE CREATED USINIG THE PART NO GROSS WEIGHT AND RAW WEIGHT;

export const countPcsOfPartNoCalculator = async(req,res,next)=>{
try {
  const {partNo,weight} = req.body;
  if(!partNo || !weight){
    return next(new ErrorHandler("Please provide partNo and weight",400));
  }
  const isPartExist = await PartNo.findOne({partNo:partNo});
  if(!isPartExist){
    return next(new ErrorHandler(`PartNo ${partNo} does not exist in database`,404))
  }

  let totalPcs = calculatePcs(weight,isPartExist.grossWeight)

  return res.status(200).json({
    totalPcs
  })
  
} catch (error) {
  next(error)
}
}

// export const addPartNo = async (req, res, next) => {
//   try {
//     const data = req.body;
//     console.log(data)

//     if (!req.file) {
//       return next(new ErrorHandler("Drawing file is required", 400));
//     }

//     const partNo = await PartNo.findOne({ partNo: data.partNo });
//     console.log(partNo)
//     if (partNo) {
//       return next(new ErrorHandler("THis part No alreay exist", 400))
//     }

//     // ✅ Convert buffer to Base64 directly (no fs.readFileSync)
//     const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
//       "base64"
//     )}`;

//     // ✅ Upload to Cloudinary
//     const uploadResult = await cloudinary.uploader.upload(base64File, {
//       resource_type: "auto",
//       folder: "parts_drawings",
//     });

//     const parseFloatSafe = (value) => {
//   if (value === '' || value === null || value === undefined) return 0;
//   const parsed = parseFloat(value);
//   return isNaN(parsed) ? 0 : parsed;
// };

// const parsedData = {
//   ...data,
//   od: parseFloatSafe(data.od),
//   id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0,
//   length: parseFloatSafe(data.length),
//   rmRate: parseFloatSafe(data.rmRate),
//   cncSetupRequired: parseInt(data.cncSetupRequired) || 0
// };

// console.log(parsedData)

// //     const parsedData = {
// //   ...data,
// //   od:  parseFloat(data.od) ,
// //   id: data.id ? parseFloat(data.id) : 0.00,
// //   length:  parseFloat(data.length) ,
// //   rmRate:  parseFloat(data.rmRate) 
// // };

//     const part = await PartNo.create({
//       ...parsedData,
//       drawingFileUrl: uploadResult.secure_url,
//       drawingFilePublicId: uploadResult.public_id,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "New PartNo added successfully",
//       part,
//     });
//   } catch (error) {
//     console.error("Add PartNo Error:", error);
//     next(error);
//   }
// }

// export const updatePartNoInfo = async(req,res,next)=>{
//   const partNoId = req.params.partNoId;
//   const data = req.body;
//   try {
//     if(!data){
//       return next(new ErrorHandler("Please provide some Detail",400))
//     }
//     if(!partNoId){
//       return next(new ErrorHandler("Please provide partNO Id",400))
//     }

//      if (!req.file) {
//       return next(new ErrorHandler("Drawing file is required", 400));
//     }

//     const partNo = await PartNo.findById(partNoId);

//     if(!partNo){
//       return next(new ErrorHandler("There is no partNo",404))
//     }

//     let uploadResult ={drawingFileUrl:partNo.drawingFileUrl,drawingFilePublicId:partNo.drawingFilePublicId};

//     if(req.file && partNo.drawingFilePublicId){
//       await cloudinary.uploader.destroy(partNo.drawingFilePublicId);
//       const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
//       "base64"
//     )}`;

//     // ✅ Upload to Cloudinary
//      uploadResult = await cloudinary.uploader.upload(base64File, {
//       resource_type: "auto",
//       folder: "parts_drawings",
//     });

//     }

//     const parseFloatSafe = (value) => {
//   if (value === '' || value === null || value === undefined) return 0;
//   const parsed = parseFloat(value);
//   return isNaN(parsed) ? 0 : parsed;
// };

// const parsedData = {
//   ...data,
//   od: parseFloatSafe(data.od),
//   id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0,
//   length: parseFloatSafe(data.length),
//   rmRate: parseFloatSafe(data.rmRate),
//   cncSetupRequired: parseInt(data.cncSetupRequired) || 0
// };

//   partNo.drawingFileUrl = uploadResult.secure_url,
//       partNo.drawingFilePublicId = uploadResult.public_id,

//       partNo = {...parsedData}

//       await partNo.save();

//       return res.status(201).json({
//         success:true,
//         message:'Part No detail updated successfully'
//       })


//   } catch (error) {
//     console.log(error);
//     next(error)
//   }
// }

// export const updatePartNoInfo = async (req, res, next) => {
//   try {
//     const { partNoId } = req.params;
//     const data = req.body;

//     if (!partNoId) {
//       return next(new ErrorHandler("Please provide partNo Id", 400));
//     }

//     let partNo = await PartNo.findById(partNoId);
//     if (!partNo) {
//       return next(new ErrorHandler("There is no partNo", 404));
//     }

//     // ✅ Helper to safely parse floats
//     const parseFloatSafe = (value) => {
//       if (value === "" || value === null || value === undefined) return 0;
//       const parsed = parseFloat(value);
//       return isNaN(parsed) ? 0 : parsed;
//     };

//     // ✅ Parse numeric fields
//     const parsedData = {
//       ...data,
//       od: parseFloatSafe(data.od),
//       id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0,
//       length: parseFloatSafe(data.length),
//       rmRate: parseFloatSafe(data.rmRate),
//       cncSetupRequired: parseInt(data.cncSetupRequired) || 0,
//     };

//     // ✅ Handle optional file upload
//     if (req.file) {
//       // delete old file if exists
//       if (partNo.drawingFilePublicId) {
//         await cloudinary.uploader.destroy(partNo.drawingFilePublicId);
//       }

//       const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
//         "base64"
//       )}`;

//       const uploadResult = await cloudinary.uploader.upload(base64File, {
//         resource_type: "auto",
//         folder: "parts_drawings",
//       });

//       partNo.drawingFileUrl = uploadResult.secure_url;
//       partNo.drawingFilePublicId = uploadResult.public_id;
//     }

//     // ✅ Merge updated fields into partNo
//     Object.assign(partNo, parsedData);

//     await partNo.save();

//     return res.status(200).json({
//       success: true,
//       message: "Part No detail updated successfully",
//       partNo,
//     });
//   } catch (error) {
//     console.error("Update PartNo Error:", error);
//     next(error);
//   }
// };

export const addPartNo = async (req, res, next) => {
  try {
    const data = req.body;
   // console.log("Raw Data:", data);

    if (!req.file) {
      return next(new ErrorHandler("Drawing file is required", 400));
    }

    // Check duplicate partNo
    const partNo = await PartNo.findOne({ partNo: data.partNo });
    if (partNo) {
      return next(new ErrorHandler("This part No already exists", 400));
    }

    // Convert buffer to Base64 and upload to Cloudinary
    const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;
    const uploadResult = await cloudinary.uploader.upload(base64File, {
      resource_type: "auto",
      folder: "parts_drawings",
    });

    // Helper: safely parse numbers
    const parseFloatSafe = (value) => {
      if (value === "" || value === null || value === undefined) return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper: convert "hh:mm:ss" → seconds

let grossWeight = calcGrossWeight({
  type: data.rawMaterialType,
  od: parseFloatSafe(data.od),
  id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0, // id = 0 for RoundBar
  length: parseFloatSafe(data.length),
  density: 7.86, // or from req.body if dynamic
});
 

    const parsedData = {
      ...data,
      od: parseFloatSafe(data.od),
      id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0,
      length: parseFloatSafe(data.length),
      rmRate: parseFloatSafe(data.rmRate),
      cncSetupRequired: parseInt(data.cncSetupRequired) || 0,
      cncCycleTime: timeStringToSeconds(data.cncCycleTime), // stored as seconds
      latheCycleTime: timeStringToSeconds(data.latheCycleTime), // stored as seconds
    };

    console.log("Parsed Data:", parsedData);

    const part = await PartNo.create({
      ...parsedData,
      drawingFileUrl: uploadResult.secure_url,
      drawingFilePublicId: uploadResult.public_id,
      grossWeight:grossWeight
    });

    return res.status(201).json({
      success: true,
      message: "New PartNo added successfully",
      part,
    });
  } catch (error) {
    console.error("Add PartNo Error:", error);
    next(error);
  }
};


export const createSchedule = async (req, res, next) => {
  try {
    let { scheduleDate, parts } = req.body;

    if (!scheduleDate || !parts || parts.length === 0) {
      return res.status(400).json({ message: "Please provide schedule date and parts." });
    }

    // If frontend sends "2025-08", convert it to first day of month
    if (/^\d{4}-\d{2}$/.test(scheduleDate)) {
      scheduleDate = `${scheduleDate}-01`; // → "2025-08-01"
    }

    // const date = new Date(scheduleDate);

    // // Get first & last day of month
    // const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    // const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const [year, month] = scheduleDate.split('-');
const date = new Date(Date.UTC(year, month - 1, 1)); // Month is 0-indexed in JavaScript

// Then for startOfMonth and endOfMonth:
const startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59));

    // ✅ Check if schedule already exists for month
    const existingSchedule = await Schedule.findOne({
      scheduleDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (existingSchedule) {
      return res.status(400).json({
        message: `A schedule already exists for ${date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        })}`,
      });
    }

    // your existing parts processing code here ...
    const processedParts = await Promise.all(
      parts.map(async (p) => {
        const partData = await PartNo.findOne({ partNo: p.partNo });
        if (!partData) {
          throw new Error(`Part not found for ID: ${p.partNo}`);
        }

        const inventoryData = await Inventory.findOne({ partNo: partData._id });
        if (!inventoryData) {
          return next(new ErrorHandler(`No inventory created for ${p.partNo}`, 404));
        }

        let rmCalc;
        if (partData.rawMaterialType === "Round Bar") {
          rmCalc = calcRoundBarRM({
            od: partData.od,
            length: partData.length,
            qty: p.scheduleQuantity,
            density: 7.86,
            rate: partData.rmRate,
          });
        } else {
          rmCalc = calcPipeRm({
            od: partData.od,
            id: partData.id || 0,
            length: partData.length,
            qty: p.scheduleQuantity,
            density: 7.86,
            rate: partData.rmRate,
          });
        }

   let stockInHand = inventoryData.quantities.reduce((sum, el) => {
  if (el.type === "Cutting" || "CUTTING") {
    return sum + (el.quantity * partData.grossWeight);
  }
  return sum;
}, 0);


        return {
          partNo: partData._id,
          scheduleQuantity: p.scheduleQuantity,

          materialRequired: rmCalc.totalKg,
          stockInHand: stockInHand || 0,
          totalMaterialRequired: rmCalc.totalKg - (stockInHand || 0),

         // grossWt: rmCalc.wtPerPcGrossKg,
          nosPerKg: +(1 / rmCalc.wtPerPcGrossKg).toFixed(3),
          disPatchQuantity: 0,
          totalCost: rmCalc.totalCost,
        };
      })
    );



    let pipe = await RawMaterial.findOne({type:"Pipe"});
    let roundBar = await RawMaterial.findOne({type:"Round Bar"});


    let totalPipeWeightRequirement = 0;
let totalRoundBarWeightRequirement = 0;

for (const part of processedParts) {
  const partData = await PartNo.findById(part.partNo);

  if (partData.rawMaterialType === "Pipe") {
    totalPipeWeightRequirement += part.totalMaterialRequired;
  } else if (partData.rawMaterialType === "Round Bar") {
    totalRoundBarWeightRequirement += part.totalMaterialRequired;
  }
}

    // Save schedule with normalized date
    const newSchedule = new Schedule({
      scheduleDate: startOfMonth,  // 👈 store as first day of month
      parts: processedParts,
      totalPipeWeightinInventory:pipe.quantity,
      totalRoundBarWeightinInventory: roundBar.quantity,
      totalPipeWeightRequirement:totalPipeWeightRequirement,
      totalRoundBarWeightRequirement:totalRoundBarWeightRequirement

    });

    await newSchedule.save();

    res.status(201).json({
      message: "Schedule created successfully",
      schedule: newSchedule,
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};


export const updatePartNoInfo = async (req, res, next) => {
  try {
    const { partNoId } = req.params;
    const data = req.body;

    if (!partNoId) {
      return next(new ErrorHandler("Please provide partNo Id", 400));
    }

    let partNo = await PartNo.findById(partNoId);
    if (!partNo) {
      return next(new ErrorHandler("There is no partNo", 404));
    }

    // ✅ Helper to safely parse floats
    const parseFloatSafe = (value) => {
      if (value === "" || value === null || value === undefined) return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    let grossWeight = calcGrossWeight({
  type: data.type,
  od: parseFloatSafe(data.od),
  id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0, // id = 0 for RoundBar
  length: parseFloatSafe(data.length),
  density: 7.86, // or from req.body if dynamic
});
 

    // ✅ Parse numeric fields
    const parsedData = {
      ...data,
      od: parseFloatSafe(data.od),
      id: data.rawMaterialType === "Pipe" ? parseFloatSafe(data.id) : 0,
      length: parseFloatSafe(data.length),
      rmRate: parseFloatSafe(data.rmRate),
      cncSetupRequired: parseInt(data.cncSetupRequired) || 0,
      cncCycleTime: timeStringToSeconds(data.cncCycleTime), // stored as seconds
      latheCycleTime: timeStringToSeconds(data.latheCycleTime), // stored as seconds,
      
    };

    // ✅ Handle optional file upload
    if (req.file) {
      if (partNo.drawingFilePublicId) {
        await cloudinary.uploader.destroy(partNo.drawingFilePublicId);
      }

      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;

      const uploadResult = await cloudinary.uploader.upload(base64File, {
        resource_type: "auto",
        folder: "parts_drawings",
      });

      partNo.drawingFileUrl = uploadResult.secure_url;
      partNo.drawingFilePublicId = uploadResult.public_id;
    }

    const oldPartNo = partNo.partNo; // 🔹 keep track of old partNo before update

    // ✅ Merge updated fields into partNo
    Object.assign(partNo, parsedData);
    partNo.grossWeight = grossWeight;

    await partNo.save();

    // 🔹 If partNo changed, update inventory documents too
    if (data.partNo && data.partNo !== oldPartNo) {
      await Inventory.updateMany(
        { partNoName: oldPartNo }, // match old name
        { $set: { partNoName: data.partNo } } // update to new name
      );
    }

    return res.status(200).json({
      success: true,
      message: "Part No detail updated successfully",
      partNo,
    });
  } catch (error) {
    console.error("Update PartNo Error:", error);
    next(error);
  }
};

export const getPartNoOperations = async (req, res, next) => {
  try {
    const { partNoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(partNoId)) {
      return next(new ErrorHandler("Invalid partNoId", 400));
    }

    // 🔹 Build filter
    const filter = { partNo: partNoId };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    // 🔹 Count for pagination
    const total = await Task.countDocuments(filter);

    // 🔹 Query with population
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "assignedTo",
        select: "name",
      })
      .populate({
        path: "assignedBy",
        select: "name",
      })
      .populate({
        path: "partNo",
        select: "partNo partName",
      });

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      total,
      page,
      pages: Math.ceil(total / limit),
      tasks,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const getAllPartsNo = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;   // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit;

    const totalDocuments = await PartNo.countDocuments();

    const partNos = await PartNo.find()
      .select("partNo _id")   // only send partNo and _id
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      totalDocuments,
      currentPage: page,
      totalPages: Math.ceil(totalDocuments / limit),
      partNos
    });
  } catch (error) {
    next(error);  // pass error to global error handler
  }
};

// export const getPartDetails = async (req, res, next) => {
//   const partNoId = req.params.id;
//   try {

//     const part = await PartNo.findById(partNoId);
//     if (!part) {
//       return next(new ErrorHandler("This partNo does not exist"))
//     }
//     //console.log(part)
//     return res.status(200).json({
//       message: 'Data fetched successfully',
//       part
//     })
//   } catch (error) {
//     console.log(error);
//     next(error)
//   }
// }

export const getPartDetails = async (req, res, next) => {
  const partNoId = req.params.id;
  try {
    const part = await PartNo.findById(partNoId);
    if (!part) {
      return next(new ErrorHandler("This partNo does not exist"));
    }

    // Helper: seconds → "hh:mm:ss"
    // const secondsToTimeString = (seconds) => {
    //   if (!seconds || isNaN(seconds)) return "00:00:00";
    //   const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
    //   const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    //   const ss = String(seconds % 60).padStart(2, "0");
    //   return `${hh}:${mm}:${ss}`;
    // };

    // Convert only in API response (not in DB)
    const partData = {
      ...part.toObject(),
      cncCycleTime: secondsToTimeString(part.cncCycleTime),
      latheCycleTime: secondsToTimeString(part.latheCycleTime),
    };

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      part: partData,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};



export const getOnePart = async (req, res, next) => {
  try {
    const { partNo } = req.query;

    if (!partNo) {
      return next(new ErrorHandler("partNo query is required", 400));
    }

    // 1️⃣ Try exact match first
    const exactPart = await PartNo.findOne({ partNo }).select("_id partNo");
    if (exactPart) {
      return res.status(200).json([exactPart]);  // return as array for consistency
    }

    // 2️⃣ If not found, do partial (regex) search
    const regex = new RegExp(partNo, "i"); // case-insensitive
    const parts = await PartNo.find({ partNo: regex }).select("_id partNo");

    if (!parts || parts.length === 0) {
      return next(new ErrorHandler("No matching parts found", 404));
    }

    res.status(200).json(parts);
  } catch (error) {
    next(error);
  }
};


// controllers/scheduleController.js


// Create Schedule
// export const createSchedule = async (req, res,next) => {
//   try {
//     const { scheduleDate, parts } = req.body;

//     if (!scheduleDate || !parts || parts.length === 0) {
//       return res.status(400).json({ message: "Please provide schedule date and parts." });
//     }

//     const date = new Date(scheduleDate);

//     // Get first & last day of that month
//     const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
//     const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

//     // ✅ Check if a schedule already exists in this month
//     const existingSchedule = await Schedule.findOne({
//       scheduleDate: { $gte: startOfMonth, $lte: endOfMonth }
//     });

//     if (existingSchedule) {
//       return res.status(400).json({ 
//         message: `A schedule already exists for ${date.toLocaleString("default", { month: "long", year: "numeric" })}` 
//       });
//     }


//     // Process each part
//     // const processedParts = await Promise.all(
//     //   parts.map(async (p) => {
//     //     const partData = await PartNo.find({partNo:p.partNo});
//     //     if (!partData) {
//     //       throw new Error(`Part not found for ID: ${p.partNo}`);
//     //     }

//     //     if(partData.rawMaterialType==="Round Bar"){

//     //     }else{

//     //     }

//     //     // Example calculations (modify as per your formula)
//     //     const materialRequired = partData.materialPerPiece || 0; // If you store per piece requirement in PartNo
//     //     const stockInHand = partData.stock || 0; // Example: take stock from part collection
//     //     const totalMaterialRequired = p.scheduleQuantity * materialRequired;

//     //     return {
//     //       partNo: p.partNo,
//     //       scheduleQuantity: p.scheduleQuantity,
//     //       rmRate: p.rmRate,

//     //       materialRequired,
//     //       stockInHand,
//     //       totalMaterialRequired,

//     //       grossWt: partData.grossWt || 0,
//     //       nosPerKg: partData.nosPerKg || 0,
//     //       disPatchQuantity: 0
//     //     };
//     //   })
//     // );

//     const processedParts = await Promise.all(
//   parts.map(async (p) => {
//     const partData = await PartNo.findOne({partNo:p.partNo});  // <-- use findById since ref is ObjectId
//     if (!partData) {
//       throw new Error(`Part not found for ID: ${p.partNo}`);
//     }

//     const inventoryData = await Inventory.findOne({partNo:partData._id});
//     if(!inventoryData){
//       return next(new ErrorHandler(`There is no inventory created for ${p.partNo}`,404))
//     }

//     let rmCalc;
//     if (partData.rawMaterialType === "Round Bar") {
//       rmCalc = calcRoundBarRM({
//         od: partData.od,
//         length: partData.length,
//         qty: p.scheduleQuantity,
//         density: 7.86,
//         rate: partData.rmRate,
//       });
//     } else {
//       rmCalc = calcPipeRm({
//         od: partData.od,
//         id: partData.id || 0,
//         length: partData.length,
//         qty: p.scheduleQuantity,
//         density: 7.86,
//         rate: partData.rmRate,
//       });
//     }

//     return {
//       partNo: partData._id,
//       scheduleQuantity: p.scheduleQuantity,
//       //rmRate: p.rmRate,

//       materialRequired: rmCalc.totalKg,   // per piece weight (with scrap if needed)
//       stockInHand: inventoryData.totalStockInHand || 0,          // if you store stock later
//       totalMaterialRequired: rmCalc.totalKg-inventoryData.totalStockInHand ||0,     // total kg required

//       grossWt: rmCalc.wtPerPcGrossKg,
//       nosPerKg: +(1 / rmCalc.wtPerPcGrossKg).toFixed(3),
//       disPatchQuantity: 0,

//       totalCost: rmCalc.totalCost,

//     };
//   })
// );

//     // Save schedule
//     const newSchedule = new Schedule({
//       scheduleDate,
//       parts: processedParts
//     });

//     await newSchedule.save();

//     res.status(201).json({
//       message: "Schedule created successfully",
//       schedule: newSchedule
//     });

//   } catch (error) {
//     console.error("Error creating schedule:", error);
//     res.status(500).json({ message: error.message || "Server error" });
//   }
// };



// export const createSchedule = async (req, res, next) => {
//   try {
//     let { scheduleDate, parts } = req.body;

//     if (!scheduleDate || !parts || parts.length === 0) {
//       return res.status(400).json({ message: "Please provide schedule date and parts." });
//     }

//     // If frontend sends "2025-08", convert it to first day of month
//     if (/^\d{4}-\d{2}$/.test(scheduleDate)) {
//       scheduleDate = `${scheduleDate}-01`; // → "2025-08-01"
//     }

//     // const date = new Date(scheduleDate);

//     // // Get first & last day of month
//     // const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
//     // const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

//     const [year, month] = scheduleDate.split('-');
// const date = new Date(Date.UTC(year, month - 1, 1)); // Month is 0-indexed in JavaScript

// // Then for startOfMonth and endOfMonth:
// const startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
// const endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59));

//     // ✅ Check if schedule already exists for month
//     const existingSchedule = await Schedule.findOne({
//       scheduleDate: { $gte: startOfMonth, $lte: endOfMonth }
//     });

//     if (existingSchedule) {
//       return res.status(400).json({
//         message: `A schedule already exists for ${date.toLocaleString("default", {
//           month: "long",
//           year: "numeric",
//         })}`,
//       });
//     }

//     // your existing parts processing code here ...
//     const processedParts = await Promise.all(
//       parts.map(async (p) => {
//         const partData = await PartNo.findOne({ partNo: p.partNo });
//         if (!partData) {
//           throw new Error(`Part not found for ID: ${p.partNo}`);
//         }

//         const inventoryData = await Inventory.findOne({ partNo: partData._id });
//         if (!inventoryData) {
//           return next(new ErrorHandler(`No inventory created for ${p.partNo}`, 404));
//         }

//         let rmCalc;
//         if (partData.rawMaterialType === "Round Bar") {
//           rmCalc = calcRoundBarRM({
//             od: partData.od,
//             length: partData.length,
//             qty: p.scheduleQuantity,
//             density: 7.86,
//             rate: partData.rmRate,
//           });
//         } else {
//           rmCalc = calcPipeRm({
//             od: partData.od,
//             id: partData.id || 0,
//             length: partData.length,
//             qty: p.scheduleQuantity,
//             density: 7.86,
//             rate: partData.rmRate,
//           });
//         }

//         return {
//           partNo: partData._id,
//           scheduleQuantity: p.scheduleQuantity,

//           materialRequired: rmCalc.totalKg,
//           stockInHand: inventoryData.totalStockInHand || 0,
//           totalMaterialRequired: rmCalc.totalKg - (inventoryData.totalStockInHand || 0),

//           grossWt: rmCalc.wtPerPcGrossKg,
//           nosPerKg: +(1 / rmCalc.wtPerPcGrossKg).toFixed(3),
//           disPatchQuantity: 0,
//           totalCost: rmCalc.totalCost,
//         };
//       })
//     );

//     // Save schedule with normalized date
//     const newSchedule = new Schedule({
//       scheduleDate: startOfMonth,  // 👈 store as first day of month
//       parts: processedParts,
//     });

//     await newSchedule.save();

//     res.status(201).json({
//       message: "Schedule created successfully",
//       schedule: newSchedule,
//     });
//   } catch (error) {
//     console.error("Error creating schedule:", error);
//     res.status(500).json({ message: error.message || "Server error" });
//   }
// };


export const getSchedule = async (req, res, next) => {
  try {
    const { date } = req.body; // e.g. "2025-10" or "October 2025"
    if (!date) {
      return res.status(400).json({ message: "Please provide a month and year" });
    }

    // Parse date into JS Date object
    const targetDate = new Date(date);
    if (isNaN(targetDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Start & end of month
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    // Fetch schedule for that month
    const schedule = await Schedule.findOne({
      scheduleDate: { $gte: startOfMonth, $lte: endOfMonth }
    })
      .populate({
        path: "parts.partNo",
        model: PartNo, // populate PartNo details
      })
      .lean();

    if (!schedule) {
      return res.status(404).json({
        message: `No schedule found for ${targetDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        })}`,
      });
    }

    // Attach inventory details for each part
    const partsWithInventory = await Promise.all(
      schedule.parts.map(async (p) => {
        const inventory = await Inventory.findOne({ partNo: p.partNo._id }).lean();
        return {
          ...p,
        
          inventoryDetails: inventory || { message: "No inventory found" },
        };
      })
    );

    res.status(200).json({
      message: "Schedule fetched successfully",
      schedule: {
        ...schedule,
        parts: partsWithInventory,
      },
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};




export const getPartNoSchedule = async (req, res, next) => {
  try {
    const partNoId = req.params.partNoId;
    let { scheduleDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(partNoId)) {
      return next(new ErrorHandler("Invalid partNoId", 400));
    }

    let schedules = [];

    // Case 1: If scheduleDate is provided (YYYY-MM format)
    if (scheduleDate && /^\d{4}-\d{2}$/.test(scheduleDate)) {
     // console.log("hi how")
      const [year, month] = scheduleDate.split("-");
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);

      const query = {
        "parts.partNo": new mongoose.Types.ObjectId(partNoId),
        scheduleDate: { $gte: startOfMonth, $lte: endOfMonth }
      };

      schedules = await Schedule.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduleDate: -1 })
        .populate("parts.partNo", "partNo");

      if (!schedules || schedules.length === 0) {
        return next(
          new ErrorHandler(
            `Schedule for ${scheduleDate} for this part does not exist`,
            404
          )
        );
      }
    } else {
      // Case 2: No scheduleDate → get last 10 months
      console.log("hello")
      

      const query = {
        "parts.partNo": new mongoose.Types.ObjectId(partNoId),
       
      };

      schedules = await Schedule.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ scheduleDate: -1 })
        .populate("parts.partNo", "partNo");

      if (!schedules || schedules.length === 0) {
        return next(
          new ErrorHandler("No schedules found for this partNo", 404)
        );
      }
    }

    res.status(200).json({
      success: true,
      total: schedules.length,
      page: parseInt(page),
      limit: parseInt(limit),
      schedules
    });
  } catch (error) {
    console.error(error);
    next(new ErrorHandler("Failed to fetch partNo schedule", 500));
  }
};

export const getPartNoInventory = async(req,res,next)=>{
 
  try {
     const partNoId = req.params.partNoId;
     if(!partNoId){
      return next(new ErrorHandler('Please provide partNo',400))
     }

     const partNoInventory = await Inventory.findOne({partNo:partNoId});
     if(!partNoInventory){
      return next(new ErrorHandler('There is no inventory for this Part No',404))
     }
     
     return res.status(200).json({
      success:true,
      partNoInventory,
      
     })
  } catch (error) {
    console.log(error);
    next(error)
  }
}

export const deletePartNo = async(req,res,next)=>{
  try {
    const {partNoId} = req.params;
    const part = await PartNo.findById(partNoId);
    if(!part){
      return next(new ErrorHandler("This partNo does not exist",404))
    }

    if(part.drawingFileUrl && part.drawingFilePublicId){
      await cloudinary.uploader.destroy(part.drawingFilePublicId)
    }

    await PartNo.findByIdAndDelete(partNoId);
    await Inventory.findOneAndDelete({partNo:partNoId});

    return res.status(200).json({
      message:'PartNo and its inventory deleted successflly '
    })
  } catch (error) {
    console.log(error);
    next(error);
  }
}

export const createInventory = async (req, res, next) => {
  try {
    const { partNo, quantities } = req.body;

    if (!partNo || !quantities) {
      return res.status(400).json({ message: "partNo and quantities are required" });
    }

    const part = await PartNo.findOne({ partNo: partNo });
    if (!part) {
      return next(new ErrorHandler("This partNo does not exist", 404))
    }

    const isInventory = await Inventory.findOne({partNo:part._id});
    if(isInventory){
      return next(new ErrorHandler(`The inventory for this ${partNo} already exist`,400))
    }

      const totalStockInHand = quantities
      .filter(q => q.type === "FINISHED")
      .reduce((sum, q) => sum + q.quantity, 0);

    const inventory = new Inventory({
      partNo: part._id,
      partNoName: partNo,
      quantities,
      totalStockInHand: totalStockInHand,
    });

    await inventory.save();
    res.status(201).json(inventory);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
};

export const getInventoryItem = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const { partNo } = req.query;
    console.log(partNo)



    const query = {};
    if (partNo) {
      query.partNoName = partNo;
    }

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query).populate({ path: "partNo", select: "partNo" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      items
    });

  } catch (error) {
    next(new ErrorHandler("Failed to fetch inventory items", 500));
  }
}

export const updateInventoryDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantities } = req.body;

    if (!id) {
      return next(new ErrorHandler("Inventory ID required", 400));
    }
    if (!quantities || !Array.isArray(quantities)) {
      return next(new ErrorHandler("Quantities must be provided", 400));
    }

    const inventory = await Inventory.findOne({partNo:id});
    if (!inventory) {
      return next(new ErrorHandler("Inventory not found", 404));
    }

    // Update quantities
    inventory.quantities = quantities;

    // Recalculate total stock
    inventory.totalStockInHand = quantities.reduce(
      (sum, q) => sum + (q.quantity || 0),
      0
    );

    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      inventory,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getItemDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Pagination params (optional)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch the product and populate user details in stockMovements
    const product = await Inventory.findOne({ productId }).populate({
      path: 'stockMovements.user',
      select: 'name'
    });

    if (!product) {
      return next(new ErrorHandler('This product does not exist', 404));
    }

    const totalMovements = product.stockMovements.length;

    // Sort stockMovements by date descending
    const sortedMovements = product.stockMovements
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate using slice
    const paginatedMovements = sortedMovements.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      product: {
        ...product.toObject(),
        stockMovements: paginatedMovements
      },
      totalMovements,
      page,
      limit,
      totalPages: Math.ceil(totalMovements / limit)
    });

  } catch (error) {
    console.log(error);
    next(error);
  }
};


export const addInventoryProduct = async (req, res, next) => {
  try {
    const { productId, name, category, quantity, unit, reason } = req.body;

    const existing = await Inventory.findOne({ productId });
    if (existing) return next(new ErrorHandler("Product ID already exists", 400));



    const newItem = new Inventory({
      productId,
      name,
      category,
      quantity,
      unit,
      stockMovements: [{
        type: "IN",
        quantity,
        reason,
        user: req.user?._id,  // if user available
      }]
    });

    await newItem.save();
    res.status(201).json({ success: true, item: newItem });

  } catch (err) {
    return next(err);
  }
};


export const upadateInventoryProduct = async (req, res, next) => {

  try {
    const { productId } = req.params;
    const { type, quantity, reason } = req.body;

    const item = await Inventory.findOne({ productId });
    if (!item) return next(new ErrorHandler("Item not found", 404));

    // Adjust quantity based on IN or OUT
    const updatedQty = type === 'IN'
      ? item.quantity + quantity
      : item.quantity - quantity;

    if (updatedQty < 0) {
      return next(new ErrorHandler("Not enough stock to deduct", 400));
    }

    // Update quantity
    item.quantity = updatedQty;

    // Add stock movement entry
    item.stockMovements.push({
      type,
      quantity,
      reason,
      user: req.user?._id
    });

    await item.save();

    res.status(200).json({ success: true, item });

  } catch (err) {
    return next(err);
  }

}


export const getAllWorkers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const name = req.query.name?.trim(); // optional name filter

    const query = {};
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // case-insensitive search
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    // 👇 Role-based access
    if (req.user.role === 'SUPERVISOR') {
      query.role = 'WORKER'; // Supervisor can only access workers
    }

    const total = await Employee.countDocuments(query);

    const employees = await Employee.find(query)
      .skip(skip)
      .limit(limit)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      employees
    });

  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Failed to fetch employees", 500));
  }
}

// export const getWorkerDetail = async (req, res, next) => {
//   const { workerId } = req.params;

//   try {
//     const worker = await Employee.findById(workerId).select("-password");
//     if (!worker) {
//       return next(new ErrorHandler("Worker not found", 404));
//     }
//     const assignedTask = await Task.find({ assignedTo: worker._id,status:"IN_PROGRESS" });

//     return res.status(200).json({
//       success: true,
//       worker,
//       assignedTask
//     })
//   } catch (error) {
//     console.log(error);
//     next(error)
//   }
// }

export const getWorkerDetail = async (req, res, next) => {
  const { workerId } = req.params;
  const { date } = req.query; // 👈 get date from query (e.g. ?date=2025-09-06)

  try {
    const worker = await Employee.findById(workerId).select("-password");
    if (!worker) {
      return next(new ErrorHandler("Worker not found", 404));
    }

    // let query = { assignedTo: worker._id };

    // if (date) {
    //   // ✅ Match only tasks of that date (ignoring time part)
    //   const startOfDay = new Date(date);
    //   startOfDay.setHours(0, 0, 0, 0);

    //   const endOfDay = new Date(date);
    //   endOfDay.setHours(23, 59, 59, 999);

    //   query.date = { $gte: startOfDay, $lte: endOfDay };
    // } else {
    //   // ✅ If no date, default to IN_PROGRESS tasks
    //   query.status = "IN_PROGRESS";
    // }

   // const assignedTask = await Task.find(query);

    return res.status(200).json({
      success: true,
      worker,
      
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getWorkerTasks = async(req,res,next)=>{
const { workerId } = req.params;
  const { date } = req.query; // 👈 get date from query (e.g. ?date=2025-09-06)

  try {
    const worker = await Employee.findById(workerId);
    if (!worker) {
      return next(new ErrorHandler("Worker not found", 404));
    }

    let query = { assignedTo: worker._id };

    if (date) {
      // ✅ Match only tasks of that date (ignoring time part)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      // ✅ If no date, default to IN_PROGRESS tasks
      query.status = "IN_PROGRESS";
    }

    const assignedTask = await Task.find(query).populate({path:"partNo",select:"partNo"});

    return res.status(200).json({
      success: true,
      assignedTask,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }

}

export const assignTaskToWoker = async (req, res, next) => {
  const { workerId } = req.params;
 
  const { partNo, description, date,machineName,shift ,machineNumber} = req.body;



  try {
   if(!partNo||!description||!date ||!machineName || !shift){
    return next(new ErrorHandler("Please provide all the details"))
   }

   const part = await PartNo.findOne({partNo:partNo});
   if(!part){
    return next(new ErrorHandler("This partNo does not exist"))
   }

   let target = 0;

   if(machineName==="CNC" && part.cncCycleTime) {
      // total working time in ms (12 hours)
      const workingTimeMs = 12 * 60 * 60 ;

      // target pieces = total working time / cycle time
      target = Math.floor(workingTimeMs / part.cncCycleTime);
    }else if(machineName==="LATHE" && part.latheCycleTime){
        const workingTimeMs = 12 * 60 * 60 ;

      // target pieces = total working time / cycle time
      target = Math.floor(workingTimeMs / part.latheCycleTime);
    }

   let newTask = await Task.create({
    partNo:part._id,
    machineName:machineName,
    description:description,
    target:target,
    machineNumber:parseInt(machineNumber),
    date:date,
    shift:shift,
    assignedTo:workerId,
    assignedBy:req.user._id
   })

    return res.status(201).json({
      success: true,
      message: 'Task Asssigned Successfully',
      newTask
    })
  } catch (error) {
    console.log(error);
    next(error)
  }

}

// export const markTaskComplete = async (req, res, next) => {
//   const { completionNote,completionQuantity } = req.body;
//   const { taskId } = req.params

//   try {

//     if(!taskId){
//       return next(new ErrorHandler("Please provide taskId",400))
//     }
//     if(!completionNote || !completionQuantity){
//       return next(new ErrorHandler("Please provide compeltionNote and quantity"))
//     }
//     const task = await Task.findById(taskId);

//     if (!task) {
//       return next(new ErrorHandler("The task does not exist", 400))
//     }

//     const inventory = await Inventory.findOne({partNo:task.partNo})

//     if(task.completionQuantity !== completionQuantity){
//       task.completionQuantity = completionQuantity
//     }
//     task.status = "COMPLETED";
//     task.completionNote = completionNote;
//     task.completedAt = new Date();
    

//     await task.save();

//     for(let quantity of inventory.quantities){
//       if(quantity.type===task.machineName){
//         quantity.quantity=completionQuantity
//       }
//     }

//     await inventory.save();
//     return res.status(201).json({
//       message: 'Task upadation successfull',
//       success: true,

//     })
//   } catch (error) {
//     console.log(error);
//     next(error)
//   }
// }


export const markTaskComplete = async (req, res, next) => {
  const { completionNote, completionQuantity } = req.body;
  const { taskId } = req.params;

  try {
    if (!taskId) {
      return next(new ErrorHandler("Please provide taskId", 400));
    }
    if (!completionNote || !completionQuantity) {
      return next(new ErrorHandler("Please provide completionNote and completionQuantity", 400));
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return next(new ErrorHandler("The task does not exist", 400));
    }

    const inventory = await Inventory.findOne({ partNo: task.partNo });
    if (!inventory) {
      return next(new ErrorHandler("Inventory not found for this partNo", 404));
    }

    // ✅ Update task
    task.completionQuantity = completionQuantity;
    task.status = "COMPLETED";
    task.completionNote = completionNote;
    task.completedAt = new Date();
    await task.save();

    // ✅ Update inventory (only match machineName)
    let updated = false;
    for (let q of inventory.quantities) {
      if (q.type.toLowerCase() === task.machineName.toLowerCase()) {
        q.quantity = completionQuantity; // overwrite with completion quantity
        updated = true;
        break;
      }
    }

    if (!updated) {
      inventory.quantities.push({
        type: task.machineName,
        quantity: completionQuantity,
      });
    }

    // ✅ Update total stock
    inventory.totalStockInHand = inventory.quantities.reduce((sum, q) => sum + q.quantity, 0);

    await inventory.save();
    console.log(inventory);

    return res.status(201).json({
      message: "Task completion and inventory update successful",
      success: true,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};


export const createProduction = async (req, res, next) => {
  const { productId, batchId, initialPlannedQty, status, rawMaterialFromInventory, reason } = req.body;
  try {
    const inventoryProduct = await Inventory.findOne({ productId: productId });

    if (!inventoryProduct) {
      return next(new ErrorHandler(`The product with this ${productId} id does not exist in inventory`, 404))
    }
    console.log(inventoryProduct)

    const production = await Production.findOne({ batchId: batchId, status: "INPROGRESS" });

    console.log(production)

    if (production) {
      return next(new ErrorHandler("The production with this production is already exist", 401))
    }



    if (inventoryProduct.minStock >= inventoryProduct.quantity) {
      return next(new ErrorHandler(`quantity:${inventoryProduct.quantity}< min stock:${inventoryProduct.minStock}`, 401))

    }

    if (inventoryProduct.quantity < rawMaterialFromInventory) {
      return next(new ErrorHandler(`quantity:${inventoryProduct.quantity}< request:${rawMaterialFromInventory}`, 401))
    }

    inventoryProduct.stockMovements.push({
      type: "OUT",
      reason: reason,
      quantity: rawMaterialFromInventory,
      user: req.user._id
    })
    let newStatus = status === 'IN_PROGRESS' ? "INPROGRESS" : status
    inventoryProduct.quantity -= rawMaterialFromInventory;

    await inventoryProduct.save();

    const newProduction = await Production.create({
      item: inventoryProduct._id,
      productId: productId,
      batchId: batchId,
      reason: reason,
      rawMaterialFromInventory: rawMaterialFromInventory,
      initialPlannedQty: initialPlannedQty,
      status: newStatus,
      createdBy: req.user._id
    })

    return res.status(201).json({
      message: 'New production created successfully',
      newProduction
    })

  } catch (error) {
    console.log(error);
    return next(error)
  }
}

// export const createStages = async(req,res,next)=>{
//   const {name,inputQty,outputQty,lossReason} = req.body;
//   const {productionId} = req.params;
//   try {
//     const production = await Production.findById(productionId);

//     if(!production){
//       return next(new ErrorHandler("This production does not exist",404))
//     }

//     if(outputQty>inputQty){
//       return next(new ErrorHandler("Output quantity cant be higher than input"))
//     }

//       let lossQty = inputQty - outputQty;

//       production.stages.push({
//         name:name,
//         inputQty:inputQty,
//         outputQty:outputQty,
//         lossQty:lossQty,
//         lossReason:lossReason
//       })

//       await production.save();
//   } catch (error) {

//   }
// }

export const getProduction = async (req, res, next) => {
  try {
    // Extract query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, batchId } = req.query;

    // Build dynamic filter
    const filter = {};

    if (status) {
      // Accept only valid statuses
      const allowedStatus = ["INPROGRESS", "COMPLETED"];
      if (!allowedStatus.includes(status.toUpperCase())) {
        return next(new ErrorHandler("Invalid status filter", 400));
      }
      filter.status = status.toUpperCase();
    }

    if (batchId) {
      // Case-insensitive partial search
      filter.batchId = { $regex: batchId, $options: "i" };
    }

    // Total count for pagination
    const total = await Production.countDocuments(filter);

    // Paginated results
    const productions = await Production.find(filter).select("-stages")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      message: "Productions fetched successfully",
      total,
      page,
      pages: Math.ceil(total / limit),
      productions,
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const getProductionDetail = async (req, res, next) => {
  const { productionId } = req.params;
  try {
    const production = await Production.findById(productionId).populate("createdBy").lean();
    if (!production) {
      return next(new ErrorHandler("This production does not exist", 404))
    }

    const workersWorkingONThisProduction = await Task.find({ batchId: production.batchId }).select("title").populate({ path: "assignedTo", select: 'name' })

    return res.status(200).json({
      message: 'Proudction detail fetched successfully',
      production,
      workersWorkingONThisProduction
    })

  } catch (error) {
    console.log(error);
    return next(error)
  }

}


export const createStages = async (req, res, next) => {
  const { name, inputQty, outputQty, lossReason } = req.body;
  const { productionId } = req.params;

  try {
    const production = await Production.findById(productionId);

    if (!production || production.status === "COMPLETED") {
      return next(new ErrorHandler("This production does not exist or is already completed", 404));
    }

    if (outputQty > inputQty) {
      return next(new ErrorHandler("Output quantity can't be higher than input", 400));
    }

    const lastStage = production.stages[production.stages.length - 1];

    // ✅ If not the first stage, inputQty must match previous stage's outputQty
    if (lastStage) {
      if (inputQty !== lastStage.outputQty) {
        return next(
          new ErrorHandler(
            `Input quantity (${inputQty}) must match output of previous stage (${lastStage.outputQty})`,
            400
          )
        );
      }
    } else {
      // ✅ First stage must match initial planned quantity
      if (inputQty !== production.initialPlannedQty) {
        return next(
          new ErrorHandler(
            `First stage input (${inputQty}) must match initial planned quantity (${production.initialPlannedQty})`,
            400
          )
        );
      }
    }

    const lossQty = inputQty - outputQty;

    production.stages.push({
      name,
      inputQty,
      outputQty,
      lossQty,
      lossReason,
    });

    await production.save();

    return res.status(201).json({
      message: "Stage added successfully",
      stages: production.stages,
    });
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export const finishProduction = async (req, res, next) => {

  const { productionId } = req.params;


  try {
    const production = await Production.findById(productionId);
    if (!production) {
      return next(new ErrorHandler("This production does not exist", 404))
    };
    production.status = "COMPLETED"
    const lastStage = production.stages[production.stages.length - 1];
    production.finalOutputQty = lastStage.outputQty;
    production.totalLoss = production.initialPlannedQty - lastStage.outputQty;

    await production.save();
    return res.status(200).json({
      message: 'Production completed successfully',

    })
  } catch (error) {
    console.log(error);
    return next(error);
  }
}


// export const getAllTask = async (req, res, next) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   const { date, partNo } = req.query;

//   // Build dynamic filter
//   const filter = {};

//   if (status) {
//     // Accept only valid statuses
//     const allowedStatus = ["IN_PROGRESS", "COMPLETED"];
//     if (!allowedStatus.includes(status.toUpperCase())) {
//       return next(new ErrorHandler("Invalid status filter", 400));
//     }
//     filter.status = status.toUpperCase();
//   }

//   if (batchId) {
//     // Case-insensitive partial search
//     filter.batchId = { $regex: batchId, $options: "i" };
//   }
//   try {
//     const total = await Task.countDocuments(filter);

//     // Paginated results
//     const tasks = await Task.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit).populate({
//         path: "assignedTo",
//         select: "name"
//       });

//     return res.status(200).json({
//       message: "Task fetched successfully",
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       tasks,
//     });

//   } catch (error) {
//     console.log(error);
//     return next(error)
//   }
// }



// export const getAllTask = async (req, res, next) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   const { date, partNo } = req.query;

//   // Build dynamic filter
//   const filter = {};

//   // 🔹 Filter by date
//   if (date) {
//     // Exact day range (00:00:00 - 23:59:59)
//     const start = new Date(date);
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(date);
//     end.setHours(23, 59, 59, 999);

//     filter.date = { $gte: start, $lte: end };
//   } else {
//     // Default → today only
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     filter.date = { $gte: today, $lt: tomorrow };
//   }

//   // 🔹 Filter by partNo
//   if (partNo) {
//     let part = await PartNo.findOne({partNo:partNo});
//     if(!part){
//       return next(new ErrorHandler("This part No does not exist",404))
//     }
//     filter.partNo = part;
//   }

//   try {
//     const total = await Task.countDocuments(filter);

//     const tasks = await Task.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate({
//         path: "assignedTo",
//         select: "name",
//       })
//       .populate({
//         path: "partNo",
//         select: "partNo partName", // adjust fields as per your PartNo schema
//       });

//     return res.status(200).json({
//       message: "Task fetched successfully",
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       tasks,
//     });
//   } catch (error) {
//     console.error(error);
//     return next(error);
//   }
// };


export const getAllTask = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { date, partNo, shift } = req.query; // ✅ added shift

  // Build dynamic filter
  const filter = {};

  // 🔹 Date Filter
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    filter.date = { $gte: start, $lte: end };
  } else {
    // Default → today only
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    filter.date = { $gte: today, $lt: tomorrow };
  }

  // 🔹 PartNo Filter
  if (partNo) {
    const part = await PartNo.findOne({ partNo: partNo });
    if (!part) {
      return next(new ErrorHandler("This part No does not exist", 404));
    }
    filter.partNo = part;
  }

  // 🔹 Shift Filter
  if (shift && ["Day", "Night"].includes(shift)) {
    filter.shift = shift;
  }

  try {
    const total = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "assignedTo",
        select: "name",
      })
      .populate({
        path: "partNo",
        select: "partNo partName",
      });

    return res.status(200).json({
      message: "Task fetched successfully",
      total,
      page,
      pages: Math.ceil(total / limit),
      tasks,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};


export const getSupervisorAdminData = async (req, res, next) => {
  try {
    const InventoryCount = await Inventory.countDocuments();
    const ProductionCount = await Production.countDocuments();
    const EmployeeCount = await Employee.countDocuments();

    // Get today's date range
    const startOfToday = dayjs().startOf('day').toDate();
    const endOfToday = dayjs().endOf('day').toDate();

    // Count today's attendance by status
    const presentToday = await Attendance.countDocuments({
      date: { $gte: startOfToday, $lte: endOfToday },
      status: 'PRESENT',
    });

    const absentToday = await Attendance.countDocuments({
      date: { $gte: startOfToday, $lte: endOfToday },
      status: 'ABSENT',
    });

    return res.status(200).json({
      success: true,
      InventoryCount,
      ProductionCount,
      EmployeeCount,
      presentToday,
      absentToday,
    });
  } catch (error) {
    console.error('Supervisor dashboard data error:', error);
    return next(error);
  }
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import axios from 'axios'
import PDFDocument from "pdfkit";
const TEMPLATE_URL="https://res.cloudinary.com/your-cloud/raw/upload/v1234567890/templates/03h1strainer.pdf";

export const generateInvoicePdf = async (req, res) => {
  try {
    const data = req.body || {};

    // 1. Create PDF doc
    const doc = new PDFDocument({ margin: 50 });

    // 2. Collect PDF in memory buffer
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const pdfBufferPromise = new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    // 3. Header
    doc.fontSize(16).text("INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice No: ${data.invoiceNo || "VR/2025-26/03"}`);
    doc.text(`Invoice Date: ${data.invoiceDate || "09-09-2025"}`);
    doc.text(`Vendor Code: ${data.vendorCode || "VV10"}`);

    doc.moveDown();
    doc.fontSize(12).text("Bill To:");
    doc.fontSize(10).text(data.billTo || "Mangla Tube Pvt Ltd\nPant Nagar");
    doc.moveDown();
    doc.fontSize(12).text("Ship To:");
    doc.fontSize(10).text(data.shipTo || "Mangla Tube Pvt Ltd\nPant Nagar");

    doc.moveDown(2);

    // 4. Table Header
    doc.fontSize(11).text("Items", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colX = [50, 100, 200, 280, 340, 400];

    const headers = ["S.No", "HSN", "Unit Price", "Qty", "UOM", "Amount"];
    headers.forEach((h, i) => {
      doc.text(h, colX[i], tableTop, { continued: i !== headers.length - 1 });
    });

    doc.moveDown();

    // 5. Table Rows
    const items = Array.isArray(data.items)
      ? data.items
      : [
          {
            sNo: 1,
            hsn: "7318",
            unitPrice: "75.93",
            qty: "3240.00",
            uom: "36",
            amount: "2,46,013",
          },
          {
            sNo: 2,
            hsn: "7318",
            unitPrice: "25.19",
            qty: "1500.00",
            uom: "6",
            amount: "37,785",
          },
        ];

    let rowY = doc.y + 5;
    items.forEach((r) => {
      doc.text(r.sNo, colX[0], rowY);
      doc.text(r.hsn, colX[1], rowY);
      doc.text(r.unitPrice, colX[2], rowY);
      doc.text(r.qty, colX[3], rowY);
      doc.text(r.uom, colX[4], rowY);
      doc.text(r.amount, colX[5], rowY);
      rowY += 20;
    });

    // 6. Totals
    doc.moveDown(2);
    doc.text(`Total Before Tax: ${data.totalBeforeTax || "2,84,798"}`, {
      align: "right",
    });
    doc.text(`IGST: ${data.igst || "51,264"}`, { align: "right" });
    doc.text(`Total Payable: ${data.totalPayable || "3,36,062"}`, {
      align: "right",
    });

    // 7. Amount in Words
    doc.moveDown();
    doc.fontSize(10).text(
      `Amount in Words: ${data.amountInWords || "Three Lakh Thirty Six Thousand Sixty Two Only"}`
    );

    // 8. End PDF
    doc.end();
    const pdfBuffer = await pdfBufferPromise;

    // 9. Upload directly to Cloudinary
    const uploadStream = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "raw", folder: "invoices" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(pdfBuffer);
      });

    const uploadResponse = await uploadStream();

    // 10. Save to MongoDB
    const invoice = await Invoice.create({
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });

    return res.status(201).json({
      message: "Invoice generated & uploaded successfully",
      cloudinary: uploadResponse,
      dbRecord: invoice,
    });
  } catch (err) {
    console.error("PDF gen error:", err);
    return res
      .status(500)
      .json({ error: "PDF generation failed", details: err.message });
  }
};

export const getInvoice = async(req,res)=>{
  try {
    const file = await Invoice.find({});
    return res.status(200).json({file})
  } catch (error) {
    console.log(error)
  }
}


