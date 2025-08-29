// models/Attendance.js
import mongoose from "mongoose";
import { string } from "zod";

const attendanceSchema = new mongoose.Schema({
   employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  date: { type: Date, required: true },
  inTime: { type: Date },
  outTime: { type: Date },
  inLocation: {
    lat: Number,
    lng: Number
  },
  outLocation: {
    lat: Number,
    lng: Number
  },
  totalHours: { type: Number },
  status: {
    type: String,
    enum: ['PRESENT',"HALF DAYS",'ABSENT',"LEAVE"],
    default: 'PRESENT'
  }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance",attendanceSchema)

export default Attendance
