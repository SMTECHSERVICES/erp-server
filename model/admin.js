import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // optional, if each admin must have a unique email
  },
  fullName: {
    type: String,
    //required: true,
  },
  otp: {
    type: String, // Store OTP as string (especially if you send numeric codes)
    default: null,
  },
  otpExpires: {
  type: Date,
  default: null,
},
role:{
    type:String,
    default:'ADMIN'
}
},{timestamps:true});

// Hash the password before saving
// adminSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// // (Optional) method to compare password
// adminSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
