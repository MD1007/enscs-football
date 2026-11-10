# 🏆 ENSCS FOOTBALL TOURNAMENT – OFFICIAL MANAGEMENT PLATFORM
### École Nationale Supérieure de Cybersécurité (ENSCS), Algeria

A complete, modern, full-stack football tournament management platform designed with inspiration from UEFA Champions League, FIFA, and Fantasy Premier League aesthetics. Built for high performance, server-side security, automatic rankings, and instant public access for classmates.

---

## 🌟 Key Features

### 1. 👥 Public Interface (Zero Authentication Needed)
Your classmates and visitors can immediately open the platform on mobile, tablet, or PC to view live tournament progress with zero friction:
- **Overview / Home**: Official competition branding, real-time metrics (teams, matches played, total goals, stage), next match countdown timer, group leaders, and star player honors.
- **Matches Tab**: All 18 group matches + knockout fixtures with filters (Group A/B/C, Matchdays 1/2/3, Live/Finished/Upcoming), team colors, and prominent final scores. Clicking any finished or live match opens the **Match Details Modal** (goalscorers + minute, assists, yellow/red cards).
- **Standings Tab**: 3 independent group tables (Group A [Green], Group B [Blue], Group C [Red]) with official tie-breaking rules (1. Head-to-Head -> 2. Goal Difference -> 3. Goals Scored), plus the **Best 2nd-Place Wildcard Table**.
- **Knockout Stage Tab**: Interactive "Road to the Final" bracket. Initially displays the official progress countdown until group stage completion, then dynamically maps Semi-Finals, 3rd Place Match, and the Grand Final.
- **Top Scorers (Golden Boot)**: Automatic leaderboard tallies goals scored strictly from match events.
- **Top Assists (Playmaker Award)**: Automatically tracks key providers.
- **Disciplinary Cards**: Disciplinary charts for Yellow Cards (🟨) and Red Cards (🟥).
- **Teams & Players**: Dedicated team cards and profiles with complete 7-player rosters, designated team captains, match statistics, and bilingual English/French & Arabic (`dir="auto"`) typography.
- **Rules Tab**: Official tournament rules, qualification statutes, tiebreakers, and general conduct rules.

---

### 2. 🔐 Protected Administrator Dashboard (`/admin`)
Only the authenticated administrator can alter tournament records. Protected by HTTP-only JWT cookies and bcrypt password hashing:
- **Match Result Entry**: Enter final scores (e.g., `OSPF 3–0 Laghbina FC`).
- **Goalscorers & Assists Registration**: Assign goals and assists directly to players from the participating teams (prevents attributing stats to unrelated teams).
- **Disciplinary Sanctions**: Record yellow and red cards with minute timestamps.
- **Knockout Bracket Engine**: 1-click automatic qualification when groups finish, mapping:
  - 1st in Group A vs Best 2nd Place (Semi-Final 1)
  - 1st in Group B vs 1st in Group C (Semi-Final 2)
  - Semi-final winners automatically advance to the Grand Final; semi-final runner-ups contest the 3rd-place bronze match.
  - Full support for penalty shootouts in knockout draws.
- **Team & Player Management**: Add, edit, and delete clubs; edit captains; complete Barca's roster or any incomplete squads.
- **Format Discrepancy Resolution**: Built-in configuration resolving the 11-team announcement vs 12-team graphic reference.
- **Activity Log**: Timestamped audit trail tracking every single admin change.
- **Emergency Tournament Reset**: Securely reset tournament data to original seeded fixtures using confirmation phrase `RESET_ENSCS_TOURNAMENT`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested and verified on Node v24)
- **npm** or **pnpm** or **yarn**

### 2. Run Locally in Development Mode
```bash
# 1. Install dependencies (already installed in workspace)
npm install

# 2. Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 3. Run in Production Mode
```bash
# Build the production bundle
npm run build

# Start the optimized server
npm run start
```
The server will start on port `3000` (or the port defined in `process.env.PORT`).

---

## 🔑 Administrator Credentials

To access the Admin Portal:
1. Navigate to: `http://localhost:3000/admin` (or click **Admin Portal** in the header).
2. Log in with the administrator account. The password is never stored in the code: set it with the
   `ADMIN_PASSWORD` setting (in `.env.local` locally, or in the host's Environment settings online).
   `ADMIN_USERNAME` is optional.

---

## 🌐 Sharing with Classmates

### Option A: Local School / Campus Wi-Fi (LAN)
If you are connected to the same Wi-Fi or hotspot at ENSCS:
1. Find your computer's local IP address (`ipconfig` on Windows, look for IPv4 e.g. `192.168.1.45`).
2. Run `npm run start` (or `npm run dev -- -H 0.0.0.0`).
3. Share the URL with your classmates:
   `http://192.168.1.45:3000`
4. Classmates can view scores and standings directly on their phones without logging in.

### Option B: Free Cloud Hosting (Vercel, Railway, Render)
1. **GitHub**: Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "ENSCS Football Tournament Platform"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Railway / Render / VPS**:
   - Direct 1-click deployment with persistent SQLite storage: deploy as a Node.js web service.
3. **Vercel + Supabase**:
   - If deploying to serverless Vercel, open your Supabase project dashboard, open the **SQL Editor**, and run the provided [`supabase_schema.sql`](./supabase_schema.sql) file.
   - Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables.

---

## 📊 Seeded Tournament Data Overview

### Poule A (Green Identity)
1. **OSPF** (Captain: Oussama Meraihai)
2. **ELITE WOLVES** (Captain: Nessissen Mohamed)
3. **Spider-Feet** (Captain: Saci Mohammed Yasser)
4. **Laghbina FC** (Captain: كابرين محمد لؤي)

### Poule B (Blue Identity)
1. **Rats Team** (Captain: Amine)
2. **PVC** (Captain: Bouguedah Amine)
3. **Nscs** (Captain: Saada Houssem)
4. **Barca** (Captain: Hocine (agent) — *Roster pending confirmation in Admin Dashboard*)

### Poule C (Red Identity)
1. **Zoro** (Captain: رمضاني سيف الدين)
2. **FC deddou** (Captain: Saifi Abdennour)
3. **فريق الرجال** (Captain: عيساوي عبد الهادي أمين)
4. **FC Rono** (Captain: Zinedine Ider)

---

## ⚖️ Format & Discrepancy Flag
- **Visual Fixture Reference (Current Default)**: 12 teams, 3 groups of 4 teams, 18 group matches.
- **Announcement Text**: 11 teams, two groups of 4 and one group of 3 (15 group matches).
- **Resolution**: An interactive warning banner appears in the Admin Dashboard, allowing you to confirm the 12-team schedule or adjust team numbers with one click.

