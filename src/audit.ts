import { AuditLog, connectMongo } from './models';

export type AuditActor = {
  userId?: string;
  email?: string | null;
  role?: string | null;
};

export type AuditEntry = {
  action: string;
  resource: string;
  resourceId?: string | null;
  actor?: AuditActor | null;
  metadata?: Record<string, unknown>;
  request?: Request;
  success?: boolean;
};

function getClientIp(request?: Request) {
  if (!request) return undefined;
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined;
}

export async function writeAuditLog(entry: AuditEntry) {
  try {
    await connectMongo();
    await AuditLog.create({
      user_id: entry.actor?.userId || undefined,
      actorEmail: entry.actor?.email || undefined,
      actorRole: entry.actor?.role || undefined,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || undefined,
      metadata: entry.metadata,
      ipAddress: getClientIp(entry.request),
      userAgent: entry.request?.headers.get('user-agent') || undefined,
      success: entry.success ?? true,
    });
  } catch (error) {
    console.error('audit log error', error);
  }
}
