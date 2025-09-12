// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String,required:true },
  role: {
    type: String,
    enum: ['SUPERVISOR', 'WORKER'],
    default: 'WORKER'
  },
  password: { type: String,required:true }, // hashed password
  photoUrl: { type: String,required:true },
  photoUrlPublicId: {
    type:String,
    select:false
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash the password before saving
EmployeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// (Optional) method to compare password
EmployeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
const Employee = mongoose.model("Employee", EmployeeSchema);
export default Employee
