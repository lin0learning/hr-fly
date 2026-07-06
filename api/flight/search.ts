import { searchFlight } from '../../lib/flight-search.ts'

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Parameters<typeof searchFlight>[0]
    const result = await searchFlight(body)
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
