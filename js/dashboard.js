// Solis Dashboard - Frontend
const STORAGE_KEY = 'solis_dashboard_setup';
let API_URL = '';
let API_KEY = '';
let equityChart = null;

function loadSetup() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      API_URL = obj.url; API_KEY = obj.key;
      document.getElementById('setup-overlay').classList.add('hidden');
      return true;
    } catch (e) {}
  }
  return false;
}

function saveSetup() {
  const url = document.getElementById('api-url').value.trim().replace(/\/$/, '');
  const key = document.getElementById('api-key').value.trim();
  if (!url || !key) return alert('URL과 Key 모두 필요');
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
  API_URL = url; API_KEY = key;
  document.getElementById('setup-overlay').classList.add('hidden');
  init();
}

function resetSetup() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

async function fetchAPI(path, method = 'GET') {
  try {
    const r = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    });
    if (r.status === 401) { alert('Invalid API Key'); resetSetup(); return null; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    setConnected(false);
    console.error(`API error ${path}:`, e);
    return null;
  }
}

function setConnected(ok) {
  const pill = document.getElementById('pill-conn');
  pill.classList.toggle('disconnected', !ok);
  pill.title = ok ? '연결됨' : '연결 끊김';
}

function fmtUSD(v, sign = false) {
  const num = Number(v) || 0;
  const s = sign && num >= 0 ? '+' : '';
  return s + '$' + num.toFixed(4);
}

function fmtPct(v) {
  const num = Number(v) || 0;
  return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
}

function fmtTs(ms) {
  return new Date(ms).toISOString().replace('T', ' ').substring(0, 19);
}

async function refreshStatus() {
  const d = await fetchAPI('/status');
  if (!d) return;
  setConnected(true);

  document.getElementById('pill-mode').textContent = d.mode;
  document.getElementById('pill-paused').classList.toggle('hidden', !d.paused);
  document.getElementById('pill-kill').classList.toggle('hidden', !d.kill_switch);

  document.getElementById('balance').textContent = `$${d.balance.toFixed(4)}`;
  document.getElementById('balance-sub').textContent = `레버리지 ${d.leverage}x · ${d.symbols.join(', ')}`;

  const pnl = d.daily_pnl;
  const pnlEl = document.getElementById('daily-pnl');
  pnlEl.textContent = fmtUSD(pnl, true);
  pnlEl.className = 'value ' + (pnl >= 0 ? 'positive' : 'negative');
  document.getElementById('daily-pnl-sub').textContent = `연속 SL: ${d.consecutive_sl}회`;

  document.getElementById('position-count').textContent = d.positions_count;
}

async function refreshPositions() {
  const d = await fetchAPI('/positions');
  if (!d) return;
  const tbody = document.getElementById('positions-tbody');
  if (d.positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty">활성 포지션 없음</td></tr>';
    return;
  }
  tbody.innerHTML = d.positions.map(p => `
    <tr>
      <td><b>${p.symbol}</b></td>
      <td class="side-${p.side.toLowerCase()}">${p.side}</td>
      <td>${p.entry_price.toFixed(2)}</td>
      <td>${p.current_price.toFixed(2)}</td>
      <td>${p.tp_price.toFixed(2)}</td>
      <td>${p.sl_price.toFixed(2)}</td>
      <td>${p.qty.toFixed(6)}</td>
      <td>${p.leverage}x</td>
      <td class="${p.pnl_usd >= 0 ? 'pnl-pos' : 'pnl-neg'}">
        ${fmtUSD(p.pnl_usd, true)} (${fmtPct(p.pnl_pct * 100)})
      </td>
      <td>${p.mode}</td>
    </tr>
  `).join('');
}

async function refreshTrades() {
  const d = await fetchAPI('/trades?limit=50');
  if (!d) return;
  const tbody = document.getElementById('trades-tbody');
  if (d.trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">거래 이력 없음</td></tr>';
    return;
  }
  tbody.innerHTML = d.trades.map(t => `
    <tr>
      <td>${fmtTs(t.ts)}</td>
      <td>${t.symbol}</td>
      <td class="side-${t.side.toLowerCase()}">${t.side}</td>
      <td>${t.entry.toFixed(2)}</td>
      <td>${t.exit ? t.exit.toFixed(2) : '--'}</td>
      <td class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtUSD(t.pnl, true)}</td>
      <td class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">${fmtPct((t.pnl_pct||0)*100)}</td>
      <td>${t.exit_reason || '--'}</td>
      <td>${t.mode}</td>
    </tr>
  `).join('');
}

