import { getTopics } from '../../../src/content';

export async function GET() {
  return Response.json(await getTopics());
}
