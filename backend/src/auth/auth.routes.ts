import { Router } from "express";
import { register, login, logout } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/logout", logout);
