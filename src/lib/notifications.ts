import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

export async function notifyUser(opts: {
  userId: string;
  title: string;
  body: string;
  category?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    return await prisma.user_notifications.create({
      data: {
        user_id: opts.userId,
        title: opts.title,
        body: opts.body,
        category: opts.category || 'general',
        metadata:
          opts.metadata == null
            ? undefined
            : (opts.metadata as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

export async function notifyLecturerSessionOpened(opts: {
  lecturerId: string;
  className: string;
  sessionId: string;
  roomName?: string | null;
}) {
  const room = opts.roomName ? ` in ${opts.roomName}` : '';
  return notifyUser({
    userId: opts.lecturerId,
    title: `${opts.className} has started`,
    body: `Your scheduled class is now active${room}. Location verification is required to access attendance controls.`,
    category: 'session_started',
    metadata: { sessionId: opts.sessionId },
  });
}
