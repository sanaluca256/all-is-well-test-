import React, { useEffect, useMemo, useRef, useState } from 'react';

// 공항 목록 (Ignav는 3글자 IATA 코드를 사용합니다)
const AIRPORTS = [
  // 🇰🇷 국내
  { name: '인천 (ICN)', id: 'ICN', type: '대한민국' },
  { name: '김포 (GMP)', id: 'GMP', type: '대한민국' },
  { name: '김해/부산 (PUS)', id: 'PUS', type: '대한민국' },
  { name: '제주 (CJU)', id: 'CJU', type: '대한민국' },
  { name: '대구 (TAE)', id: 'TAE', type: '대한민국' },
  { name: '청주 (CJJ)', id: 'CJJ', type: '대한민국' },
  { name: '무안 (MWX)', id: 'MWX', type: '대한민국' },
  { name: '광주 (KWJ)', id: 'KWJ', type: '대한민국' },
  { name: '여수 (RSU)', id: 'RSU', type: '대한민국' },
  { name: '울산 (USN)', id: 'USN', type: '대한민국' },
  { name: '양양 (YNY)', id: 'YNY', type: '대한민국' },
  { name: '포항경주 (KPO)', id: 'KPO', type: '대한민국' },
  { name: '사천 (HIN)', id: 'HIN', type: '대한민국' },
  { name: '군산 (KUV)', id: 'KUV', type: '대한민국' },
  { name: '원주 (WJU)', id: 'WJU', type: '대한민국' },
  // 🇯🇵 일본
  { name: '도쿄/하네다 (HND)', id: 'HND', type: '일본' },
  { name: '도쿄/나리타 (NRT)', id: 'NRT', type: '일본' },
  { name: '오사카/간사이 (KIX)', id: 'KIX', type: '일본' },
  { name: '후쿠오카 (FUK)', id: 'FUK', type: '일본' },
  { name: '삿포로 (CTS)', id: 'CTS', type: '일본' },
  { name: '오키나와 (OKA)', id: 'OKA', type: '일본' },
  { name: '나고야 (NGO)', id: 'NGO', type: '일본' },
  // 동아시아
  { name: '타이베이/타오위안 (TPE)', id: 'TPE', type: '동아시아' },
  { name: '가오슝 (KHH)', id: 'KHH', type: '동아시아' },
  { name: '홍콩 (HKG)', id: 'HKG', type: '동아시아' },
  { name: '마카오 (MFM)', id: 'MFM', type: '동아시아' },
  { name: '베이징 (PEK)', id: 'PEK', type: '동아시아' },
  { name: '상하이 (PVG)', id: 'PVG', type: '동아시아' },
  // 동남아
  { name: '방콕 (BKK)', id: 'BKK', type: '동남아' },
  { name: '다낭 (DAD)', id: 'DAD', type: '동남아' },
  { name: '하노이 (HAN)', id: 'HAN', type: '동남아' },
  { name: '호치민 (SGN)', id: 'SGN', type: '동남아' },
  { name: '나트랑 (CXR)', id: 'CXR', type: '동남아' },
  { name: '세부 (CEB)', id: 'CEB', type: '동남아' },
  { name: '싱가포르 (SIN)', id: 'SIN', type: '동남아' },
  { name: '발리 (DPS)', id: 'DPS', type: '동남아' },
  // 미주/대양주/유럽
  { name: '괌 (GUM)', id: 'GUM', type: '미주/대양주' },
  { name: '사이판 (SPN)', id: 'SPN', type: '미주/대양주' },
  { name: '호놀룰루 (HNL)', id: 'HNL', type: '미주/대양주' },
  { name: '로스앤젤레스 (LAX)', id: 'LAX', type: '미주/대양주' },
  { name: '뉴욕 (JFK)', id: 'JFK', type: '미주/대양주' },
  { name: '시드니 (SYD)', id: 'SYD', type: '미주/대양주' },
  { name: '파리 (CDG)', id: 'CDG', type: '유럽/중동' },
  { name: '런던 (LHR)', id: 'LHR', type: '유럽/중동' },
  { name: '프랑크푸르트 (FRA)', id: 'FRA', type: '유럽/중동' },
];

const CABINS = [
  { id: 'economy', label: '일반석' },
  { id: 'premium_economy', label: '프리미엄 일반석' },
  { id: 'business', label: '비즈니스석' },
  { id: 'first', label: '일등석' },
];

