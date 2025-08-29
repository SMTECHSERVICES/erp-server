import jwt from 'jsonwebtoken';
import Employee from '../model/employee.js';
import { ErrorHandler } from './errorHandler.js';
import dotenv from 'dotenv';

dotenv.config();

export const employeeVerificationMiddleware = async(req,res,next)=>{
    try {
        const authToken = req.cookies.token;
        //console.log(authToken)

        if(!authToken){
            return next(new ErrorHandler("Please login to visit this route",401))
        }

        const decodedData = jwt.verify(authToken,process.env.JWT_SECRET);

        const isEmployee = await Employee.findById(decodedData.id).select("-password");
        

        if(!isEmployee){
           return next(new ErrorHandler("You are not authorize to visit this route",401))
        }

        req.user = isEmployee;
        next()


    } catch (error) {
        console.log(error);
        return next(error)
    }
}