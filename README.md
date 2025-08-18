# 🏠 betterer‑dira — Lottery Probability Calculator (GitHub Pages)

This is **betterer‑dira** — a playful nod to *better‑dira* — because, well, it’s better‑er 😄

Client‑side app to compute your chances in housing lotteries:
- **Per lottery**
- **Per city** (win at least one among that city's lotteries)
- **Overall** across up to **3 cities** (you participate in *all* lotteries in each selected city)

Host on **GitHub Pages** – no backend, no dependencies.

## ✨ Features
- CSV upload & validation
- Implements priority groups + Combat→Reserve spillover and general pool rules
- City selection (max 3) and overall probability
- Export results to CSV

## 📥 Data format (CSV)
Header row is required:

```
Name,City,Total_Houses,Applicants,Wheelchair_Houses,Wheelchair_Applicants,Combat_Houses,Combat_Applicants,Reserve_Houses,Reserve_Applicants,Local_Houses,Local_Applicants
```

See [`sample.csv`](./sample.csv) for an example.

## 🧮 Rules implemented
1. **Preferred allocation:** each preferred group gets up to `min(designated houses, applicants)`.
2. **Combat exception:** unclaimed Combat houses spill to **Reserve** first; any leftover goes to general pool.
3. **General pool houses:** unclaimed ♿ + unclaimed (🛡 after spillover) + unclaimed 🏠 + all **Regular houses** where `Regular = Total - (all designated)`.
4. **Competitors in general pool:** `Regular applicants` + **overflow** from all preferred groups (those who didn’t get designated houses).
5. **Lottery probability:** `min(1, GeneralPoolHouses / TotalCompetitors)`.
6. **City probability:** `1 − Π(1 − p_lottery)` across that city's lotteries.
7. **Overall (selected cities ≤ 3):** `1 − Π(1 − p_city)`.

All totals are **inclusive** of preferred populations.

## 🚀 Quick start
1. Create a repo named **betterer-dira**.
2. Add: `index.html`, `app.js`, `styles.css`, `sample.csv`, `README.md`.
3. Enable **Settings → Pages** for the main branch.
4. Visit: `https://<your-username>.github.io/betterer-dira/`.

## 📄 License
MIT
