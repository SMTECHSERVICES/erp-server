import { success } from "zod";
import { ErrorHandler } from "../middleware/errorHandler.js";
import Employee from "../model/employee.js";
import Inventory from "../model/inventory.js";
import { employeeRegistrationSchema } from "../utils/zodSchema.js";
import Task from "../model/task.js";
import Production from "../model/production.js";
import dayjs from "dayjs";
import Attendance from "../model/attendance.js";


export const employeeRegistration = async(req,res,next)=>{
  const result= employeeRegistrationSchema.safeParse(req.body);
   if(!result.success){
    return next(new ErrorHandler(result.error.issues[0].message,400))
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
      next(error)
    }
}

export const getInventoryItem = async(req,res,next)=>{
  try {
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const { productId } = req.query;

    const query = {};
    if (productId) {
      query.productId = productId;
    }

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query).select("productId name category quantity")
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
    const { productId, name, category, quantity, unit,  reason } = req.body;

    const existing = await Inventory.findOne({ productId });
    if (existing) return next(new ErrorHandler("Product ID already exists", 400));

    

    const newItem = new Inventory({
      productId,
      name,
      category,
      quantity,
      unit,
      stockMovements: [{
        type:"IN",
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


export const upadateInventoryProduct = async(req,res,next)=>{

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


export const getAllWorkers = async(req,res,next)=>{
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

export const getWorkerDetail = async(req,res,next)=>{
  const {workerId} = req.params;

  try {
    const worker = await Employee.findById(workerId).select("-password");
    if(!worker){
      return next(new ErrorHandler("Worker not found",404));
    }
    const assignedTask = await Task.find({assignedTo:worker._id});

    return res.status(200).json({
      success:true,
      worker,
      assignedTask
    })
  } catch (error) {
    console.log(error);
    next(error)
  }
}

export const assignTaskToWoker = async(req,res,next)=>{
  const {workerId} = req.params;
  const {title,description,batchId,dueDate} = req.body;

  console.log(workerId,title,description,batchId,dueDate)

  try {
 const production = await Production.findOne({
      batchId: batchId,
      status: "INPROGRESS",
    });

    if (!production) {
      return next(
        new ErrorHandler(
          "No active (INPROGRESS) production found for this batchId",
          400
        )
      );
    }

    const newTask = await Task.create({
      title:title,
      description:description,
      assignedBy:req.user._id,
      assignedTo:workerId,
      batchId:batchId,
      dueDate:dueDate
    })

    return res.status(201).json({
      success:true,
      message:'Task Asssigned Successfully',
      newTask
    })
  } catch (error) {
    console.log(error);
    next(error)
  }
  
}

export const markTaskComplete = async(req,res,next)=>{
  const {completionNote} = req.body;
  const {taskId} = req.params

  try {
    const task = await Task.findById(taskId);

    if(!task){
      return next(new ErrorHandler("The task does not exist",400))
    }

    task.status = "COMPLETED";
    task.completionNote = completionNote;

    await task.save();
    return res.status(201).json({
      message:'Task upadation successfull',
      success:true,
      
    })
  } catch (error) {
    console.log(error);
    next(error)
  }
}

export const createProduction = async(req,res,next)=>{
  const {productId,batchId,initialPlannedQty,status,rawMaterialFromInventory,reason} = req.body;
  try {
    const inventoryProduct = await Inventory.findOne({productId:productId});

       if(!inventoryProduct){
      return next(new ErrorHandler(`The product with this ${productId} id does not exist in inventory`,404))
    }
    console.log(inventoryProduct)

    const production = await Production.findOne({batchId:batchId,status:"INPROGRESS"});

    console.log(production)

    if(production){
      return next(new ErrorHandler("The production with this production is already exist",401))
    }

 

    if(inventoryProduct.minStock>=inventoryProduct.quantity){
      return next(new ErrorHandler(`quantity:${inventoryProduct.quantity}< min stock:${inventoryProduct.minStock}`,401))

    }

    if(inventoryProduct.quantity<rawMaterialFromInventory){
      return next(new ErrorHandler(`quantity:${inventoryProduct.quantity}< request:${rawMaterialFromInventory}`,401))
    }

    inventoryProduct.stockMovements.push({
      type:"OUT",
      reason:reason,
      quantity:rawMaterialFromInventory,
      user:req.user._id
    })
      let newStatus = status==='IN_PROGRESS' ?"INPROGRESS" : status
    inventoryProduct.quantity -=   rawMaterialFromInventory;

    await inventoryProduct.save();

    const newProduction  = await Production.create({
      item:inventoryProduct._id,
      productId:productId,
      batchId:batchId,
      reason:reason,
      rawMaterialFromInventory:rawMaterialFromInventory,
      initialPlannedQty:initialPlannedQty,
      status:newStatus,
      createdBy:req.user._id
    })

    return res.status(201).json({
      message:'New production created successfully',
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

export const getProductionDetail = async(req,res,next)=>{
  const {productionId} = req.params;
  try {
    const production  = await Production.findById(productionId).populate("createdBy").lean();
    if(!production){
      return next(new ErrorHandler("This production does not exist",404))
    }

    const workersWorkingONThisProduction = await Task.find({batchId:production.batchId}).select("title").populate({path:"assignedTo",select:'name'})

    return res.status(200).json({
      message:'Proudction detail fetched successfully',
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

    if (!production || production.status==="COMPLETED") {
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

export const finishProduction = async(req,res,next)=>{

  const {productionId} = req.params; 
 

  try {
    const production = await Production.findById(productionId);
    if(!production){
      return next(new ErrorHandler("This production does not exist",404))
    };
    production.status = "COMPLETED"
    const lastStage = production.stages[production.stages.length - 1];
    production.finalOutputQty = lastStage.outputQty;
    production.totalLoss = production.initialPlannedQty - lastStage.outputQty;

    await production.save();
    return res.status(200).json({
      message:'Production completed successfully',

    })
  } catch (error) {
    console.log(error);
    return next(error);
  }
}


export const getAllTask = async(req,res,next)=>{
  const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, batchId } = req.query;

    // Build dynamic filter
    const filter = {};

    if (status) {
      // Accept only valid statuses
      const allowedStatus = ["IN_PROGRESS", "COMPLETED"];
      if (!allowedStatus.includes(status.toUpperCase())) {
        return next(new ErrorHandler("Invalid status filter", 400));
      }
      filter.status = status.toUpperCase();
    }

    if (batchId) {
      // Case-insensitive partial search
      filter.batchId = { $regex: batchId, $options: "i" };
    }
  try {
       const total = await Task.countDocuments(filter);

    // Paginated results
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit).populate({
        path:"assignedTo",
        select:"name"
      });

    return res.status(200).json({
      message: "Task fetched successfully",
      total,
      page,
      pages: Math.ceil(total / limit),
      tasks,
    });
     
  } catch (error) {
    console.log(error);
    return next(error)
  }
}

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