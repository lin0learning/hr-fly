import { hasFlyaiKey } from '../../lib/flight-search.ts'

export async function GET() {
  return Response.json({ ok: true, flyaiKey: hasFlyaiKey() })
}
