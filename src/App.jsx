import React, { useMemo, useRef, useState } from 'react';

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

  // 로그인/회원가입은 아직 목업입니다 (서버 인증 없음)
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '' });

  const handleSearch = async () => {
    if (!params.departureDate) return setFail('출발일을 선택해주세요.');
    if (params.departureDate < dateFromToday(0)) return setFail('지난 날짜는 조회할 수 없어요.');
    if (params.departure === params.arrival) return setFail('출발지와 도착지가 같을 수 없어요.');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

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
  const visible = useMemo(() => {
    const list = directOnly ? results.filter((f) => f.stops === 0) : [...results];
    if (sortOption === 'price') list.sort((a, b) => a.price - b.price);
    else if (sortOption === 'time') list.sort((a, b) => a.depLocal.localeCompare(b.depLocal));
    else list.sort((a, b) => (a.durationMin ?? Infinity) - (b.durationMin ?? Infinity));
    return list;
  }, [results, directOnly, sortOption]);

  const lowest = visible.length ? Math.min(...visible.map((f) => f.price)) : 0;
  const currency = visible[0]?.currency ?? 'KRW';

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) return alert('정보를 입력해주세요.');
    setUser({ name: loginForm.email.split('@')[0], email: loginForm.email });
    setAuthModal(null);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!signupForm.name || !signupForm.email || !signupForm.password) return alert('모든 칸을 입력해주세요.');
    setUser({ name: signupForm.name, email: signupForm.email });
    setAuthModal(null);
  };

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>🛫</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1' }}>All is well 항공</span>
          </div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600 }}>👤 {user.name}님</span>
              <button onClick={() => setUser(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>로그아웃</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAuthModal('login')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #0284c7', background: '#fff', color: '#0284c7', fontWeight: 'bold', cursor: 'pointer' }}>로그인</button>
              <button onClick={() => setAuthModal('signup')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>회원가입</button>
            </div>
          )}
        </div>
      </header>

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
                {visible.map((f) => {
                  const isBest = f.price === lowest;
                  const b = booking[f.id];
                  return (
                    <div key={f.id} style={{ background: '#fff', border: isBest ? '2px solid #0284c7' : '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', position: 'relative' }}>
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
                          <div style={{ fontSize: '13px', color: '#64748b' }}>성인 {meta.passengers}명 기준</div>
                          <button
                            onClick={() => toggleBooking(f.id)}
                            style={{ marginTop: '8px', background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            {b?.open ? '닫기' : '예약 링크 보기'}
                          </button>
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
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Auth Modal (목업) */}
      {authModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div role="dialog" aria-modal="true" style={{ background: '#fff', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setAuthModal(null)} aria-label="닫기" style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            {authModal === 'login' ? (
              <form onSubmit={handleLogin}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>로그인</h2>
                <input type="email" placeholder="이메일" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} style={inputStyle} />
                <input type="password" placeholder="비밀번호" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} style={{ ...inputStyle, marginBottom: '20px' }} />
                <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>로그인</button>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '20px', textAlign: 'center' }}>회원가입</h2>
                <input type="text" placeholder="이름" value={signupForm.name} onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} style={inputStyle} />
                <input type="email" placeholder="이메일" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} style={inputStyle} />
                <input type="password" placeholder="비밀번호" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} style={{ ...inputStyle, marginBottom: '20px' }} />
                <button type="submit" style={{ width: '100%', background: '#0284c7', color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 900, cursor: 'pointer' }}>가입하기</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
