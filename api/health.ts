import { hasFlyaiKey } from '@hzcd/bff/flight'

export async function GET() {
  return Response.json({ ok: true, flyaiKey: hasFlyaiKey() })
}
