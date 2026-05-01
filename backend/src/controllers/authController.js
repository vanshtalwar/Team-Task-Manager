import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

const authSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6)
});

const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).optional()
});

function signToken(userId, role) {
  return jwt.sign({ sub: userId.toString(), role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

const register = asyncHandler(async (req, res) => {
  const payload = authSchema.parse(req.body);
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new AppError('Email is already in use', 409);
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword
  });

  const token = signToken(user._id, user.role);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const user = await User.findOne({ email: payload.email }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken(user._id, user.role);

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

const createAdminUser = asyncHandler(async (req, res) => {
  const payload = adminUserSchema.parse(req.body);
  const existingUser = await User.findOne({ email: payload.email }).select('+password');

  if (existingUser) {
    existingUser.name = payload.name;
    existingUser.role = 'admin';

    if (payload.password) {
      existingUser.password = await bcrypt.hash(payload.password, 12);
    }

    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: 'User promoted to admin successfully',
      user: {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role
      }
    });
  }

  if (!payload.password) {
    throw new AppError('Password is required to create a new admin user', 400);
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: hashedPassword,
    role: 'admin'
  });

  return res.status(201).json({
    success: true,
    message: 'Admin user created successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

export { register, login, createAdminUser };
