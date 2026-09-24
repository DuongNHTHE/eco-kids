import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { connectMongo, Notification } from '../../../../../src/models';

const allowedRoles = new Set(['ADMIN', 'TEACHER', 'SCHOOL_ADMIN']);

function serializeNotification(notification: any) {
  const data = notification.data || {};
  return {
    id: String(notification._id || notification.id),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    resourceId: notification.resourceId,
    organization: data.organization || '',
    contactName: data.contactName || '',
    phone: data.phone || '',
    email: data.email || '',
    studentCount: data.studentCount || null,
    note: data.note || '',
    status: notification.status || 'new',
    isRead: Boolean(notification.isRead),
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || !user.role || !allowedRoles.has(user.role)) {
    return Response.json({ message: 'Bạn không có quyền xem thông báo.' }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastId = '';
  let initialized = false;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const poll = async () => {
        if (closed) return;
        try {
          await connectMongo();
          const notification: any = await Notification.findOne().sort({ createdAt: -1 }).lean();
          const id = notification ? String(notification._id || notification.id) : '';
          if (!initialized) {
            lastId = id;
            initialized = true;
            send('heartbeat', { at: new Date().toISOString() });
          } else if (notification && id !== lastId) {
            lastId = id;
            send('notification', serializeNotification(notification));
          } else {
            send('heartbeat', { at: new Date().toISOString() });
          }
        } catch (error) {
          console.error('notification stream error', error);
        }
      };

      send('ready', { connectedAt: new Date().toISOString() });
      await poll();
      timer = setInterval(poll, 2000);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  });
}