async function refreshStats() {
  const d = await fetchAPI('/stats');
  if (!d) return;
  document.getElementById('total-trades').textContent = d.total_trades;
  document.getElementById('win-rate').textContent = d.win_rate + '%';
  document.getElementById('total-pnl').textContent = fmtUSD(d.total_pnl, true);
  document.getElementById('avg-pct').textContent = fmtPct(d.avg_pct);
  document.getElementById('day-trades').textContent = d.day.trades;
  document.getElementById('day-pnl').textContent = fmtUSD(d.day.pnl, true);
  document.getElementById('week-trades').textContent = d.week.trades;
  document.getElementById('week-pnl').textContent = fmtUSD(d.week.pnl, true);
}

async function refreshBTCPrice() {
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    const d = await r.json();
    const price = parseFloat(d.lastPrice);
    const change = parseFloat(d.priceChangePercent);
    document.getElementById('btc-price').textContent = '$' + price.toFixed(2);
    const sub = document.getElementById('btc-change');
    sub.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '% (24h)';
    sub.style.color = change >= 0 ? '#10b981' : '#ef4444';
  } catch (e) {
    console.error('BTC price fetch error:', e);
  }
}

async function refreshEquity() {
  const d = await fetchAPI('/equity');
  if (!d) return;
  document.getElementById('eq-start').textContent = '$' + Number(d.start_balance).toFixed(4);
  document.getElementById('eq-current').textContent = '$' + Number(d.current_balance).toFixed(4);
  const totalEl = document.getElementById('eq-total');
  totalEl.textContent = (d.total_pnl >= 0 ? '+' : '') + '$' + Number(d.total_pnl).toFixed(4);
  totalEl.style.color = d.total_pnl >= 0 ? '#10b981' : '#ef4444';

  // points가 비어있으면 (거래 없음) 시작·현재 잔고만 표시
  let points = d.points;
  if (points.length <= 1) {
    points = [
      { ts: Date.now() - 3600000, equity: d.start_balance, pnl: 0 },
      { ts: Date.now(),           equity: d.current_balance, pnl: 0 },
    ];
  }
  if (!equityChart) initEquityChart();
  equityChart.data.labels = points.map(p => new Date(p.ts).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }));
  equityChart.data.datasets[0].data = points.map(p => p.equity);
  // 시작 잔고 기준선
  equityChart.data.datasets[1].data = points.map(_ => d.start_balance);
  equityChart.update('none');
}

function initEquityChart() {
  const ctx = document.getElementById('equity-chart').getContext('2d');
  equityChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      {
        label: 'Equity', data: [],
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)',
        tension: 0.2, pointRadius: 2, pointBackgroundColor: '#10b981',
        fill: true,
      },
      {
        label: 'Start', data: [],
        borderColor: '#777', borderDash: [5, 5], borderWidth: 1,
        pointRadius: 0, fill: false,
      },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#999' } },
        tooltip: {
          callbacks: {
            label: (ctx) => '$' + Number(ctx.parsed.y).toFixed(4),
          },
        },
      },
      scales: {
        x: { ticks: { color: '#777', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { color: '#2a3144' } },
        y: { ticks: { color: '#777', callback: v => '$' + Number(v).toFixed(2) }, grid: { color: '#2a3144' } },
      },
    },
  });
}

async function apiCall(action, method) {
  const r = await fetchAPI('/' + action, method);
  const el = document.getElementById('control-result');
  if (r) {
    el.textContent = `✓ ${action} 완료 (${JSON.stringify(r).substring(0, 80)})`;
    el.style.color = '#10b981';
    refreshStatus();
  } else {
    el.textContent = `✗ ${action} 실패`;
    el.style.color = '#ef4444';
  }
  setTimeout(() => el.textContent = '', 5000);
}

function confirmKill() {
  if (confirm('🚨 모든 포지션을 청산하고 봇을 정지합니다. 계속하시겠습니까?')) {
    apiCall('kill', 'POST');
  }
}

async function tick() {
  await Promise.all([
    refreshStatus(),
    refreshPositions(),
    refreshStats(),
    refreshBTCPrice(),
    refreshEquity(),
  ]);
  document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

function init() {
  tick();
  refreshTrades();
  setInterval(tick, 5000);
  setInterval(refreshTrades, 30000);
}

if (loadSetup()) {
  init();
}
