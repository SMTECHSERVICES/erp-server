// models/Task.js
import mongoose from "mongoose";


const taskSchema = new mongoose.Schema({
  partNo:{type:mongoose.Types.ObjectId,ref:"PartNo", required: true },
  machineName:{type:String},
  machineNumber:{type:Number,default:0},
  // machineNumber:{type:String},
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  completionQuantity:{type:Number},
  // employeeWork:{type:Number},
  target:{type:Number},

  // location: { type: String }, // optional
  date: { type: Date },
  shift:{type:String,enum:["Day","Night"]},
  status: {
    type: String,
    enum: [ 'IN_PROGRESS', 'COMPLETED'],
    default: 'IN_PROGRESS'
  },
  // assignProductImage:{type:String,require:true},
  // assignProductImagePublicId:{type:String,require:true,select:false},
  // proofPhoto: { type: String },
  completionNote: { type: String },
  completedAt: { type: Date }
}, { timestamps: true });

const Task = mongoose.model('Task',taskSchema);

export default Task
