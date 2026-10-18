import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../users/user.entity.js";
import verifyAccessToken from "./utils/verify-access-token.js";

export type AuthUser = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

//Protect routes for registered users
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const accessTokenName = process.env.ACCESS_TOKEN_NAME!;
  const accessToken = req.cookies[accessTokenName];
  const jwtSecretAccess = process.env.JWT_SECRET_ACCESS!;

  // console.log('Access token from cookie:', accessToken); 

  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  verifyAccessToken(req, res, next, accessToken, jwtSecretAccess);
  console.log('access token:', accessToken);
};

const requester = (req: Request, res: Response, next: NextFunction) => {
  if(req.user && req.user.role === "Requester") {
     return next();
  } else {
      return res.status(401).json({ message: 'Not authorized as requester'});
  };
};

const validator = (req: Request, res: Response, next: NextFunction) => {
  if(req.user && req.user.role === "Validator") {
      return next();
  } else {
      return res.status(401).json({ message: 'Not authorized as validator'});
  };
};
