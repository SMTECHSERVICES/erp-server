// models/Task.js
import mongoose from "mongoose";
import { string } from "zod";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    batchId: { type: String, required: true, },                              
  // location: { type: String }, // optional
  dueDate: { type: Date },
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
