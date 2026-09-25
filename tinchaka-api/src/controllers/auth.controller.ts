import { Request, Response, NextFunction } from 'express';
import { signupSchema, loginSchema } from '../schemas/auth.schema';
import { registerUser, loginUser } from '../services/auth.service';

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = signupSchema.parse(req.body);
    const result = await registerUser(validated);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await loginUser(validated.email, validated.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
