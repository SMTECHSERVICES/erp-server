import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

const generateToken = (userId, role) => {
  const token = jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: '7d', // 7 days expiry
  });
  return token;
};

export default generateToken;

    