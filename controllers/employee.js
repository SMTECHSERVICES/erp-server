import { ErrorHandler } from "../middleware/errorHandler.js";
import { calculateDistance } from "../utils/calculateDistance.js";
import Attendance from "../model/attendance.js";
import dotenv from 'dotenv';
import { employeeLoginSchema } from "../utils/zodSchema.js";
import Employee from "../model/employee.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { cookieOption } from "../constants/cookieOption.js";
import { calculateHours } from "../utils/calculateHours.js";
import Task from "../model/task.js";
import { parseMonthString } from "../utils/parseMonthString.js";
dotenv.config()


const officeLong = process.env.COMPANY_LONGITUDE;
const officeLat = process.env.COMPANY_LATITUDE;

export const employeeLogin = async(req,res,next)=>{

    const result = employeeLoginSchema.safeParse(req.body);
    // console.log(result)
      //console.log(result.error.issues[0].message)
      if(!result.success){
      return next(new ErrorHandler(result.error.issues[0].message,400))
      }

      const {phone,password}  = result.data;

      try {
        const employee = await Employee.findOne({phone:phone})
        // console.log(employee)

        if(!employee){
            return next(new ErrorHandler('Invalid phone Number',400))
        }

        const isMatch = await bcrypt.compare(password,employee.password);
        if(!isMatch){
            return next(new ErrorHandler("Invalid password",400))

        }

        const token = generateToken(employee._id,employee.role);
         console.log(token)
         res.cookie("token",token,cookieOption);
         return res.status(200).json({
            message:'Login successfull',
            success:true,
            role:employee.role
         })
      } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Internal server error",500))
      }

}

export const markInTime = async(req,res,next)=>{
    const {inLocation} = req.body;
    console.log(inLocation)

    if(!inLocation || !inLocation.lat || !inLocation.lng){
        return next(new ErrorHandler('Locaion is required',400))
    }

    try {
        const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing?.inTime) {
      return res.status(200).json({
        message: "In-Time already marked for today",
        attendance: existing
      });
    }
    // console.log(inLocation)
    // console.log(officeLat,officeLong)

    const distance = calculateDistance(inLocation.lat,inLocation.lng,officeLat,officeLong);
    // console.log(distance)

    if(distance >50){
        return next(
        new ErrorHandler(
          `You are too far from office location. Distance: ${distance.toFixed(
            2
          )} meters`,
          403
        )
      );
    }

   let attendance;
    if (existing) {
      // 3A. Update inTime if entry exists without inTime (rare case)
      existing.inTime = new Date();
      existing.inLocation = inLocation;
      attendance = await existing.save();
    } else {
      // 3B. New entry for today
      attendance = await Attendance.create({
        employee: req.user._id,
        date: new Date(),
        inTime: new Date(),
        inLocation,
        status: "PRESENT"
      });
    }

    return res.status(201).json({
        success:true,
        message:'Attendance marked successfully'
    })

    } catch (error) {
        //console.log(error);
        return next(new ErrorHandler("Internal server error",500))
    }

}

export const markOutTime = async(req,res,next)=>{
    const {outLocation} = req.body;

    if(!outLocation || !outLocation.lat || !outLocation.lng){
        return next(new ErrorHandler('Locaion is required',400))
    }

    try {
        const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if(!existing){
      return next(new ErrorHandler("Please mark intime first",401))
    }
    
    if (existing?.outTime) {
      return res.status(200).json({
        message: "out-Time already marked for today",
        attendance: existing
      });
    }

    //console.log(existing)
    //console.log("hi")

    if(!existing?.inTime){
      return next(new ErrorHandler("Please mark intime first",401))
    }

    //console.log("Hello")
    // console.log(outLocation)
    // console.log(officeLat,officeLong)

    const distance = calculateDistance(outLocation.lat,outLocation.lng,officeLat,officeLong);
    // console.log(distance)

    if(distance >50){
        return next(
        new ErrorHandler(
          `You are too far from office location. Distance: ${distance.toFixed(
            2
          )} meters`,
          403
        )
      );
    }

    const totalWorkingHours = calculateHours(existing.inTime,new Date());
    

  
    if (existing) {
      // 3A. Update inTime if entry exists without inTime (rare case)
      existing.outTime = new Date();
      existing.outLocation = outLocation;
      existing.totalHours=totalWorkingHours
      if(totalWorkingHours>=9){
        existing.status="PRESENT"
      }else if(totalWorkingHours>=5){
        existing.status="HALF DAY"
      }else{
        existing.status="ABSENT"
      }
      await existing.save();
    }

    return res.status(201).json({
        success:true,
        message:'Attendance marked successfully'
    })

    } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Internal server error",500))
    }
}

