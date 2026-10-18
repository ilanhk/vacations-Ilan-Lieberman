import { Request, Response, NextFunction  } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '../../users/user.entity.js';

declare module 'express' {
    interface Request {
      user?: User
    }
};

const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
  token: string | undefined,
  secret: string
) => {
  if (token) {
    try {
      const decoded_token = jwt.verify(token, secret) as JwtPayload;
      console.log('Decoded token:', decoded_token);

      const user = await User.findById(decoded_token.userId).select('-password');
      if (!user) {
        console.error('User not found in database');
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user; // Attach the user object to the request
      next(); // Proceed to the next middleware
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } else {
    console.error('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }
};

export default verifyAccessToken;
