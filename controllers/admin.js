import { sendOTPEmail } from "../utils/sendEmail.js";
import Admin from "../model/admin.js";
import jwt from 'jsonwebtoken'
import generateToken from "../utils/generateToken.js";
import { cookieOption } from "../constants/cookieOption.js";

import Inventory from "../model/inventory.js";
import Production from "../model/production.js";
import Employee from "../model/employee.js";
import Attendance from "../model/attendance.js";

import {
  sendOtpSchema,
  verifyOtpRegisterSchema,
  verifyOtpLoginSchema,
  employeeRegistrationSchema
} from "../utils/zodSchema.js";

import { ErrorHandler } from "../middleware/errorHandler.js";


export const sendOTP = async (req, res,next) => {
   const result = sendOtpSchema.safeParse(req.body);
   //console.log(result.error.issues[0].message)
   if(!result.success){
   return next(new ErrorHandler(result.error.issues[0].message,400))
   }

  const { email } = req.body;

  try {
    let admin = await Admin.findOne({ email });
    if (!admin) {
         admin = new Admin({ email });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiry in DB
    admin.otp = otp;
    admin.otpExpires = new Date(Date.now() +  2* 60 * 1000); // expires in 10 min
    await admin.save();

    // Send OTP
    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Internal server error",500))
  }
};


export const verifyOtpRegister =  async (req, res,next) => {
  const result  = verifyOtpRegisterSchema.safeParse(req.body)
   if(!result.success){
    return next(new ErrorHandler(result.error.issues[0].message,400))
   }
  const { email, otp,fullName } = req.body;

  try {
   
    const admin = await Admin.findOne({ email });
    if (!admin) return next(new ErrorHandler("Admin not found",404))

    if (admin.otp !== otp) {
      return next(new ErrorHandler('Invalid OTP',400))
    }

    if (admin.otpExpires < new Date()) {
      await Admin.deleteOne({email:email})
      return next(new ErrorHandler("OTP EXPIRES",400));
    }

    // ✅ OTP is valid
    admin.fullName=fullName;
    // admin.password=password
    admin.otp = null;
    admin.otpExpires = null;
    await admin.save();

const token = generateToken(admin._id,admin.role);

    res.cookie("token",token,cookieOption)

    // You can return a token or session here
    res.status(200).json({ message: "OTP verified. Login successful", admin });
  } catch (err) {
    return next(new ErrorHandler("OTP verificaion failed"),500)
    
  }
};

export const verifyOtplogin = async(req,res,next)=>{
  const result = verifyOtpLoginSchema.safeParse(req.body);
   if(!result.success){
    return next(new ErrorHandler(result.error.issues[0].message,400))
   }
    const {email,otp,adminKey} = req.body;

  
        if(adminKey !== process.env.ADMIN_SECRET){
          return next(new ErrorHandler('Invalid Admin key',401))
        }
    try {
        const admin = await Admin.findOne({email:email});
        if(!admin){
          return next(new ErrorHandler('You are not authorize to access this route',401))
        }

           if (admin.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (admin.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    admin.otp=null;
    admin.otpExpires=null;

    await admin.save();

    const token = generateToken(admin._id,admin.role);
    res.cookie("token",token,cookieOption)

    return res.status(200).json({
        message:"welcome boss",
        admin
    })

    } catch (error) {
        console.log('error at login',error);
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}


export const employeeRegistration = async(req,res)=>{
  const result= employeeRegistrationSchema.safeParse(req.body);
   if(!result.success){
    return res.status(400).json({
      message:result.error.issues[0].message
    })
   }

   //console.log(result.data)
    const {name,email,phone,role,password} = req.body;

    try {
      const newEmployee = await Employee.create({
        name:name,
        password:password,
        email:email,
        phone:phone,
        role:role
      })

      return res.status(201).json({
        message:'Employer registration successfull',
        newEmployee
      })
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message:'Internal sever error'
      })
    }
}

export const getAllEmployee = async(req,res,next)=>{
   try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const name = req.query.name?.trim(); // optional name filter

    const query = {};
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // case-insensitive search
    }

    const total = await Employee.countDocuments(query);

    const employees = await Employee.find(query)
      .skip(skip)
      .limit(limit)
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



const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
};

export const getAdminDashboardData = async (req, res) => {
  try {
    // 1. Summary Cards Data
    const [inventoryItems, employees, productionOrders] = await Promise.all([
      Inventory.find(),
      Employee.find(),
      Production.find()
    ]);

    // Inventory summary
    const lowStockItems = inventoryItems.filter(item => 
      item.quantity < item.minStock
    );

    // Production summary
    const completedOrders = productionOrders.filter(order => 
      order.status === 'COMPLETED'
    );

    // 2. Charts Data
    // Monthly production quantity
    const monthlyProduction = await Production.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: {
          _id: { $month: "$createdAt" },
          totalOutput: { $sum: "$finalOutputQty" },
          totalLoss: { $sum: "$totalLoss" }
      }},
      { $sort: { "_id": 1 } }
    ]);

    // Production loss reasons
    const lossReasons = await Production.aggregate([
      { $unwind: "$stages" },
      { $group: {
          _id: "$stages.lossReason",
          totalLoss: { $sum: "$stages.lossQty" }
      }},
      { $sort: { totalLoss: -1 } },
      { $limit: 5 }
    ]);

    // Inventory by category
    const inventoryByCategory = await Inventory.aggregate([
      { $group: {
          _id: "$category",
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 }
      }},
      { $sort: { totalQuantity: -1 } }
    ]);

    // Current month attendance
    const { start, end } = getCurrentMonthRange();
    const currentMonthAttendance = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: {
          _id: "$status",
          count: { $sum: 1 }
      }}
    ]);

    // 3. Compile dashboard data
    const dashboardData = {
      // Summary Cards
      summary: {
        inventory: {
          totalItems: inventoryItems.length,
          lowStockCount: lowStockItems.length,
          categories: inventoryByCategory.length
        },
        employees: {
          total: employees.length,
          active: employees.filter(e => e.isActive).length,
          supervisors: employees.filter(e => e.role === 'SUPERVISOR').length
        },
        production: {
          totalOrders: productionOrders.length,
          completed: completedOrders.length,
          inProgress: productionOrders.length - completedOrders.length
        },
        losses: {
          total: completedOrders.reduce((sum, order) => sum + (order.totalLoss || 0), 0),
          reasons: lossReasons
        }
      },

      // Charts Data
      charts: {
        monthlyProduction: monthlyProduction.map(item => ({
          month: item._id,
          output: item.totalOutput,
          loss: item.totalLoss
        })),
        inventoryCategories: inventoryByCategory.map(cat => ({
          category: cat._id || 'Uncategorized',
          quantity: cat.totalQuantity
        })),
        attendance: currentMonthAttendance.map(item => ({
          status: item._id,
          count: item.count
        }))
      },

      // Detailed Lists
      alerts: {
        lowStock: lowStockItems.map(item => ({
          productId:item.productId,
          name: item.name,
          quantity: item.quantity,
          minStock: item.minStock,
          deficit: item.minStock - item.quantity
        })).sort((a, b) => b.deficit - a.deficit)
      }
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to load dashboard data",
      error: error.message 
    });
  }
};


