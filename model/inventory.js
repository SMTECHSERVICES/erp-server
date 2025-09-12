import mongoose from "mongoose";
import { string } from "zod";

// models/InventoryItem.js
const inventoryItemSchema = new mongoose.Schema({
  partNo: { type: mongoose.Schema.Types.ObjectId, ref:"PartNo" }, 
  partNoName:{type:String},
 
    quantities: [
    {
      type: { type: String, required: true }, // e.g. "raw", "finished", "cnc1"
      quantity: { type: Number, default: 0 },
      unit: { type: String, default: "pcs" }, // e.g. "pcs", "kg", "litre"
    },
  ], 
  totalStockInHand:{type:Number,default:0} ,      
  // stockMovements: [                                          
  //   {
  //     type: { type: String, enum: ['IN', 'OUT'], required: true },
  //     quantity: { type: Number, required: true },
  //     reason: { type: String },
  //     user: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  //     date: { type: Date, default: Date.now }
  //   }
  // ]
}, { timestamps: true });


const Inventory = mongoose.model("Inventory",inventoryItemSchema);

export default Inventory;