import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const {
  IGNAV_API_KEY,
  PORT = 4000,
  CORS_ORIGIN = 'http://localhost:5173',
  MARKET = 'KR', // 가격 통화/지역 (KR = 원화)
} = process.env;

if (!IGNAV_API_KEY) {
  console.error('IGNAV_API_KEY가 없습니다. server/.env 파일을 확인하세요.');
  process.exit(1);
}

const IGNAV_BASE = process.env.IGNAV_BASE_URL ?? 'https://ignav.com/api';
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MIN ?? 10) * 60_000;
const DAILY_LIMIT = Number(process.env.DAILY_UPSTREAM_LIMIT ?? 100); // 무료 1,000건을 아끼기 위한 하루 상한

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ───────── 하루 호출 상한 (서버 재시작 시 초기화됨) ─────────
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
let usage = { day: kstDay(), count: 0 };

function spendCredit() {
  const today = kstDay();
  if (usage.day !== today) usage = { day: today, count: 0 };
  if (usage.count >= DAILY_LIMIT) {
    throw new HttpError(429, '오늘 조회 가능 횟수를 모두 사용했어요. 내일 다시 시도해주세요.');
  }
  usage.count += 1;
}
const refundCredit = () => {
  usage.count = Math.max(0, usage.count - 1);
};

// ───────── Ignav 호출 ─────────
async function upstream(path, body) {
  spendCredit();
  let res;
  try {
    res = await fetch(`${IGNAV_BASE}${path}`, {
      method: 'POST',
      headers: { 'X-Api-Key': IGNAV_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    refundCredit();
    throw new HttpError(504, '항공권 서버 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.');
  }

  if (!res.ok) {
    refundCredit(); // 실패 요청은 과금되지 않음(공식 문서 기준)
    const text = await res.text().catch(() => '');
    console.error(`[ignav] ${path} -> ${res.status}`, text.slice(0, 300));
    if (res.status === 404) throw new HttpError(404, '조건에 맞는 결과를 찾지 못했어요.');
    if (res.status === 429) throw new HttpError(429, '요청이 많아요. 잠시 후 다시 시도해주세요.');
    if (res.status === 401 || res.status === 403) {
      throw new HttpError(502, '서버의 항공권 API 키 설정을 확인해주세요.');
    }
    if (res.status === 400 || res.status === 422) throw new HttpError(400, '검색 조건을 확인해주세요.');
    throw new HttpError(502, '항공권 정보를 가져오지 못했어요.');
  }
  return res.json();
}

// ───────── 캐시 (같은 조건 재조회 시 크레딧 절약) + 동시 중복 요청 합치기 ─────────
const cache = new Map();
const inflight = new Map();

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  while (cache.size > 500) cache.delete(cache.keys().next().value);
}

async function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { data: hit.data, cached: true };
  if (inflight.has(key)) return { data: await inflight.get(key), cached: true };

  const p = loader()
    .then((data) => {
      cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      prune();
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return { data: await p, cached: false };
}

// ───────── IP별 호출 빈도 제한 ─────────
function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.' });
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}

// ───────── 입력 검증 ─────────
const IATA = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CABINS = new Set(['economy', 'premium_economy', 'business', 'first']);

function validateSearch(b = {}) {
  const origin = String(b.origin ?? '').toUpperCase();
  const destination = String(b.destination ?? '').toUpperCase();
  if (!IATA.test(origin) || !IATA.test(destination)) return { error: '공항 코드가 올바르지 않아요.' };
  if (origin === destination) return { error: '출발지와 도착지가 같을 수 없어요.' };

  const date = String(b.departure_date ?? '');
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) return { error: '출발일 형식이 올바르지 않아요.' };
  if (date < kstDay()) return { error: '지난 날짜는 조회할 수 없어요.' };

  const adults = Number.parseInt(b.adults ?? 1, 10);
  if (!(adults >= 1 && adults <= 9)) return { error: '인원은 1~9명까지 가능해요.' };

  const cabin_class = b.cabin_class ?? 'economy';
  if (!CABINS.has(cabin_class)) return { error: '좌석 등급이 올바르지 않아요.' };

  return { value: { origin, destination, departure_date: date, adults, cabin_class, market: MARKET } };
}

// 예약 링크는 http(s)만 허용 (javascript: 같은 스킴 차단). 스킴 없이 오면 https 보정
function safeUrl(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// ───────── 라우트 ─────────
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: CORS_ORIGIN.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '10kb' }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const limiter = rateLimit(20, 60_000);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, upstreamCallsToday: usage.count, dailyLimit: DAILY_LIMIT });
});

app.post(
  '/api/flights/search',
  limiter,
  wrap(async (req, res) => {
    const { value, error } = validateSearch(req.body);
    if (error) throw new HttpError(400, error);

    const key = `search:${JSON.stringify(value)}`;
    try {
      const { data, cached: hit } = await cached(key, () => upstream('/fares/one-way', value));
      res.json({ ...data, cached: hit });
    } catch (e) {
      // 결과 없음은 에러가 아니라 빈 목록으로 응답
      if (e instanceof HttpError && e.status === 404) return res.json({ itineraries: [], cached: false });
      throw e;
    }
  }),
);

app.post(
  '/api/flights/booking-links',
  limiter,
  wrap(async (req, res) => {
    const id = String(req.body?.ignav_id ?? '');
    if (!/^[a-f0-9]{32}$/i.test(id)) throw new HttpError(400, '잘못된 항공편 ID예요.');

    const { data } = await cached(`book:${id}`, () => upstream('/fares/booking-links', { ignav_id: id }));
    const options = (data.booking_options ?? [])
      .flatMap((o) =>
        (o.links ?? []).map((l) => ({
          legs: o.legs ?? [],
          provider_name: l.provider_name ?? '판매처',
          provider_type: l.provider_type ?? null, // 'airline' | 'third_party'
          fare_name: l.fare_name ?? null,
          specificity: l.specificity ?? null, // 'exact_flight' | 'search_results'
          price: l.price ?? null,
          url: safeUrl(l.url),
        })),
      )
      .filter((l) => l.url);

    res.json({ options });
  }),
);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했어요.' });
});

app.listen(PORT, () => console.log(`✈️  flight proxy listening on http://localhost:${PORT}`));
