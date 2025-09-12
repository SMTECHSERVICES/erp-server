import mongoose from "mongoose";


// models/InventoryItem.js
const partNoSchema = new mongoose.Schema({
  partNo: { type: String, required: true, unique: true }, 
  od: { type: Number, required:true},                    
  id: { type: Number,default:0.0 },                               
  length: { type:Number,required:true }, 
  drawingFileUrl:{type:String,required:true},
  drawingFilePublicId:{type:String},
  cncSetupRequired:{type:Number,default:0},
  cncCycleTime:{type:Number},
  latheCycleTime:{type:Number,default:0},
  rmRate:{type:Number,required:true},
  grossWeight:{type:Number,required:true},
  rawMaterialType:{
    type:String,
    required:true,
    enum:["Pipe","Round Bar"]
  }     
                                      
}, { timestamps: true });


const PartNo = mongoose.model("PartNo",partNoSchema);

export default PartNo;