// ───────── 유틸 ─────────
// toISOString()은 UTC 기준이라 한국 오전엔 어제 날짜가 나오므로 로컬 날짜로 직접 만듭니다.
function dateFromToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatPrice(amount, currency) {
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

function formatDuration(min) {
  if (min == null) return '-';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

// Ignav 응답(itinerary) → 화면용 객체
function normalizeItinerary(it) {
  const segs = it.outbound?.segments ?? [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const depLocal = first?.departure_time_local ?? '';
  const arrLocal = last?.arrival_time_local ?? '';
  const dayDiff =
    depLocal && arrLocal
      ? Math.round((Date.parse(arrLocal.slice(0, 10)) - Date.parse(depLocal.slice(0, 10))) / 86400000)
      : 0;

  return {
    id: it.ignav_id,
    route: `${first?.departure_airport ?? '?'} → ${last?.arrival_airport ?? '?'}`,
    date: depLocal.slice(0, 10),
    airline: it.outbound?.carrier ?? first?.operating_carrier_name ?? first?.marketing_carrier_code ?? '항공사 정보 없음',
    flightNums: segs
      .map((s) => `${s.marketing_carrier_code ?? ''}${s.flight_number ?? ''}`)
      .filter(Boolean)
      .join(', '),
    depLocal,
    depTime: depLocal.slice(11, 16),
    arrTime: arrLocal.slice(11, 16),
    dayDiff,
    durationMin: it.outbound?.duration_minutes ?? null,
    stops: Math.max(0, segs.length - 1),
    via: segs.slice(1).map((s) => s.departure_airport),
    price: it.price?.amount ?? 0,
    currency: it.price?.currency ?? 'KRW',
    selfTransfer: Boolean(it.requires_self_transfer),
    bags: it.bags ?? null,
  };
}

async function postJson(url, body, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청에 실패했어요. (${res.status})`);
  return data;
}

// ───────── 스타일 ─────────
const fieldStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '10px',
  border: '2px solid #cbd5e1',
  fontWeight: 'bold',
  fontSize: '16px',
  boxSizing: 'border-box',
  background: '#fff',
};
const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '6px' };
const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  marginBottom: '12px',
  boxSizing: 'border-box',
};


// ───────── 가상 항공편 (예약 연습용) ─────────
// 실제 항공사와 혼동되지 않도록 가상의 이름을 사용하고, 화면에도 "가상"으로 표시합니다.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 같은 입력이면 항상 같은 난수열 → 같은 검색은 같은 가상 항공편/좌석 상태가 나옵니다.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// tier: 항공사 등급별 가격 배수 (저가 → 프리미엄)
const VIRTUAL_AIRLINES = [
  { name: '연습항공 (가상)', code: 'PR', tier: 0.7 },
  { name: '데모에어 (가상)', code: 'DM', tier: 0.78 },
  { name: '샘플스카이 (가상)', code: 'SS', tier: 0.9 },
  { name: '올웰항공 (가상)', code: 'AW', tier: 1.0 },
  { name: '테스트제트 (가상)', code: 'TJ', tier: 1.15 },
  { name: '베타에어 (가상)', code: 'BT', tier: 1.35 },
  { name: '프리미엄웨이 (가상)', code: 'PW', tier: 1.65 },
  { name: '로열데모 (가상)', code: 'RD', tier: 2.0 },
];
const CABIN_PRICE_MULTIPLIER = { economy: 1, premium_economy: 1.6, business: 2.8, first: 4.5 };
const VIRTUAL_DEP_HOURS = [6, 8, 10, 12, 14, 17, 19, 21];

// 시간대별 배수: 새벽·심야는 저렴, 출퇴근 시간대는 비쌈
function timeOfDayFactor(hour) {
  if (hour < 7 || hour >= 21) return 0.88;
  if (hour >= 17 && hour < 20) return 1.12;
  if (hour >= 7 && hour < 10) return 1.08;
  return 1;
}

// 출발일이 가깝거나 주말(금·토·일)이면 비쌈
function dateFactor(dateStr) {
  const dep = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((dep - today) / 86400000);
  let f = 1;
  if (daysLeft < 3) f *= 1.45;
  else if (daysLeft < 7) f *= 1.3;
  else if (daysLeft < 14) f *= 1.15;
  else if (daysLeft > 60) f *= 0.92;
  if ([0, 5, 6].includes(dep.getDay())) f *= 1.1;
  return f;
}

function makeVirtualFlights({ dep, arr, date, cabin }) {
  const rand = mulberry32(hashString(`${dep}-${arr}-${date}`));
  const baseDuration = 60 + Math.floor(rand() * 240); // 1~5시간
  // 비행시간이 길수록 기본 운임이 높아짐
  const basePrice = 50000 + baseDuration * 600 + Math.floor(rand() * 10) * 5000;
  const cabinMul = CABIN_PRICE_MULTIPLIER[cabin] ?? 1;
  const dateMul = dateFactor(date);
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  return VIRTUAL_AIRLINES.map((airline, i) => {
    const hour = VIRTUAL_DEP_HOURS[i];
    const depMinutes = hour * 60 + Math.floor(rand() * 4) * 15;
    const duration = baseDuration + Math.floor(rand() * 5) * 5;
    const arrMinutes = depMinutes + duration;
    const jitter = 0.85 + rand() * 0.3; // ±15% 무작위 변동
    const raw = basePrice * airline.tier * timeOfDayFactor(hour) * dateMul * cabinMul * jitter;
    const price = Math.max(30000, Math.round(raw / 1000) * 1000);

    return {
      id: `virtual-${dep}-${arr}-${date}-${cabin}-${i}`,
      virtual: true,
      route: `${dep} → ${arr}`,
      date,
      airline: airline.name,
      flightNums: `${airline.code}${100 + Math.floor(rand() * 800)}`,
      depLocal: `${date}T${hhmm(depMinutes)}:00`,
      depTime: hhmm(depMinutes),
      arrTime: hhmm(arrMinutes),
      dayDiff: Math.floor(arrMinutes / 1440),
      durationMin: duration,
      stops: 0,
      via: [],
      price,
      currency: 'KRW',
      selfTransfer: false,
    };
  });
}

function sortFlights(list, sortOption) {
  const out = [...list];
  if (sortOption === 'price') out.sort((a, b) => a.price - b.price);
  else if (sortOption === 'time') out.sort((a, b) => a.depLocal.localeCompare(b.depLocal));
  else out.sort((a, b) => (a.durationMin ?? Infinity) - (b.durationMin ?? Infinity));
  return out;
}

// ───────── 좌석 배치 ─────────
const SEAT_LAYOUTS = {
  economy: { rows: 25, cols: ['A', 'B', 'C', null, 'D', 'E', 'F'] },
  premium_economy: { rows: 12, cols: ['A', 'B', 'C', null, 'D', 'E', 'F'] },
  business: { rows: 8, cols: ['A', 'C', null, 'D', 'F'] },
  first: { rows: 4, cols: ['A', null, 'F'] },
};

function seatExtra(cabin, row) {
  if (cabin !== 'economy') return { fee: 0, tag: '' };
  if (row <= 3) return { fee: 15000, tag: '앞좌석' };
  if (row === 11 || row === 12) return { fee: 10000, tag: '비상구석(다리 공간 넓음)' };
  return { fee: 0, tag: '' };
}

function occupiedSeats(flightId, cabin) {
  const layout = SEAT_LAYOUTS[cabin] ?? SEAT_LAYOUTS.economy;
  const rand = mulberry32(hashString(`${flightId}-seats`));
  const set = new Set();
  for (let r = 1; r <= layout.rows; r++) {
    for (const c of layout.cols) {
      if (c && rand() < 0.35) set.add(`${r}${c}`);
    }
  }
  return set;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genBookingCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

function SeatSelectModal({ flight, cabin, passengers, takenSeats, onBooked, onViewBookings, onRealLinks, onClose }) {
  const layout = SEAT_LAYOUTS[cabin] ?? SEAT_LAYOUTS.economy;
  // 이미 선택 불가인 좌석 + 내가 이 항공편에 예약해 둔 좌석
  const occupied = useMemo(() => new Set([...occupiedSeats(flight.id, cabin), ...takenSeats]), [flight.id, cabin, takenSeats]);
  const [selected, setSelected] = useState([]);
  const [done, setDone] = useState(null); // { code }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (id) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      // 인원수를 넘기면 가장 먼저 고른 좌석을 해제하고 새 좌석을 선택
      return prev.length < passengers ? [...prev, id] : [...prev.slice(1), id];
    });

  const rowOf = (id) => parseInt(id, 10);
  const feeTotal = selected.reduce((sum, id) => sum + seatExtra(cabin, rowOf(id)).fee, 0);
  // 가상 항공편 가격은 1인 기준, API 항공편 가격은 화면에 보이는 값(조회 인원 기준)을 그대로 사용
  const fare = flight.virtual ? flight.price * passengers : flight.price;
  const total = fare + feeTotal;
  const ready = selected.length === passengers;
  const sortedSeats = [...selected].sort((a, b) => rowOf(a) - rowOf(b) || a.localeCompare(b));

  const confirmBooking = () => {
    const code = genBookingCode();
    onBooked({
      code,
      status: 'confirmed',
      bookedAt: nowIso(),
      kind: flight.virtual ? 'virtual' : 'real',
      flightId: flight.id,
      airline: flight.airline,
      flightNums: flight.flightNums,
      route: flight.route,
      date: flight.date,
      depTime: flight.depTime,
      arrTime: flight.arrTime,
      dayDiff: flight.dayDiff,
      durationMin: flight.durationMin,
      cabin,
      passengers,
      seats: sortedSeats,
      fare,
      seatFee: feeTotal,
      total,
      currency: flight.currency,
    });
    setDone({ code });
  };

  const seatBtn = (row, col) => {
    const id = `${row}${col}`;
    const isOcc = occupied.has(id);
    const isSel = selected.includes(id);
    const { fee, tag } = seatExtra(cabin, row);
    const bg = isSel ? '#0284c7' : isOcc ? '#cbd5e1' : fee > 0 ? '#fef3c7' : '#e0f2fe';
    const border = isSel ? '#0369a1' : isOcc ? '#cbd5e1' : fee > 0 ? '#f59e0b' : '#7dd3fc';
    return (
      <button
        key={id}
        type="button"
        disabled={isOcc}
        aria-pressed={isSel}
        aria-label={`${id}번 좌석${isOcc ? ', 이미 선택됨' : ''}${tag ? `, ${tag}` : ''}${fee ? `, 추가 ${fee.toLocaleString()}원` : ''}`}
        onClick={() => toggle(id)}
        style={{ width: '34px', height: '34px', borderRadius: '8px 8px 4px 4px', border: `2px solid ${border}`, background: bg, color: isSel ? '#fff' : '#0f172a', fontSize: '11px', fontWeight: 'bold', cursor: isOcc ? 'not-allowed' : 'pointer', padding: 0 }}
      >
        {isOcc ? '×' : col}
      </button>
    );
  };

  const legend = (bg, border, text) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: bg, border: `2px solid ${border}`, display: 'inline-block' }} />
      {text}
    </span>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="seat-title" style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ position: 'absolute', top: '14px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          <h2 id="seat-title" style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>{done ? '예약이 완료됐어요 (데모)' : '좌석 선택'}</h2>
          <div style={{ color: '#475569', fontSize: '14px', marginTop: '4px' }}>
            {flight.airline} {flight.flightNums} · {flight.route} · {flight.date} {flight.depTime}
          </div>
        </div>

        {!done ? (
          <>
            <div style={{ padding: '10px 24px 0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {legend('#e0f2fe', '#7dd3fc', '선택 가능')}
              {legend('#0284c7', '#0369a1', '내 좌석')}
              {legend('#cbd5e1', '#cbd5e1', '선택 불가')}
              {cabin === 'economy' && legend('#fef3c7', '#f59e0b', '추가 요금')}
            </div>
            {!flight.virtual && (
              <div style={{ margin: '10px 24px 0', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#5b21b6', borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>
                ℹ 연습용 예약이에요. 좌석 배치는 예시이고, 실제 항공사의 좌석 현황·발권·결제와는 무관해요.
              </div>
            )}
            <div style={{ padding: '6px 24px 0', fontSize: '13px', color: '#64748b' }}>
              {passengers}명 좌석을 골라주세요. ({selected.length}/{passengers})
            </div>

            <div style={{ overflowY: 'auto', padding: '12px 24px', flex: 1 }}>
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>✈ 비행기 앞쪽</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ width: '24px' }} />
                {layout.cols.map((c, i) =>
                  c === null ? <div key={`h${i}`} style={{ width: '22px' }} /> : <div key={c} style={{ width: '34px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{c}</div>,
                )}
              </div>
              {Array.from({ length: layout.rows }, (_, i) => i + 1).map((row) => (
                <div key={row} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ width: '24px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>{row}</div>
                  {layout.cols.map((c, i) => (c === null ? <div key={`g${row}-${i}`} style={{ width: '22px' }} /> : seatBtn(row, c)))}
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569' }}>
                <span>선택 좌석</span>
                <strong style={{ color: '#0f172a' }}>{sortedSeats.length ? sortedSeats.join(', ') : '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                <span>{flight.virtual ? `운임 ${formatPrice(flight.price, flight.currency)} × ${passengers}명` : `운임 ${formatPrice(flight.price, flight.currency)} (성인 ${passengers}명 기준)`}{feeTotal > 0 ? ` + 좌석 ${formatPrice(feeTotal, flight.currency)}` : ''}</span>
                <strong style={{ color: '#dc2626', fontSize: '18px' }}>{formatPrice(total, flight.currency)}</strong>
              </div>
              <button
                type="button"
                disabled={!ready}
                onClick={confirmBooking}
                style={{ marginTop: '12px', width: '100%', background: ready ? '#0284c7' : '#94a3b8', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 900, cursor: ready ? 'pointer' : 'not-allowed' }}
              >
                {ready ? '예약 완료하기 (데모)' : `좌석 ${passengers - selected.length}개를 더 선택해주세요`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', fontSize: '40px' }}>🎉</div>
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '4px' }}>예약 번호</div>
            <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 900, letterSpacing: '4px', color: '#0369a1' }}>{done.code}</div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', marginTop: '16px', fontSize: '14px', lineHeight: 1.9 }}>
              <div>✈ {flight.airline} {flight.flightNums}</div>
              <div>📍 {flight.route} · {flight.date} {flight.depTime} → {flight.arrTime}{flight.dayDiff > 0 ? ` (+${flight.dayDiff}일)` : ''}</div>
              <div>💺 좌석 {sortedSeats.join(', ')}</div>
              <div>💳 총 {formatPrice(total, flight.currency)}</div>
            </div>
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#5b21b6', borderRadius: '10px', padding: '12px 14px', marginTop: '14px', fontSize: '13px' }}>
              {flight.virtual
                ? '가상 항공편이라 실제 예약·결제·발권은 이뤄지지 않았어요. 이 예약 번호는 연습용이에요. 예약 내역은 내 정보에서 확인할 수 있어요.'
                : '실제 항공권이 발권된 것이 아니에요. 이 예약은 연습용이고, 실제로 구매하려면 판매처에서 예약해야 해요. 예약 내역은 내 정보에서 확인할 수 있어요.'}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="button" onClick={onViewBookings} style={{ flex: 1, background: '#0284c7', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 900, cursor: 'pointer' }}>
                내 예약 보기
              </button>
              <button type="button" onClick={onClose} style={{ flex: 1, background: '#0f172a', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 900, cursor: 'pointer' }}>
                닫기
              </button>
            </div>
            {!flight.virtual && (
              <button type="button" onClick={onRealLinks} style={{ marginTop: '10px', width: '100%', background: '#fff', color: '#0284c7', border: '1px solid #0284c7', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>
                판매처에서 실제 예약하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── 예약 내역 저장 (계정별, 이 브라우저의 localStorage) ─────────
const nowIso = () => new Date().toISOString();
const bookingKey = (email) => `allIsWellBookings:${String(email).toLowerCase()}`;

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem('allIsWellUser'));
  } catch {
    return null;
  }
}

function loadBookings(email) {
  if (!email) return [];
  try {
    const v = JSON.parse(localStorage.getItem(bookingKey(email)));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persistBookings(email, list) {
  try {
    localStorage.setItem(bookingKey(email), JSON.stringify(list));
  } catch {
    /* 저장소를 못 쓰면 새로고침 시 내역이 사라집니다 */
  }
}

// ───────── 내 정보 ─────────
function MyPage({ user, bookings, onCancel, onBack }) {
  const [confirmingCode, setConfirmingCode] = useState(null);
  const [now] = useState(() => Date.now()); // 화면을 열 때의 시각 기준으로 출발 여부 판단
  const sorted = [...bookings].sort(
    (a, b) => (a.status === 'canceled') - (b.status === 'canceled') || b.bookedAt.localeCompare(a.bookedAt),
  );
  const activeCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <section style={{ maxWidth: '800px', margin: '40px auto 80px', padding: '0 20px' }}>
      <button type="button" onClick={onBack} style={{ border: 'none', background: 'none', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '15px' }}>
        ← 항공권 검색으로 돌아가기
      </button>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div aria-hidden="true" style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>
          {(user.name || '?').slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>{user.name}님</h1>
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>{user.email}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>예정된 예약</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0284c7' }}>{activeCount}건</div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '32px 0 6px' }}>내 예약 내역</h2>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
        연습용 예약 내역이에요. 실제 발권·결제는 이뤄지지 않아요. 실제 항공권은 판매처에서 직접 구매해야 해요.
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <div style={{ fontSize: '40px' }}>🧳</div>
          <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '8px' }}>아직 예약 내역이 없어요</div>
          <div style={{ color: '#64748b', marginTop: '6px' }}>검색 결과의 가상 항공편에서 예약을 연습해 보세요.</div>
          <button type="button" onClick={onBack} style={{ marginTop: '16px', background: '#0284c7', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>
            항공권 검색하러 가기
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sorted.map((b) => {
          const canceled = b.status === 'canceled';
          const departed = !canceled && new Date(`${b.date}T${b.depTime}:00`).getTime() < now;
          const badge = canceled
            ? { text: '취소됨', bg: '#f1f5f9', color: '#64748b' }
            : departed
              ? { text: '출발 완료', bg: '#f1f5f9', color: '#64748b' }
              : { text: '예약 완료', bg: '#dcfce7', color: '#166534' };
          const cabinLabel = CABINS.find((c) => c.id === b.cabin)?.label ?? b.cabin;
          return (
            <article key={b.code} aria-label={`예약 ${b.code}`} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', opacity: canceled ? 0.7 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>예약 번호 </span>
                  <strong style={{ fontSize: '18px', letterSpacing: '2px', color: '#0369a1', textDecoration: canceled ? 'line-through' : 'none' }}>{b.code}</strong>
                </div>
                <span style={{ background: badge.bg, color: badge.color, fontSize: '12px', fontWeight: 900, padding: '4px 10px', borderRadius: '10px' }}>{badge.text}</span>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{b.route}</div>
                  <div style={{ color: '#475569', fontSize: '14px', marginTop: '4px' }}>
                    {b.date} · {b.depTime} → {b.arrTime}
                    {b.dayDiff > 0 ? ` (+${b.dayDiff}일)` : ''} · {formatDuration(b.durationMin)}
                  </div>
                  <div style={{ color: '#475569', fontSize: '14px', marginTop: '2px' }}>{b.airline} {b.flightNums}</div>
                  {b.kind === 'real' && (
                    <div style={{ display: 'inline-block', marginTop: '6px', background: '#f5f3ff', color: '#5b21b6', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px' }}>
                      실제 운항편 기준 · 연습 예약 (발권 안 됨)
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 200px', fontSize: '14px', color: '#475569', lineHeight: 1.8 }}>
                  <div>💺 좌석 <strong style={{ color: '#0f172a' }}>{b.seats.join(', ')}</strong></div>
                  <div>👥 성인 {b.passengers}명 · {cabinLabel}</div>
                  <div>🕒 예약일 {new Date(b.bookedAt).toLocaleString('ko-KR')}</div>
                  {canceled && b.canceledAt && <div>↩ 취소일 {new Date(b.canceledAt).toLocaleString('ko-KR')}</div>}
                </div>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>총 결제 금액(가상) </span>
                  <strong style={{ fontSize: '20px', color: canceled ? '#64748b' : '#dc2626', textDecoration: canceled ? 'line-through' : 'none' }}>{formatPrice(b.total, b.currency)}</strong>
                </div>

                {!canceled && !departed && (
                  confirmingCode === b.code ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#991b1b' }}>정말 취소할까요?</span>
                      <button type="button" onClick={() => { onCancel(b.code); setConfirmingCode(null); }} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>취소하기</button>
                      <button type="button" onClick={() => setConfirmingCode(null)} style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>아니요</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmingCode(b.code)} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>예약 취소</button>
                  )
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const [params, setParams] = useState({
    departure: 'ICN',
    arrival: 'NRT',
    departureDate: dateFromToday(7),
    passengers: 1,
    cabin: 'economy',
  });

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [sortOption, setSortOption] = useState('price');
  const [directOnly, setDirectOnly] = useState(false);
  const [booking, setBooking] = useState({}); // { [ignav_id]: { open, loading, error, options } }
  const abortRef = useRef(null);
  const [searched, setSearched] = useState(null); // 마지막 검색 조건 (가상 항공편 생성용)
  const [seatFlight, setSeatFlight] = useState(null); // 좌석 선택 중인 가상 항공편

  // 로그인/회원가입은 아직 목업입니다 (서버 인증 없음)
  const [user, setUser] = useState(readStoredUser);
  const [bookings, setBookings] = useState(() => loadBookings(readStoredUser()?.email));
  const [page, setPage] = useState('home'); // 'home' | 'mypage'
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'
  const [authError, setAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 로그인 후 이어서 실행할 예약 동작
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' });

  const handleSearch = async () => {
    if (!params.departureDate) return setFail('출발일을 선택해주세요.');
    if (params.departureDate < dateFromToday(0)) return setFail('지난 날짜는 조회할 수 없어요.');
    if (params.departure === params.arrival) return setFail('출발지와 도착지가 같을 수 없어요.');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSearched({ dep: params.departure, arr: params.arrival, date: params.departureDate, passengers: params.passengers, cabin: params.cabin });
    setSeatFlight(null);
    setStatus('loading');
    setErrorMsg('');
    setResults([]);
    setBooking({});

    try {
      const data = await postJson(
        '/api/flights/search',
        {
          origin: params.departure,
          destination: params.arrival,
          departure_date: params.departureDate,
          adults: params.passengers,
          cabin_class: params.cabin,
        },
        ctrl.signal,
      );
      const list = (data.itineraries ?? []).map(normalizeItinerary).filter((f) => f.price > 0);
      setResults(list);
      setMeta({
        dep: params.departure,
        arr: params.arrival,
        passengers: params.passengers,
        observedAt: data.observed_at ?? null,
        cached: Boolean(data.cached),
      });
      setStatus('done');
    } catch (e) {
      if (e.name === 'AbortError') return;
      setFail(e.message);
    }
  };

  function setFail(msg) {
    setErrorMsg(msg);
    setStatus('error');
  }

  const toggleBooking = async (id) => {
    const cur = booking[id];
    if (cur?.loading) return;
    if (cur && !cur.error) {
      setBooking((b) => ({ ...b, [id]: { ...cur, open: !cur.open } }));
      return;
    }
    setBooking((b) => ({ ...b, [id]: { open: true, loading: true } }));
    try {
      const data = await postJson('/api/flights/booking-links', { ignav_id: id });
      setBooking((b) => ({ ...b, [id]: { open: true, loading: false, options: data.options ?? [] } }));
    } catch (e) {
      setBooking((b) => ({ ...b, [id]: { open: true, loading: false, error: e.message } }));
    }
  };

  // 정렬/필터는 화면에서만 처리 → API 크레딧을 쓰지 않습니다.
  const visible = useMemo(
    () => sortFlights(directOnly ? results.filter((f) => f.stops === 0) : results, sortOption),
    [results, directOnly, sortOption],
  );
  const virtualFlights = useMemo(() => (searched ? makeVirtualFlights(searched) : []), [searched]);
  const visibleVirtual = useMemo(
    () => sortFlights(directOnly ? virtualFlights.filter((f) => f.stops === 0) : virtualFlights, sortOption),
    [virtualFlights, directOnly, sortOption],
  );

  const lowest = visible.length ? Math.min(...visible.map((f) => f.price)) : 0;
  const currency = visible[0]?.currency ?? 'KRW';

  // ───────── 로그인 (데모용: 서버 인증 없음) ─────────
  const saveUser = (u) => {
    setUser(u);
    setBookings(loadBookings(u?.email)); // 계정이 바뀌면 그 계정의 예약 내역을 불러옴
    if (!u) setPage('home');
    try {
      if (u) sessionStorage.setItem('allIsWellUser', JSON.stringify(u));
      else sessionStorage.removeItem('allIsWellUser');
    } catch {
      /* 저장소를 못 쓰는 환경이면 새로고침 시 로그아웃됩니다 */
    }
  };

  const runAction = (action) => {
    if (action.type === 'seat') setSeatFlight(action.flight);
    else toggleBooking(action.id);
  };

  // 예약 관련 버튼은 모두 이 함수를 거칩니다: 로그인 상태면 바로 실행, 아니면 로그인 창을 먼저 띄움
  const requireLogin = (action) => {
    if (user) return runAction(action);
    setPendingAction(action);
    setAuthError('');
    setAuthModal('login');
  };

  const closeAuth = () => {
    setAuthModal(null);
    setPendingAction(null);
    setAuthError('');
  };

  const completeAuth = (u) => {
    saveUser(u);
    setAuthModal(null);
    setAuthError('');
    setLoginForm({ email: '', password: '' });
    setSignupForm({ name: '', email: '', password: '' });
    const action = pendingAction;
    setPendingAction(null);
    if (action) runAction(action); // 로그인 직전에 누른 예약을 이어서 진행
  };

  const logout = () => {
    saveUser(null);
    setSeatFlight(null);
    setBooking({}); // 열려 있던 예약 링크도 닫음
  };

  const switchAuth = (mode) => {
    setAuthError('');
    setAuthModal(mode);
  };

  // 완료 화면의 "판매처에서 실제 예약하기": 해당 항공편 카드의 판매처 링크 목록을 열어줌
  const showLinks = (id) => {
    const cur = booking[id];
    if (cur?.loading) return;
    if (cur && !cur.error) setBooking((b) => ({ ...b, [id]: { ...cur, open: true } }));
    else toggleBooking(id);
  };

  const addBooking = (record) => {
    const next = [record, ...bookings];
    setBookings(next);
    persistBookings(user.email, next);
  };

  const cancelBooking = (code) => {
    const next = bookings.map((b) => (b.code === code ? { ...b, status: 'canceled', canceledAt: nowIso() } : b));
    setBookings(next);
    persistBookings(user.email, next);
  };

  const activeBookingCount = bookings.filter((b) => b.status === 'confirmed').length;

  const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!emailOk(loginForm.email)) return setAuthError('이메일 형식을 확인해주세요.');
    if (!loginForm.password) return setAuthError('비밀번호를 입력해주세요.');
    completeAuth({ name: loginForm.email.split('@')[0], email: loginForm.email });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!signupForm.name.trim()) return setAuthError('이름을 입력해주세요.');
    if (!emailOk(signupForm.email)) return setAuthError('이메일 형식을 확인해주세요.');
    if (signupForm.password.length < 6) return setAuthError('비밀번호는 6자 이상이어야 해요.');
    completeAuth({ name: signupForm.name.trim(), email: signupForm.email });
  };

  useEffect(() => {
    if (!authModal) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sortBtn = (id, label) => (
    <button
      onClick={() => setSortOption(id)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #0284c7',
        background: sortOption === id ? '#0284c7' : '#fff',
        color: sortOption === id ? '#fff' : '#0284c7',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  const isLoading = status === 'loading';

  // 실제(API) 항공편과 가상 항공편 카드를 한 곳에서 그립니다.
  // 실제 항공편은 판매처 링크로 이동하므로 별도의 "예약하기" 버튼이 없고,
  // 가상 항공편만 "예약하기" → 좌석 선택으로 이어집니다.
  const renderFlightCard = (f, isBest) => {
    const b = f.virtual ? null : booking[f.id];
    const paxText = f.virtual ? '1인 기준' : `성인 ${meta?.passengers ?? searched?.passengers ?? 1}명 기준`;
    return (
      <div key={f.id} style={{ background: '#fff', border: f.virtual ? '1px solid #ddd6fe' : isBest ? '2px solid #0284c7' : '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', position: 'relative' }}>
        {f.virtual && <div style={{ position: 'absolute', top: '-12px', left: '24px', background: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: 900, padding: '2px 10px', borderRadius: '10px' }}>가상 항공편 · 연습용</div>}
        {isBest && <div style={{ position: 'absolute', top: '-12px', left: '24px', background: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 900, padding: '2px 10px', borderRadius: '10px' }}>최저가</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontSize: '18px', fontWeight: 900 }}>{f.airline}</div>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>{f.flightNums && `편명 ${f.flightNums}`}</div>
            {f.selfTransfer && (
              <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 'bold', color: '#92400e', background: '#fef3c7', display: 'inline-block', padding: '2px 8px', borderRadius: '6px' }}>
                별도 티켓 환승 포함
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 200px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900 }}>
              {f.depTime} → {f.arrTime}
              {f.dayDiff > 0 && <sup style={{ color: '#dc2626', fontSize: '12px' }}> +{f.dayDiff}일</sup>}
            </div>
            <div style={{ color: '#0284c7', fontWeight: 'bold', fontSize: '14px', marginTop: '2px' }}>
              {formatDuration(f.durationMin)} · {f.stops === 0 ? '직항' : `경유 ${f.stops}회 (${f.via.join(', ')})`}
            </div>
          </div>

          <div style={{ flex: '1 1 160px', textAlign: 'right' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: isBest ? '#dc2626' : '#0284c7' }}>{formatPrice(f.price, f.currency)}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>{paxText}</div>
            {f.virtual ? (
              <button
                onClick={() => requireLogin({ type: 'seat', flight: f })}
                style={{ marginTop: '8px', background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {user ? '예약하기' : '🔒 로그인 후 예약'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => requireLogin({ type: 'seat', flight: f })}
                  style={{ marginTop: '8px', background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {user ? '예약하기' : '🔒 로그인 후 예약'}
                </button>
                {user && (
                  <div>
                    <button
                      onClick={() => requireLogin({ type: 'links', id: f.id })}
                      style={{ marginTop: '8px', border: 'none', background: 'none', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: 0 }}
                    >
                      {b?.open ? '판매처 링크 닫기' : '판매처 링크 보기'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {b?.open && (
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
            {b.loading && <div style={{ color: '#64748b' }}>예약 링크를 불러오는 중...</div>}
            {b.error && <div role="alert" style={{ color: '#991b1b', fontWeight: 'bold' }}>{b.error}</div>}
            {b.options && b.options.length === 0 && <div style={{ color: '#64748b' }}>이 항공편은 연결 가능한 예약 링크가 없어요.</div>}
            {b.options && b.options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...b.options]
                  .sort((x, y) => (x.provider_type === 'airline' ? 0 : 1) - (y.provider_type === 'airline' ? 0 : 1))
                  .map((o, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {o.provider_name}
                          <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'bold', color: o.provider_type === 'airline' ? '#047857' : '#64748b' }}>
                            {o.provider_type === 'airline' ? '항공사 직접' : o.provider_type === 'third_party' ? '여행사' : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {o.fare_name && `${o.fare_name} · `}
                          {o.specificity === 'search_results' ? '열리는 페이지에서 항공편을 직접 선택해야 해요' : o.specificity === 'exact_flight' ? '해당 항공편이 선택된 상태로 열려요' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {o.price?.amount > 0 && <span style={{ fontWeight: 900 }}>{formatPrice(o.price.amount, o.price.currency)}</span>}
                        <a href={o.url} target="_blank" rel="noopener noreferrer" style={{ background: '#0284c7', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
                          예약하러 가기
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => setPage('home')} aria-label="홈으로" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ fontSize: '28px' }}>🛫</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1' }}>All is well 항공</span>
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600 }}>👤 {user.name}님</span>
              <button
                type="button"
                onClick={() => setPage('mypage')}
                aria-current={page === 'mypage' ? 'page' : undefined}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #0284c7', background: page === 'mypage' ? '#0284c7' : '#fff', color: page === 'mypage' ? '#fff' : '#0284c7', fontWeight: 'bold', cursor: 'pointer' }}
              >
                내 정보{activeBookingCount > 0 ? ` (${activeBookingCount})` : ''}
              </button>
              <button onClick={logout} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>로그아웃</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAuthModal('login')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0284c7', background: '#fff', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer' }}>로그인</button>
              <button onClick={() => setAuthModal('signup')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>회원가입</button>
            </div>
          )}
        </div>
      </header>

      {page === 'mypage' && user && (
        <MyPage user={user} bookings={bookings} onCancel={cancelBooking} onBack={() => setPage('home')} />
      )}

      {(page === 'home' || !user) && (
        <>
      {/* Search */}
      <section style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px', textAlign: 'center' }}>항공권 최저가 검색</h1>
          <p style={{ textAlign: 'center', color: '#e0f2fe', marginBottom: '30px', fontSize: '18px' }}>
            구간과 날짜만 고르면 조회 시점의 실제 운임을 보여드려요.
          </p>

          <div style={{ background: '#fff', borderRadius: '20px', padding: '30px', color: '#0f172a', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle} htmlFor="dep">출발지</label>
                <select id="dep" value={params.departure} onChange={(e) => setParams({ ...params, departure: e.target.value })} style={fieldStyle}>
                  {AIRPORTS.map((a) => <option key={a.id} value={a.id}>[{a.type}] {a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="arr">도착지</label>
                <select id="arr" value={params.arrival} onChange={(e) => setParams({ ...params, arrival: e.target.value })} style={fieldStyle}>
                  {AIRPORTS.map((a) => <option key={a.id} value={a.id}>[{a.type}] {a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="date">출발일</label>
                <input id="date" type="date" min={dateFromToday(0)} value={params.departureDate} onChange={(e) => setParams({ ...params, departureDate: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="pax">인원</label>
                <select id="pax" value={params.passengers} onChange={(e) => setParams({ ...params, passengers: Number(e.target.value) })} style={fieldStyle}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>성인 {n}명</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="cabin">좌석 등급</label>
                <select id="cabin" value={params.cabin} onChange={(e) => setParams({ ...params, cabin: e.target.value })} style={fieldStyle}>
                  {CABINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              style={{ marginTop: '24px', width: '100%', background: isLoading ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '20px', fontWeight: 900, cursor: isLoading ? 'wait' : 'pointer' }}
            >
              {isLoading ? '🔄 운임 조회 중...' : '🔍 항공권 검색'}
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      {status !== 'idle' && (
        <section style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }} aria-live="polite">
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '50px', fontSize: '20px', fontWeight: 'bold' }}>
              항공권을 찾고 있어요. 10초 정도 걸릴 수 있어요.
            </div>
          )}

          {status === 'error' && (
            <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '18px 24px', fontWeight: 'bold' }}>
              {errorMsg}
            </div>
          )}

          {status === 'done' && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '20px', fontWeight: 900 }}>조건에 맞는 항공편이 없어요</div>
              <div style={{ color: '#64748b', marginTop: '8px' }}>날짜나 도착지를 바꿔서 다시 검색해 보세요. 일부 소형 공항은 운항 정보가 없을 수 있어요.</div>
            </div>
          )}

          {status === 'done' && results.length > 0 && (
            <div>
              <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '14px', padding: '18px 24px', marginBottom: '20px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0c4a6e' }}>
                  {meta.dep} → {meta.arr} · 항공편 {visible.length}개 · 최저 <span style={{ color: '#dc2626' }}>{formatPrice(lowest, currency)}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                  성인 {meta.passengers}명 기준 · 가격은 조회 시점 기준이며 변동될 수 있어요. 결제 전 판매처에서 최종 가격을 확인하세요.
                  {meta.observedAt && ` (조회: ${new Date(meta.observedAt).toLocaleString('ko-KR')}${meta.cached ? ', 저장된 결과' : ''})`}
                </div>
                <div style={{ fontSize: '13px', color: '#5b21b6', marginTop: '6px', fontWeight: 'bold' }}>
                  ※ "예약하기"는 연습용이라 실제 발권·결제는 되지 않아요. 실제 구매는 "판매처 링크 보기"를 이용하세요.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />
                  직항만 보기
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {sortBtn('price', '최저가순')}
                  {sortBtn('time', '출발시간순')}
                  {sortBtn('duration', '소요시간순')}
                </div>
              </div>

              {visible.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>직항 항공편이 없어요. 필터를 해제해 보세요.</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {visible.map((f) => renderFlightCard(f, f.price === lowest))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 가상 항공편 (예약 연습용) */}
      {(status === 'done' || status === 'error') && searched && (
        <section style={{ maxWidth: '1000px', margin: '0 auto 60px', padding: '0 20px' }}>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '14px', padding: '16px 24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#5b21b6' }}>🧪 가상 항공편 · 예약 연습용 ({searched.dep} → {searched.arr})</div>
            <div style={{ fontSize: '13px', color: '#6d28d9', marginTop: '4px' }}>
              실제로 운항하는 항공편이 아니에요. 예약하기를 눌러 좌석 선택 흐름을 체험해 볼 수 있고, 결제나 발권은 되지 않아요.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {visibleVirtual.map((f) => renderFlightCard(f, false))}
          </div>
        </section>
      )}

        </>
      )}

      {seatFlight && searched && (
        <SeatSelectModal
          flight={seatFlight}
          cabin={searched.cabin}
          passengers={searched.passengers}
          takenSeats={bookings.filter((b) => b.status === 'confirmed' && b.flightId === seatFlight.id).flatMap((b) => b.seats)}
          onBooked={addBooking}
          onRealLinks={() => {
            const id = seatFlight.id;
            setSeatFlight(null);
            setPage('home');
            showLinks(id);
          }}
          onViewBookings={() => {
            setSeatFlight(null);
            setPage('mypage');
          }}
          onClose={() => setSeatFlight(null)}
        />
      )}

      {/* 로그인 / 회원가입 (데모용) */}
      {authModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110, padding: '16px' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="auth-title" style={{ background: '#fff', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button type="button" onClick={closeAuth} aria-label="닫기" style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>

            {pendingAction && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', fontWeight: 'bold' }}>
                🔒 예약하려면 로그인이 필요해요. 로그인하면 바로 이어서 진행돼요.
              </div>
            )}

            <form onSubmit={authModal === 'login' ? handleLogin : handleSignup} noValidate>
              <h2 id="auth-title" style={{ fontSize: '24px', fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>
                {authModal === 'login' ? '로그인' : '회원가입'}
              </h2>

              {authModal === 'signup' && (
                <input type="text" placeholder="이름" autoComplete="name" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} style={inputStyle} />
              )}
              <input
                type="email"
                placeholder="이메일"
                autoComplete="email"
                value={authModal === 'login' ? loginForm.email : signupForm.email}
                onChange={(e) => (authModal === 'login' ? setLoginForm({ ...loginForm, email: e.target.value }) : setSignupForm({ ...signupForm, email: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder={authModal === 'login' ? '비밀번호' : '비밀번호 (6자 이상)'}
                autoComplete={authModal === 'login' ? 'current-password' : 'new-password'}
                value={authModal === 'login' ? loginForm.password : signupForm.password}
                onChange={(e) => (authModal === 'login' ? setLoginForm({ ...loginForm, password: e.target.value }) : setSignupForm({ ...signupForm, password: e.target.value }))}
                style={{ ...inputStyle, marginBottom: '14px' }}
              />

              {authError && (
                <div role="alert" style={{ color: '#991b1b', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px' }}>{authError}</div>
              )}

              <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
                {authModal === 'login' ? '로그인' : '가입하고 시작하기'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '14px', color: '#475569' }}>
              {authModal === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
              <button type="button" onClick={() => switchAuth(authModal === 'login' ? 'signup' : 'login')} style={{ border: 'none', background: 'none', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>
                {authModal === 'login' ? '회원가입' : '로그인'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
              데모용 로그인이에요. 입력한 정보는 서버에 저장되지 않아요.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
