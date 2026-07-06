export interface FlightLeg {
  depDateTime: string
  arrDateTime: string
  depAirport: string
  arrAirport: string
  depCity: string
  arrCity: string
  airline: string
  flightNo: string
  cabin: string
  durationMin: number
  direct: boolean
  stops: string[]
}

export interface FlightOffer {
  priceYuan: number
  totalDurationMin: number
  outbound: FlightLeg | null
  inbound?: FlightLeg | null
  jumpUrl: string
  journeyTypes: string[]
}

export interface SearchResponse {
  items?: FlightOffer[]
  systemMessage?: string | null
  filteredCount?: number
  error?: string
}

export async function searchFlights(params: {
  depDate: string
  backDate?: string
  journeyType?: string
  sortType?: string
  depHourStart?: string
  depHourEnd?: string
}): Promise<SearchResponse> {
  const res = await fetch('/api/flight/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return res.json() as Promise<SearchResponse>
}

export function formatTime(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatDate(iso: string) {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
