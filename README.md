# 🏠 betterer‑dira — Live Lottery Probability Calculator (GitHub Pages)

This is **betterer‑dira** — a playful nod to *better‑dira* — because, well, it's better‑er 😄

Client‑side app to compute your chances in Israeli housing lotteries using **live data from the Dira government API**:
- **Per lottery** — your chance in each specific housing lottery
- **Per city** — win at least one among that city's lotteries  
- **Overall** — across up to **3 cities** (you participate in *all* lotteries in each selected city)

Host on **GitHub Pages** – no backend, no dependencies, pulls live data directly from `dira.moch.gov.il`.

## ✨ Features
- **Live government data** via simple copy-paste from Dira API
- **Sortable results tables** — click any column header to sort (especially useful for probability columns!)
- **Priority group calculations** with Combat→Reserve spillover rules
- City selection (max 3) with combined probability calculations
- Export results to CSV
- Real-time statistics dashboard

## 🔄 How to get live data (2 simple steps)
1. **Click "Load Live Data"** button in the app
2. **Follow the instructions** to copy-paste JSON from the government API
   - No technical knowledge needed!
   - Works around browser CORS restrictions
   - Always gets the most current lottery data

## 🧮 Rules implemented
1. **Priority allocation:** each priority group gets up to `min(designated houses, applicants)`.
2. **Combat exception:** unclaimed Combat houses spill to **Reserve Duty** first; any leftover goes to general pool.
3. **General pool houses:** unclaimed ♿ + unclaimed (🛡 after spillover) + unclaimed 🏠 + all **Regular houses** where `Regular = Total - (all designated)`.
4. **Competitors in general pool:** `Regular applicants` + **overflow** from all priority groups (those who didn't get designated houses).
5. **Lottery probability:** `min(1, GeneralPoolHouses / TotalCompetitors)`.
6. **City probability:** `1 − Π(1 − p_lottery)` across that city's lotteries.
7. **Overall (selected cities ≤ 3):** `1 − Π(1 − p_city)`.

All totals are **inclusive** of priority populations.

## 🎯 Priority Groups
- **♿ Wheelchair/Disabled** (`TotalHandicappedSubscribers`)
- **🎖️ Combat Reservists** (`TotalCombatReservistSubscribers`)
- **🛡️ Reserve Duty** (`TotalReservedDutySubscribers`) 
- **🏠 Local Residents** (`TotalLocalSubscribers`)
- **Regular applicants** (everyone else)

## 📊 Sorting & Analysis
All results tables are **sortable** — click any column header to sort:
- Sort by **P_Win_Lottery** to find the best odds
- Sort by **City** to group by location
- Sort by **Applicants** to see competition levels
- Toggle ascending/descending with repeated clicks

## 🚀 Quick start
1. Create a repo named **betterer-dira**.
2. Add: `index.html`, `app.js`, `styles.css`, `README.md`.
3. Enable **Settings → Pages** for the main branch.
4. Visit: `https://<your-username>.github.io/betterer-dira/`.

## 🔗 Data Source
Live data from: `https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FProjectStatus%3D4%26PageNumber%3D1%26PageSize%3D50%26IsInit%3Dtrue`

## 📄 License
MIT
