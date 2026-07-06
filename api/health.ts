import { hasFlyaiKey } from '../lib/flight-search.js'

export async function GET() {
  return Response.json({ ok: true, flyaiKey: hasFlyaiKey() })
}
