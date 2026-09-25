import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';
import { hashPassword, verifyPassword } from './password.service';
import { signAccessToken } from './jwt.service';
import { SignupInput } from '../schemas/auth.schema';
import { AppError } from '../types/AppError';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
}

export interface AuthResult {
  user: UserResponse;
  token: string;
}

export async function registerUser(input: SignupInput): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError(409, 'Email already registered', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password_hash: passwordHash,
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  const token = signAccessToken({
    userId: created.id,
    role: created.role,
  });

  return {
    user: created,
    token,
  };
}

export async function loginUser(email: string, plainPassword: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Returning identical 401 error for nonexistent email and invalid password prevents user enumeration attacks
  if (!user) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await verifyPassword(plainPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { password_hash: _hash, ...safeUser } = user;

  return {
    user: safeUser,
    token,
  };
}
