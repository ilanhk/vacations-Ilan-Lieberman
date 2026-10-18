import type { Request, Response } from "express";
import { User } from "../users/user.entity.js";
import dataSource from "../data-source.js";


export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    const user = await dataSource.getRepository(User).findOne({ where: { email } });
    if (user) {
        return res.status(400).json({ message: "User already exists" });
    }
    
    try {
        // TODO: validate credentials, return JWT
        const newUser = await dataSource.getRepository(User).create({ name, email, password });
        await dataSource.getRepository(User).save(newUser);
        return res.status(201).json({ message: "User created successfully" }); 
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password} = req.body;

    const user = await dataSource.getRepository(User).findOne({ where: { email } }); // Find the user in the DB

    if (user && (await user.matchPassword(password))) {

        const userId = user._id + '';
        const accessToken = generateAccessToken(userId);


        await user.save();

        // await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: redis_expiry }); 

        res.status(200).json({
        _id: user._id,
        name: user.firstName,
        email: user.email,
        accessToken,
        
        });
    } else {
        return res.status(401).json({ message:'Invalid Email or Password' });
    }
    
    try {
        // TODO: validate credentials, return JWT
        return res.status(501).json({ error: "Not implemented" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    try {
        
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}
