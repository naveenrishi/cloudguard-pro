import express from 'express';
import prisma from '../config/database';
import * as healthService from '../services/health-monitor.service';

const router = express.Router();

// Get cloud provider statuses
router.get('/status', async (req, res) => {
  try {
    const statuses = await healthService.getAllCloudStatuses();
    res.json(statuses);
  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get version updates
router.get('/version-updates', async (req, res) => {
    try {
      const updates = await healthService.checkVersionUpdates();
      res.json(updates);
    } catch (error: any) {
      console.error('Version updates error:', error);
      res.status(500).json({ 
        error: error.message,
        aws: [],
        azure: [],
        gcp: []
      });
    }
  });

export default router;
