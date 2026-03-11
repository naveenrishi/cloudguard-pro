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
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
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

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  try {
    await prisma.session.create({
      data: {
        userId:       user.id,
        token:        accessToken,
        refreshToken,
        expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress:    '',
        userAgent:    '',
      },
    });
  } catch (e) {
    // Session table might not exist — non-fatal
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