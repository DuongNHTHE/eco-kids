import { getProducts } from '../../../src/content';

export async function GET() {
  return Response.json(await getProducts());
}
