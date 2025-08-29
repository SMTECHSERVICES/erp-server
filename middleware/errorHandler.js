export class ErrorHandler extends Error{
    constructor(message,statusCode){
        super(message);
        this.statusCode=statusCode
    }
}

export const ErrorHandlerMiddleware = (err,req,res,next)=>{
    let errMessage=err.message || "Internal server error";
    let statusCode  = err.statusCode || 500;
    return res.status(statusCode).json({
        success:false,
        message:errMessage
    })
}