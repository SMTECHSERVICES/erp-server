import jwt from 'jsonwebtoken';
import Admin from '../model/admin.js';
import { ErrorHandler } from './errorHandler.js';
import dotenv from 'dotenv';

dotenv.config();

export const superAdminMiddleware = async(req,res,next)=>{
    try {
        const authToken = req.cookies.token;
        //console.log(authToken)

        if(!authToken){
            return next(new ErrorHandler("Please login to visit this route",401))
        }

        const decodedData = jwt.verify(authToken,process.env.JWT_SECRET);

        const isAdmin = await Admin.findById(decodedData.id);

        if(!isAdmin){
           return next(new ErrorHandler("You are authorize to visit this route",401))
        }

        req.user = isAdmin;
        next()


    } catch (error) {
        console.log(error);
        return next(error)
    }
}