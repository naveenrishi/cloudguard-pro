import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

const router = express.Router();

// Get user settings
router.get('/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return default settings (can be extended with UserSettings model)
    res.json({
      user,
      notifications: {
        emailAlerts: true,
        costThresholdAlerts: true,
        weeklyReports: true,
        securityAlerts: true,
        budgetAlerts: true,
        recommendationAlerts: false,
      },
      preferences: {
        currency: 'USD',
        timezone: 'UTC',
        costThreshold: 1000,
        language: 'en',
      },
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, company, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        // Add company and phone to User model if needed
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        mfaEnabled: true,
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user settings
router.put('/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { notifications, preferences } = req.body;

    // In a real app, save to UserSettings model
    // For now, just acknowledge the update
    console.log('Updating settings for user:', userId);
    console.log('Notifications:', notifications);
    console.log('Preferences:', preferences);

    res.json({ 
      message: 'Settings updated successfully',
      notifications,
      preferences,
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
