import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  scheduleDate: { type: Date, required: true },

  parts: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo", required: true },

      scheduleQuantity: { type: Number, required: true },   // How many we need to produce
      materialRequired: { type: Number, required: true },   // Material required per piece (or total)
      stockInHand: { type: Number, default: 0 },            // Current available stock

      // grossWt: { type: Number, required: true },            // Gross weight
     // rmRate: { type: Number, required: true },             // Raw Material rate
      nosPerKg: { type: Number },      
      disPatchQuantity:{type:Number},   
      totalCost:{type:Number},        // NOS/KG calculation
      
      totalMaterialRequired: { type: Number, required: true,default:0 } // Total qty needed
    }

  ],
  totalPipeWeightinInventory:{
    type:Number,
    default:0
  },
  totalRoundBarWeightinInventory:{
    type:Number,
    default:0
  },
  totalPipeWeightRequirement:{
    type:Number,
    default:0
  },
  totalRoundBarWeightRequirement:{
    type:Number,
    default:0
   
    
  }
}, { timestamps: true });

const Schedule = mongoose.model("Schedule", scheduleSchema);
export default Schedule;
