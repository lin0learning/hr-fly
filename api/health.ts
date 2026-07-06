import { hasFlyaiKey } from '../lib/flight-search'

export async function GET() {
  return Response.json({ ok: true, flyaiKey: hasFlyaiKey() })
}
