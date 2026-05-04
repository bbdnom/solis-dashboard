# Solis Dashboard

Live monitoring dashboard for [Solis Engine](https://github.com/bbdnom/solis-engine) — Binance USDT-M Futures auto trader.

🔗 **Live**: https://bbdnom.github.io/solis-dashboard/

## What it shows

- Real-time bot status (mode, balance, paused, kill switch)
- Active positions (live PnL)
- Recent trades (50 latest)
- Statistics (total / 24h / 7d)
- BTC/USDT 1H price chart (direct from Binance public API)
- Control buttons (Pause / Resume / Kill Switch)

## Architecture

```
GitHub Pages (this repo)              Oracle Cloud VM
┌─────────────────────┐               ┌────────────────────┐
│ index.html          │ ── X-API-Key ── │ Solis Bot          │
│ js/dashboard.js     │ ───── fetch ──→ │ FastAPI :8000      │
│ css/dashboard.css   │                 │ /api/{...}         │
└─────────────────────┘               └────────────────────┘
```

## Setup

1. Open https://bbdnom.github.io/solis-dashboard/
2. Enter your Solis API URL (e.g. `https://solis.example.com` or `http://YOUR_VM_IP:8000`)
3. Enter your `DASHBOARD_API_KEY` (from `.env` on the bot server)
4. Click Connect → setup saved to browser localStorage

## Notes

- This is **frontend only** — no API keys committed
- All sensitive data stays on Solis server (Oracle Cloud)
- CORS must be configured on Solis server to allow `https://bbdnom.github.io`

## License

MIT
