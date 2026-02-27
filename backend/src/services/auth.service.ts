import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { sendVerificationEmail } from './email.service';
import { generateRandomString } from '../utils/encryption';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const register = async (data: RegisterInput) => {
  const { name, email, password } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate verification token
  const verificationToken = generateRandomString(32);
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      verificationToken,
      verificationExpiry,
      emailVerified: true,
    },
  });

  // Send verification email
  try {
    await sendVerificationEmail(email, name, verificationToken);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't fail registration if email fails
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    },
    accessToken,
    refreshToken,
    requiresMfa: user.mfaEnabled, // Add this flag
  };
};

export const login = async (data: LoginInput) => {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes`);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    // Increment login attempts
    const loginAttempts = user.loginAttempts + 1;
    let lockedUntil = null;

    // Lock account after 5 failed attempts
    if (loginAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts, lockedUntil },
    });

    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // Save refresh token to database
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: '', // Will be set from request
      userAgent: '', // Will be set from request
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    },
    accessToken,
    refreshToken,
  };
};