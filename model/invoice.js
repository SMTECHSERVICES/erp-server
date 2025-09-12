import mongoose from "mongoose";


const invoiceSchema = new mongoose.Schema({
    url:String,
    publicId:String
})

const Invoice = mongoose.model("Invoice",invoiceSchema);

export default Invoice;