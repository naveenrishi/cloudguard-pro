import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      emailVerified: true,
    },
  });

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
    requiresMfa: user.mfaEnabled,
  };
};

export const login = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${minutesLeft} minutes`);
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    const loginAttempts = user.loginAttempts + 1;
    let lockedUntil = null;
    if (loginAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts, lockedUntil },
    });
    throw new Error('Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null },
  });

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

  try {
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: '',
        userAgent: '',
      },
    });
  } catch (e) {
    console.error('Session save failed (non-fatal):', e);
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
    requiresMfa: user.mfaEnabled,
  };
};