import { usingMongo } from '../../../src/store';

export function GET() {
  return Response.json({ ok: true, database: usingMongo() ? 'mongodb' : 'demo-memory' });
}
