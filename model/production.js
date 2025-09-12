import mongoose from "mongoose";
import { date, string } from "zod";

// models/ProductionOrder.js
const productionOrderSchema = new mongoose.Schema({
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true }, // 👈 Link to InventoryItem
  date:{type:Date},
  rawMaterialFromInventory:{type:Number,required:true},
  reason:{type:String,required:true},                              // 👈 Production batch number
  initialPlannedQty: { type: Number, required: true },                                  // 👈 How much was intended to be produced
  finishedProduct: { type: Number },
  totalLoss:{type:Number},                                                     // 👈 How much was finally created
  status:{type:String,enum: ['INPROGRESS', 'COMPLETED'],required:true},              
  stages: [                                                                             // 👇 Track each production stage
    
    {
      name: { type: String, required: true },            // 👈 e.g., Cutting, Welding, Assembly
      inputQty: { type: Number, required: true },        // 👈 Material entered into this stage
      outputQty: { type: Number, required: true },       // 👈 Successful output
      lossQty: { type: Number, required: true },         // 👈 What got wasted
      lossReason: { type: String, required: true },      // 👈 Why it was wasted
      completedAt: { type: Date, default: Date.now }     // 👈 Timestamp for completion
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }, // 👈 Who started the production
  createdAt: { type: Date, default: Date.now }
});


const Production = mongoose.model("Production",productionOrderSchema);

export default Production

