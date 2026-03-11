// backend/src/services/activity.service.ts
// Stub service — Activity model not yet in Prisma schema.
// Returns empty feed gracefully so budget.routes.ts doesn't crash.

export async function getActivityFeed(userId: string, limit: number = 50) {
  return [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  return 0;
}

export async function markAsRead(activityIds: string[]) {
  return { marked: activityIds.length };
}