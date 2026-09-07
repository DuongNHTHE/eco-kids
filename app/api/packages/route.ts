import { getPackages } from '../../../src/content';

export async function GET() {
  return Response.json(await getPackages());
}