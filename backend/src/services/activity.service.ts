import prisma from '../config/database';

// Create activity log
export const logActivity = async (data: {
  userId: string;
  cloudAccountId?: string;
  provider: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  description: string;
  severity?: string;
  metadata?: any;
}) => {
  return await prisma.activityLog.create({
    data: {
      ...data,
      severity: data.severity || 'info',
    },
  });
};

// Get activity feed
export const getActivityFeed = async (userId: string, limit: number = 50) => {
  return await prisma.activityLog.findMany({
    where: { userId },
    include: {
      cloudAccount: {
        select: {
          accountName: true,
          provider: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
};

// Mark activities as read
export const markAsRead = async (activityIds: string[]) => {
  return await prisma.activityLog.updateMany({
    where: { id: { in: activityIds } },
    data: { isRead: true },
  });
};

// Get unread count
export const getUnreadCount = async (userId: string) => {
  return await prisma.activityLog.count({
    where: { userId, isRead: false },
  });
};
