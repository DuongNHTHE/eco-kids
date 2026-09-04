import { usingMongo } from '../../../src/store';
import { connectMongo } from '../../../src/models';

export async function GET() {
  try {
    await connectMongo();
    return Response.json({ ok: true, database: usingMongo() ? 'mongodb' : 'unconfigured' });
  } catch {
    return Response.json({ ok: false, database: 'mongodb', message: 'Database unavailable' }, { status: 503 });
  }
}
