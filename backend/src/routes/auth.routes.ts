import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import * as authService from '../services/auth.service';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encrypt, decrypt } from '../utils/encryption';

const router = express.Router();

// Register endpoint
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain special character'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await authService.register(req.body);

      res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        user,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Login endpoint
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await authService.login(req.body);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }
);

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Email verification endpoint
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Setup MFA
router.post('/setup-mfa/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('MFA Setup request for userId:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `CloudGuard Pro (${user.email})`,
      issuer: 'CloudGuard Pro',
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    console.log('MFA setup successful for:', user.email);

    res.json({
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
    });
  } catch (error: any) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify MFA Setup
router.post('/verify-mfa-setup/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { token } = req.body;

    console.log('MFA verification for userId:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      return res.status(404).json({ error: 'User not found or MFA not set up' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10))
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,  // ← Changed from backupCodes
      },
    });

    console.log('MFA enabled successfully for:', user.email);

    res.json({ backupCodes });
  } catch (error: any) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// MFA Login - Verify TOTP
router.post('/verify-mfa', async (req, res) => {
  try {
    const { email, token } = req.body;

    console.log('MFA Login attempt:', { email, tokenLength: token?.length });

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ error: 'User not found' });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      console.log('MFA not enabled for user:', email);
      return res.status(400).json({ error: 'MFA not enabled' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    console.log('Verification result:', verified);

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Save session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || '',
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('MFA login successful for:', email);

    res.json({
      message: 'MFA login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      accessToken,
    });
  } catch (error: any) {
    console.error('MFA login error:', error);
    res.status(500).json({ error: 'MFA login failed' });
  }
});

export default router;
