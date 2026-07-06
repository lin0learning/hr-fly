import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const execFileAsync = promisify(execFile)

const FLYAI_KEY = process.env.FLYAI_API_KEY

const flyaiBin = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'flyai.cmd' : 'flyai',
)

/** 成都落地/起飞统一双流机场 CTU */
const CTU_CODES = new Set(['CTU'])
const CTU_KEYWORDS = ['双流']

function isShuangliu(stationCode?: string | null, stationShortName?: string | null, stationName?: string | null): boolean {
  if (stationCode && CTU_CODES.has(stationCode)) return true
  const text = `${stationShortName ?? ''}${stationName ?? ''}`
  return CTU_KEYWORDS.some((k) => text.includes(k))
}

interface RawSegment {
  depStationCode?: string
  depStationShortName?: string
  depStationName?: string
  arrStationCode?: string
  arrStationShortName?: string
  arrStationName?: string
  depCityName?: string
  arrCityName?: string
  depDateTime?: string
  arrDateTime?: string
  marketingTransportName?: string
  marketingTransportNo?: string
  seatClassName?: string
  duration?: string
  stopInfos?: unknown[] | null
}

interface RawItem {
  ticketPrice?: string
  adultPrice?: string
  totalDuration?: string
  jumpUrl?: string
  journeys?: Array<{
    journeyType?: string
    segments?: RawSegment[]
    totalDuration?: string
  }>
}

function normalizeLeg(segments: RawSegment[] | undefined) {
  const seg = segments?.[0]
  if (!seg) return null
  return {
    depDateTime: seg.depDateTime ?? '',
    arrDateTime: seg.arrDateTime ?? '',
    depAirport: seg.depStationShortName ?? seg.depStationName ?? '',
    arrAirport: seg.arrStationShortName ?? seg.arrStationName ?? '',
    depCity: seg.depCityName ?? '',
    arrCity: seg.arrCityName ?? '',
    airline: seg.marketingTransportName ?? '',
    flightNo: seg.marketingTransportNo ?? '',
    cabin: seg.seatClassName ?? '经济舱',
    durationMin: Number(seg.duration) || 0,
    direct: !seg.stopInfos?.length,
    stops: (seg.stopInfos as Array<{ cityName?: string }> | null)?.map((s) => s.cityName).filter(Boolean) as string[],
  }
}

function isRoundTripShuangliu(item: RawItem): boolean {
  const journeys = item.journeys ?? []
  if (journeys.length < 2) return false

  const outbound = journeys[0].segments ?? []
  const inbound = journeys[1].segments ?? []
  const outSeg = outbound[0]
  const inSeg = inbound[0]
  if (!outSeg || !inSeg) return false

  const outToChengdu = isShuangliu(outSeg.arrStationCode, outSeg.arrStationShortName, outSeg.arrStationName)
  const inFromChengdu = isShuangliu(inSeg.depStationCode, inSeg.depStationShortName, inSeg.depStationName)
  return outToChengdu && inFromChengdu
}

function isOneWayShuangliu(item: RawItem): boolean {
  const journeys = item.journeys ?? []
  const segs = journeys[0]?.segments ?? []
  const seg = segs[0]
  if (!seg) return false
  if (seg.depCityName === '杭州' && seg.arrCityName === '成都') {
    return isShuangliu(seg.arrStationCode, seg.arrStationShortName, seg.arrStationName)
  }
  if (seg.depCityName === '成都' && seg.arrCityName === '杭州') {
    return isShuangliu(seg.depStationCode, seg.depStationShortName, seg.depStationName)
  }
  return false
}

function normalizeItem(item: RawItem, roundTrip: boolean) {
  const journeys = item.journeys ?? []
  const outbound = normalizeLeg(journeys[0]?.segments)
  const inbound = roundTrip ? normalizeLeg(journeys[1]?.segments) : undefined
  const priceRaw = item.ticketPrice ?? item.adultPrice ?? '0'
  const priceYuan = Number(String(priceRaw).replace(/[¥,]/g, '')) || 0

  return {
    priceYuan,
    totalDurationMin: Number(item.totalDuration) || 0,
    outbound,
    inbound,
    jumpUrl: item.jumpUrl ?? '',
    journeyTypes: journeys.map((j) => j.journeyType ?? ''),
  }
}

export interface SearchFlightParams {
  depDate: string
  backDate?: string
  journeyType?: string
  sortType?: string
  depHourStart?: string
  depHourEnd?: string
}

export async function searchFlight(body: SearchFlightParams) {
  const args = [
    'search-flight',
    '--origin',
    '杭州',
    '--destination',
    '成都',
    '--dep-date',
    body.depDate,
    '--seat-class-name',
    '经济舱',
    '--sort-type',
    body.sortType ?? '3',
  ]

  if (body.backDate) {
    args.push('--back-date', body.backDate)
  }
  if (body.journeyType) {
    args.push('--journey-type', body.journeyType)
  }
  if (body.depHourStart) {
    args.push('--dep-hour-start', body.depHourStart)
  }
  if (body.depHourEnd) {
    args.push('--dep-hour-end', body.depHourEnd)
  }

  const env = { ...process.env }
  if (FLYAI_KEY) {
    env.FLYAI_API_KEY = FLYAI_KEY
  }

  const { stdout } = await execFileAsync(flyaiBin, args, {
    env,
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === 'win32',
  })

  const raw = JSON.parse(stdout.trim()) as {
    status: number
    message: string
    systemMessage?: string | null
    data?: { itemList?: RawItem[] } | null
  }

  if (raw.status !== 0) {
    return { error: raw.message, systemMessage: raw.systemMessage }
  }

  const roundTrip = Boolean(body.backDate)
  const list = raw.data?.itemList ?? []
  const filtered = list.filter((item) => (roundTrip ? isRoundTripShuangliu(item) : isOneWayShuangliu(item)))
  const items = filtered.map((item) => normalizeItem(item, roundTrip))

  return { items, systemMessage: raw.systemMessage, filteredCount: list.length - items.length }
}

export function hasFlyaiKey(): boolean {
  return Boolean(FLYAI_KEY)
}
