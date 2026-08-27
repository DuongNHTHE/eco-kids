import { topics } from '../../../src/data';

export function GET() {
  return Response.json(topics);
}
