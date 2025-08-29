import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
console.log(JWT_SECRET)

 const generateToken = (userId,role)=>{
        const token = jwt.sign({ id: userId,role:role }, JWT_SECRET, {
      expiresIn: '7d', // 7 days expiry
    });
    return token;
    }


    export default generateToken;

    