export const getMyDetails = async(req,res,next)=>{
  try {
    const myAttendance = await Attendance.find({employee:req.user._id});

    const totalDays = myAttendance.length;

    const presentDays = myAttendance.filter((pAtt)=>{
      pAtt.status==="PRESENT"
    }).length;

     const absentDays = myAttendance.filter((abAtt)=>{
      abAtt.status==="ABSENT"
    }).length;


    const leaveDays = myAttendance.filter((haAtt)=>{
      haAtt.status==="LEAVE"
    }).length;

    const halfDays = myAttendance.filter((haD)=>{
      haD.status ==="HALF DAYS"
    }).length

    return res.status(200).json({
      myAttendanceStatus:{
        totalDays,
        halfDays,
        leaveDays,
        presentDays,
        absentDays

      },
      myDetails:req.user
    })

    

    
  } catch (error) {
    console.log(error);
    next(error)
    
  }
}


import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
dayjs.extend(isoWeek); // Enables week-based filtering

export const myAttendance = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 7;
  const skip = (page - 1) * limit;
  const filter = req.query.filter || "all"; // 'month', 'week', 'all'

  try {
    let query = { employee: req.user._id };

    // Apply date filtering for month or week
    if (filter === "month") {
      const startOfMonth = dayjs().startOf("month").toDate();
      const endOfMonth = dayjs().endOf("month").toDate();
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (filter === "week") {
      const startOfWeek = dayjs().startOf("isoWeek").toDate();
      const endOfWeek = dayjs().endOf("isoWeek").toDate();
      query.date = { $gte: startOfWeek, $lte: endOfWeek };
    }

    // Count total items matching filter
    const totalRecords = await Attendance.countDocuments(query);

    // Get paginated records
    const myAttendance = await Attendance.find(query)
      .select("-inLocation -outLocation")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    // Summary counts
    const presentDays = myAttendance.filter(a => a.status === "PRESENT").length;
    const absentDays = myAttendance.filter(a => a.status === "ABSENT").length;
    const leaveDays = myAttendance.filter(a => a.status === "LEAVE").length;
    const halfDays = myAttendance.filter(a => a.status === "HALF DAY").length;

    res.status(200).json({
      success: true,
      myAttendance,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
      myAttendanceStatus: {
        totalDays: myAttendance.length,
        presentDays,
        absentDays,
        leaveDays,
        halfDays
      }
    });

  } catch (error) {
    console.error("Attendance fetch error:", error);
    next(error);
  }
};


export const MyTask = async(req,res,next)=>{
  
  try {
    const myTask = await Task.find({assignedTo:req.user._id,status:"IN_PROGRESS"}).populate({path:'partNo',select:"partNo drawingFileUrl od id length"});

    return res.status(200).json({
      myTask
    })
  } catch (error) {
    console.log(error);
    return next(error)
  }
}

export const markTaskComplete = async(req,res,next)=>{
  try {
    const {taskId} = req.params;
    const {completionQuantity} = req.body;

    console.log(taskId,completionQuantity)

    if(!taskId || !completionQuantity){
        return next(new ErrorHandler("Please provide the detail",400))
    }

    const task = await Task.findById(taskId);

    if(!task || task.status==="COMPLETED"){
      return next(new ErrorHandler("This task does not exist"))
    }

    task.completionQuantity=completionQuantity;
    await task.save();

    return res.status(201).json({
      message:'Task updated successfully'
    })


  } catch (error) {
    console.log(error);
    next(error);
  }
}

export const allMyTasks = async (req, res, next) => {
  try {
    const userId = req.user.id; // logged in employee
    const { date } = req.body; // or req.query depending on frontend

    if (!date) {
      return next(new ErrorHandler("Please provide a date", 400));
    }

    // Normalize date: from start of the day to end of the day
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      assignedTo: userId,
      date: { $gte: start, $lte: end }
    })
      .populate("partNo", "partNo partName material")
      .populate("assignedBy", "name email")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

export const myProgressbar = async (req, res, next) => {
  try {
    // console.log(req.user._id)
    const  employeeId  = req.user.id;
    const { month } = req.query; // optional: month filter
    console.log(employeeId)

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