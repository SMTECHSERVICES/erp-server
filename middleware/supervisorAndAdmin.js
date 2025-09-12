import jwt from 'jsonwebtoken';
import Employee from '../model/employee.js';
import { ErrorHandler } from './errorHandler.js';
import dotenv from 'dotenv';
import Admin from '../model/admin.js';

dotenv.config();

export const supervisorAndAdminMiddleware = async(req,res,next)=>{
    try {
        const authToken = req.cookies.token;
       // console.log(authToken)

        if(!authToken){
            return next(new ErrorHandler("Please login to visit this route",401))
        }

        const decodedData = jwt.verify(authToken,process.env.JWT_SECRET);
        

        //console.log(decodedData.role)

        if(decodedData.role === 'SUPERVISOR'){
            const isEmployee = await Employee.findById(decodedData.id);
           // console.log(isEmployee)
             if(!isEmployee){
           return next(new ErrorHandler("You are not authorize to visit this route",401))
        }
        req.user = isEmployee;
       return next()
        } else if(decodedData.role==="admin"){
            const isAdmin = await Admin.findById(decodedData.id);
            console.log(isAdmin)
            if(!isAdmin){
                 return next(new ErrorHandler("You are authorize to visit this route",401))
            }

            req.user = isAdmin;
           return next();
        }else{
            return next(new ErrorHandler('You are not authorize to access this route',401))
        }

    } catch (error) {
        console.log(error);
        return next(error)
    }
}