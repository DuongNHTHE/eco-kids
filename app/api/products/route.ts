import { products } from '../../../src/data';

export function GET() {
  return Response.json(products);
}
