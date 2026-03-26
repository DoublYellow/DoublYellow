# DoublYellow — Project Handover Document
*Generated March 2026 — feed this document into a new Claude conversation to pick up exactly where we left off.*

---

## 1. WHO YOU ARE TALKING TO

**Toby Laurence**
- Founder & CEO of Double Yellow
- Actor (BBC Radio 4's The Archers), Filmmaker/Director (Plucky Films), Developer
- Email: toby@pluckyfilms.co.uk
- Mac M4 Pro user
- Working folder: `~/Documents/Claude/Scheduled/DoublYellow` (the DoublYellow app repo)

**Chris Smith** — Consultant Developer
- Lead Data Engineer at Lockwood Publishing
- ex-Experian, Improve Digital, Proxama
- 10+ years software/data engineering

---

## 2. WHAT DOUBLEYELLOW IS

A **community-powered parking warden alert app** for iOS and Android. When a user parks on double yellows or somewhere risky, they activate the app. Other nearby users who spot a warden tap once to send a GPS-tagged push notification alert. The alerting user earns gamification points (ranks from "Tipster" to "Lookout Legend"). Users who get warned can gift points or "buy their lookout a coffee."

**Key framing:**
- Not just for essential workers — it's for everyone
- "We can't promise you'll never get a ticket — but with the Double Yellow community on your side, you'll have the best possible chance of avoiding one."
- Reduces fine *risk*, doesn't guarantee avoiding them

**Core stats used in the deck:**
- UK motorists receive 200,000+ fines EVERY DAY
- 76M parking tickets issued annually
- £1.1B+ paid in fines by UK motorists per year
- +24% year-on-year rise in private parking tickets
- 3 million target subscribers: 2M tradespeople, 700K NHS workers, 300K delivery drivers

---

## 3. THE APP — TECHNICAL STATE

**Stack:**
- React Native / Expo (SDK ~54), Expo Router, TypeScript
- Supabase backend (auth, real-time alerts database, RPC functions) — live and operational
- Google AdMob integrated (revenue from first free activation)
- Firebase push notifications (@react-native-firebase)
- react-native-maps (Google Maps)
- 9-tier gamification ranking: Tipster → Lookout Legend
- 4-tier subscription model designed, RevenueCat integration ready but not yet implemented

**Key files:**
- `app.json` — Expo config
- `eas.json` — EAS build config (preview profile already set to `distribution: internal`)
- `package.json` — all dependencies
- Bundle ID: `com.doubleyellow.DoublYellow`
- EAS Project ID: `dd2c79e2-00ab-4c27-b85f-3eaee7165558`

**Build status:**
- ✅ React Native / Expo app built (iOS & Android)
- ✅ Supabase backend live
- ✅ Gamification engine built
- ✅ AdMob integrated
- ✅ Subscription model designed
- ⏳ RevenueCat not yet implemented
- ⏳ App Store submission pending Apple Developer account ($99/yr)
- ✅ Android Play Store build ready

**Next immediate task (before this conversation ended):**
Get a shareable test build out to real users' phones before App Store launch. Plan:

**Android (no account needed):**
```bash
# In terminal, from the DoublYellow project folder:
eas whoami          # check logged into Expo/EAS
eas build --profile preview --platform android
# EAS builds in cloud (~10-15 min), gives download link + QR code
# Anyone with Android can scan & install directly
```

**iOS (needs Apple Developer account — Toby does NOT yet have one):**
- Once enrolled at developer.apple.com ($99/yr), use TestFlight
- `eas build --profile preview --platform ios` then `eas submit`
- Up to 10,000 external testers via email invite

---

## 4. THE INVESTOR PITCH DECK

**File locations:**
- PPTX: `~/Documents/Claude/Scheduled/DoublYellow/DoublYellow_Investor_Deck.pptx`
- PDF: `~/Documents/Claude/Scheduled/DoublYellow/DoublYellow_Investor_Deck.pdf`
- Generator script: `/sessions/[session-id]/deck.js` ← **this resets between sessions, see Section 5**

**12 slides:**
1. Cover — DOUBLE YELLOW, tagline, vertical yellow lines right side
2. The Problem — 200k fines/day, stats for Tradespeople / NHS / Delivery Drivers
3. App Showcase — programmatic phone mockup, "parking warden alert network"
4. The Solution — 5 feature cards (Quick Activation, Real-Time Alerts, Gamification, Fight That Fine, Network Flywheel)
5. Market Size — 3M potential subscribers, TAM bar, ARR projections
6. Business Model — Freemium tiers (Free/£2.99/£5.99/£15.99), PRO highlighted in yellow
7. Revenue Projections — bar chart + 3-year roadmap (£320K–£965K → £3.2M–£9.6M → £19.3M+)
8. Product & Traction — 6 tick-card checklist of what's built
9. Competitive Landscape — comparison table vs Waze/Google, Parking Apps, FB Warden Groups
10. Go-To-Market — London first, 4 sections: Trades, Healthcare, Delivery Drivers, Social Media
11. Team — Toby Laurence (left, large) + Chris Smith (right, equal height), no "What We're Seeking" box
12. The Ask — £150,000, 10% equity, £1.35M pre-money valuation, use of funds breakdown

**Design system:**
- Background: `#0D0D0D`
- Yellow: `#FFD700`
- White: `#FFFFFF`
- Gray: `#888888`
- Dark gray: `#555555`
- Card background: `#1A1A1A`
- Border: `#333333`
- Fonts: Arial Black (headings/numbers), Calibri (body)
- Yellow bar top and bottom of every slide (0.07" height)
- Section labels: top-right, yellow, charSpacing 4, 9pt
- Built with PptxGenJS (Node.js)
- Converted to PDF via LibreOffice using the soffice helper at:
  `/sessions/[session-id]/mnt/.skills/skills/pptx/scripts/office/soffice.py`

---

## 5. REGENERATING THE DECK (CRITICAL)

The `deck.js` script lives in the Cowork VM session folder which **resets between sessions**. The complete, final `deck.js` must be recreated if the session is lost. Below is the **complete working script** — paste this into a new file at `/sessions/[new-session-id]/deck.js` and run `node deck.js` to regenerate.

### How to run:
```bash
# 1. Generate PPTX
node deck.js

# 2. Convert to PDF (use the soffice.py helper — plain soffice CLI is unreliable in the VM)
python3 - << 'EOF'
import sys, shutil
sys.path.insert(0, '/sessions/[SESSION]/mnt/.skills/skills/pptx/scripts')
from office.soffice import run_soffice
shutil.copy2('/sessions/[SESSION]/mnt/DoublYellow/DoublYellow_Investor_Deck.pptx', '/tmp/deck_render.pptx')
r = run_soffice(['--headless','--convert-to','pdf','/tmp/deck_render.pptx','--outdir','/tmp/'], capture_output=True, text=True, timeout=120)
print('RC:', r.returncode)
EOF

# 3. Copy PDF to workspace
cp /tmp/deck_render.pdf /sessions/[SESSION]/mnt/DoublYellow/DoublYellow_Investor_Deck.pdf

# 4. Preview a specific slide (e.g. slide 11)
pdftoppm -r 150 -f 11 -l 11 /tmp/deck_render.pdf /tmp/slide
python3 -c "from PIL import Image; Image.open('/tmp/slide-11.ppm').save('/tmp/slide.jpg','JPEG',quality=92)"
# Then use Read tool on /tmp/slide.jpg
```

---

## 6. COMPLETE deck.js SOURCE

```javascript
const pptxgen = require("/usr/local/lib/node_modules_global/lib/node_modules/pptxgenjs");

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';

// Brand colors (no # prefix)
const BG       = "0D0D0D";
const YELLOW   = "FFD700";
const WHITE    = "FFFFFF";
const GRAY     = "888888";
const DARK_GRAY= "555555";
const CARD_BG  = "1A1A1A";
const BORDER   = "333333";

function makeShadow() { return { type: "outer", blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.3 }; }

function topBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.07, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.555, w: 10, h: 0.07, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
}

function sectionLabel(slide, text) {
  slide.addText(text, { x: 5.0, y: 0.22, w: 4.6, h: 0.28, fontSize: 9, fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 4, margin: 0, align: "right" });
}

function slideTitle(slide, text, y = 0.55) {
  slide.addText(text, { x: 0.6, y, w: 8.8, h: 0.65, fontSize: 26, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
}

function addCard(slide, x, y, w, h, shadow = false) {
  const opts = { x, y, w, h, fill: { color: CARD_BG }, line: { color: BORDER, width: 1 } };
  if (shadow) opts.shadow = makeShadow();
  slide.addShape(pres.shapes.RECTANGLE, opts);
}

function leftAccent(slide, x, y, h) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.055, h, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
}

// ─── SLIDE 1: COVER ──────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  s.addShape(pres.shapes.RECTANGLE, { x: 8.55, y: 0, w: 0.13, h: 5.625, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 8.85, y: 0, w: 0.13, h: 5.625, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addText("DOUBLE", { x: 0.6, y: 0.85, w: 7.7, h: 1.1, fontSize: 88, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
  s.addText("YELLOW", { x: 0.6, y: 1.85, w: 7.7, h: 1.1, fontSize: 88, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y: 3.1, w: 7.6, h: 0.02, fill: { color: BORDER }, line: { color: BORDER, width: 0 } });
  s.addText("The community network app with the power to save millions on parking fines.", { x: 0.6, y: 3.2, w: 7.6, h: 0.55, fontSize: 16, fontFace: "Calibri", color: WHITE, margin: 0 });
  s.addText("Seed Investment Deck  ·  Confidential  ·  March 2026", { x: 0.6, y: 3.85, w: 7.6, h: 0.3, fontSize: 11, fontFace: "Calibri", color: GRAY, margin: 0 });
}

// ─── SLIDE 2: THE PROBLEM ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "THE PROBLEM");
  s.addText([
    { text: "UK motorists receive over 200,000 parking fines ", options: { color: WHITE } },
    { text: "EVERY DAY.", options: { color: YELLOW } },
  ], { x: 0.6, y: 0.5, w: 8.8, h: 0.6, fontSize: 27, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  const macro = [
    { num: "76M",    lbl: "parking tickets\nissued annually",              src: "BritBrief / DVLA 2025" },
    { num: "£1.1B+", lbl: "paid in fines by UK\nmotorists per year",      src: "RAC / Fleet News 2024" },
    { num: "+24%",   lbl: "year-on-year rise in\nprivate parking tickets", src: "GB News / RAC Drive 2025" },
  ];
  macro.forEach((m, i) => {
    const x = 0.5 + i * 3.1;
    addCard(s, x, 1.35, 2.85, 1.25, true);
    s.addText(m.num, { x: x+0.18, y: 1.42, w: 2.5, h: 0.6,  fontSize: 38, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
    s.addText(m.lbl, { x: x+0.18, y: 1.98, w: 2.5, h: 0.38, fontSize: 10, fontFace: "Calibri",    color: WHITE,  margin: 0 });
    s.addText(m.src, { x: x+0.18, y: 2.36, w: 2.5, h: 0.17, fontSize: 7,  fontFace: "Calibri",    color: GRAY,   italic: true, margin: 0 });
  });
  s.addText("But the real burden falls on those who park out of professional necessity — not choice.", { x: 0.55, y: 2.63, w: 8.9, h: 0.28, fontSize: 11.5, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
  const segs = [
    { label: "TRADESPEOPLE",    stat: "£443",   sub: "avg. out-of-pocket cost per\ntradesperson per year",        extras: [{ num: "£119M", txt: "total annual cost to the UK trades sector" }, { num: "£6,000", txt: "lost by some tradespeople in fines alone" }, { num: "81%", txt: "struggle to find legal parking at least weekly" }, { num: "48%", txt: "have turned down jobs due to parking constraints" }] },
    { label: "NHS WORKERS",     stat: "£70M+",  sub: "paid by NHS workers in\nparking fees in 2023/24",          extras: [{ num: "25,000+", txt: "fines from just 17 of England's 300+ NHS trusts" }, { num: "72%", txt: "of hospital workers pay to park at their own workplace" }, { num: "£15,000", txt: "accumulated by one NHS worker across ~200 tickets" }, { num: "1M+", txt: "NHS staff in England who regularly drive to work" }] },
    { label: "DELIVERY DRIVERS", stat: "14.4M", sub: "private parking tickets issued\nto the delivery sector (+13%)", extras: [{ num: "£4.8M", txt: "estimated in private fines across the UK every day" }, { num: "£160", txt: "single PCN can wipe out an entire day's earnings" }, { num: "100 mins", txt: "lost per driver per day searching for parking" }, { num: "28,000", txt: "self-employed Evri couriers exposed — plus Amazon, DPD & more" }] },
  ];
  segs.forEach((seg, i) => {
    const x = 0.5 + i * 3.1; const cardY = 2.97; const cardH = 2.5;
    addCard(s, x, cardY, 2.85, cardH, true);
    leftAccent(s, x, cardY, cardH);
    s.addText(seg.label, { x: x+0.2, y: cardY+0.1,  w: 2.55, h: 0.22, fontSize: 8,  fontFace: "Calibri",    color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
    s.addText(seg.stat,  { x: x+0.2, y: cardY+0.3,  w: 2.55, h: 0.5,  fontSize: 30, fontFace: "Arial Black", color: WHITE,  bold: true, margin: 0 });
    s.addText(seg.sub,   { x: x+0.2, y: cardY+0.78, w: 2.55, h: 0.36, fontSize: 9,  fontFace: "Calibri",    color: GRAY,   margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: x+0.2, y: cardY+1.16, w: 2.45, h: 0.015, fill: { color: BORDER }, line: { color: BORDER, width: 0 } });
    seg.extras.forEach((e, j) => {
      const ey = cardY + 1.24 + j * 0.3;
      s.addText(e.num, { x: x+0.2,  y: ey, w: 0.9,  h: 0.27, fontSize: 9.5, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
      s.addText(e.txt, { x: x+1.12, y: ey, w: 1.72, h: 0.27, fontSize: 8.5, fontFace: "Calibri",     color: WHITE,  margin: 0 });
    });
  });
}

// ─── SLIDE 3: APP SHOWCASE ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  const px = 1.05, py = 0.12, pw = 2.55, ph = 5.38;
  const sx = px + 0.06, sw = pw - 0.12;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: py, w: pw, h: ph, fill: { color: "1C1C1E" }, line: { color: "3A3A3C", width: 1 }, rectRadius: 0.18 });
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: py+0.13, w: sw, h: ph-0.26, fill: { color: BG }, line: { color: BG, width: 0 } });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px+pw/2-0.22, y: py+0.19, w: 0.44, h: 0.12, fill: { color: "000000" }, line: { color: "000000", width: 0 }, rectRadius: 0.06 });
  s.addText("09:16", { x: sx+0.1, y: py+0.16, w: 0.5, h: 0.14, fontSize: 6, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  s.addText("● ▪ ▪  ◈  ▮", { x: sx+sw-0.65, y: py+0.17, w: 0.6, h: 0.12, fontSize: 5, fontFace: "Calibri", color: WHITE, margin: 0 });
  const contentY = py + 0.37;
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: contentY,      w: sw, h: 0.27, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: contentY+0.35, w: sw, h: 0.27, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addText("DOUBLE", { x: sx, y: contentY+0.72, w: sw, h: 0.54, fontSize: 28, fontFace: "Arial Black", color: WHITE, bold: true, align: "center", margin: 0 });
  s.addText("YELLOW", { x: sx, y: contentY+1.2,  w: sw, h: 0.54, fontSize: 28, fontFace: "Arial Black", color: WHITE, bold: true, align: "center", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: contentY+1.82, w: sw, h: 0.27, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: contentY+2.17, w: sw, h: 0.27, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addText("THE COMMUNITY WARDEN ALERT", { x: sx, y: contentY+2.58, w: sw, h: 0.2, fontSize: 5.5, fontFace: "Calibri", color: GRAY, align: "center", charSpacing: 2, margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx+0.18, y: contentY+2.87, w: sw-0.36, h: 0.42, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 }, rectRadius: 0.06 });
  s.addText("SIGN UP", { x: sx+0.18, y: contentY+2.88, w: sw-0.36, h: 0.4, fontSize: 10, fontFace: "Arial Black", color: "0D0D0D", bold: true, align: "center", margin: 0 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx+0.18, y: contentY+3.37, w: sw-0.36, h: 0.42, fill: { color: BG }, line: { color: WHITE, width: 1 }, rectRadius: 0.06 });
  s.addText("LOG IN", { x: sx+0.18, y: contentY+3.38, w: sw-0.36, h: 0.4, fontSize: 10, fontFace: "Arial Black", color: WHITE, bold: true, align: "center", margin: 0 });
  s.addText("CONTINUE AS GUEST", { x: sx, y: contentY+3.9, w: sw, h: 0.18, fontSize: 5.5, fontFace: "Calibri", color: GRAY, align: "center", charSpacing: 2, margin: 0 });
  const tx = px + pw + 0.7; const tw = 9.5 - tx;
  s.addText("The community-powered", { x: tx, y: 1.3,  w: tw, h: 0.9,  fontSize: 28, fontFace: "Arial Black", color: WHITE,  bold: true, margin: 0 });
  s.addText("parking warden",        { x: tx, y: 2.1,  w: tw, h: 0.6,  fontSize: 36, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
  s.addText("alert network.",         { x: tx, y: 2.65, w: tw, h: 0.6,  fontSize: 36, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: tx, y: 3.38, w: tw*0.65, h: 0.025, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addText("Spot it. Share it. Save someone's day.", { x: tx, y: 3.52, w: tw, h: 0.35, fontSize: 13, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
}

// ─── SLIDE 4: THE SOLUTION ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "THE SOLUTION");
  s.addText([
    { text: "When you're out of options,\n", options: { color: WHITE } },
    { text: "Double Yellow", options: { color: YELLOW } },
    { text: " has your back.", options: { color: WHITE } },
  ], { x: 0.6, y: 0.35, w: 8.0, h: 0.9, fontSize: 26, fontFace: "Arial Black", bold: true, margin: 0 });
  s.addText("In-community NHS workers visiting patients, tradesmen dropping off materials, delivery drivers on a tight schedule, removal vans, school pick ups... sometimes quickly parking where you shouldn't is unavoidable.", { x: 0.6, y: 1.25, w: 8.8, h: 0.6, fontSize: 12, fontFace: "Calibri", color: GRAY, bold: false, margin: 0 });
  s.addText("We can't promise you'll never get a ticket — but with the Double Yellow community on your side, you'll have the best possible chance of avoiding one.", { x: 0.6, y: 1.9, w: 8.8, h: 0.35, fontSize: 12, fontFace: "Calibri", color: WHITE, bold: true, margin: 0 });
  const steps = [
    { num: "01", title: "QUICK ACTIVATION",    body: "Park up. Confirm your car's location. Activate. Then let the DY community keep watch for you." },
    { num: "02", title: "REAL-TIME ALERTS",    body: "Other users spot a warden, tap once, confirm location. The alert is GPS tagged and pushed to every activated user within their specified radius. No delays, no apps to open — just a notification and a warning siren." },
    { num: "03", title: "GAMIFICATION ENGINE", body: "Reporting earns points, badges, and ranks — Tipster all the way to Lookout Legend. Those saved can send thank you messages, gift points, or even buy their lookout a coffee. The community that saves together stays together." },
    { num: "04", title: "FIGHT THAT FINE",     body: "Should a user receive a ticket, Double Yellow takes them immediately to helpful advice and linked resources to challenge that fine as effectively as possible." },
    { num: "05", title: "NETWORK FLYWHEEL",    body: "Every new user makes the app more valuable — globally and locally. Once a city reaches critical mass, Double Yellow becomes unstoppable, saving people more and more money on avoided fines." },
  ];
  const cardH = 1.35; const rowGap = 0.12; const row1Y = 2.35;
  const row2Y = row1Y + cardH + rowGap; const marginX = 0.5; const gapX = 0.14;
  const w3 = (9.0 - 2 * gapX) / 3; const w2 = (9.0 - gapX) / 2;
  steps.forEach((step, i) => {
    let x, y, w;
    if (i < 3) { x = marginX + i * (w3 + gapX); y = row1Y; w = w3; }
    else        { x = marginX + (i - 3) * (w2 + gapX); y = row2Y; w = w2; }
    addCard(s, x, y, w, cardH, true);
    s.addText(step.num,   { x: x+0.14, y: y+0.13, w: 0.38,   h: 0.30,       fontSize: 11, fontFace: "Arial Black", color: YELLOW, bold: true, align: "left", margin: 0 });
    s.addText(step.title, { x: x+0.55, y: y+0.13, w: w-0.68, h: 0.28,       fontSize: 9,  fontFace: "Calibri",    color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
    s.addText(step.body,  { x: x+0.14, y: y+0.48, w: w-0.28, h: cardH-0.55, fontSize: 9,  fontFace: "Calibri",    color: WHITE,  margin: 0, valign: "top" });
  });
}

// ─── SLIDE 5: MARKET SIZE ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "MARKET SIZE");
  s.addText([
    { text: "3 initial target demographics —\n", options: { color: WHITE } },
    { text: "3 million", options: { color: YELLOW } },
    { text: " potential subscribers.", options: { color: WHITE } },
  ], { x: 0.6, y: 0.35, w: 8.8, h: 0.85, fontSize: 26, fontFace: "Arial Black", bold: true, margin: 0 });
  s.addText("3 million tradies, healthcare workers and delivery drivers get slammed by parking fines every day, but our broader market extends across all industries and individuals that own a vehicle.", { x: 0.6, y: 1.28, w: 8.8, h: 0.38, fontSize: 11, fontFace: "Calibri", color: GRAY, margin: 0 });
  const markets = [
    { label: "TRADESPEOPLE",       num: "2,000,000", sub: "UK construction &\nskilled trades workforce",         src: "ONS / Statista 2024" },
    { label: "HEALTHCARE WORKERS", num: "700,000",   sub: "NHS staff who regularly\nface street parking risk",   src: "NHS Digital 2024 / ONS" },
    { label: "DELIVERY DRIVERS",   num: "300,000",   sub: "Self-employed couriers &\ngig economy drivers",       src: "Institute of Couriers 2024" },
  ];
  const cardY = 1.78; const cardH = 1.55;
  markets.forEach((m, i) => {
    const x = 0.5 + i * 3.1;
    addCard(s, x, cardY, 2.85, cardH, true);
    leftAccent(s, x, cardY, cardH);
    s.addText(m.label, { x: x+0.2, y: cardY+0.1,  w: 2.55, h: 0.22, fontSize: 8,  fontFace: "Calibri",    color: YELLOW,    bold: true, charSpacing: 2, margin: 0 });
    s.addText(m.num,   { x: x+0.2, y: cardY+0.3,  w: 2.55, h: 0.55, fontSize: 26, fontFace: "Arial Black", color: WHITE,     bold: true, margin: 0 });
    s.addText(m.sub,   { x: x+0.2, y: cardY+0.85, w: 2.55, h: 0.4,  fontSize: 10, fontFace: "Calibri",    color: GRAY,      margin: 0 });
    s.addText(m.src,   { x: x+0.2, y: cardY+1.3,  w: 2.55, h: 0.2,  fontSize: 7,  fontFace: "Calibri",    color: DARK_GRAY, italic: true, margin: 0 });
  });
  const tamY = cardY + cardH + 0.12;
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: tamY, w: 9, h: 0.65, fill: { color: YELLOW }, line: { color: YELLOW, width: 0 } });
  s.addText([
    { text: "Total core addressable market: ", options: { bold: false } },
    { text: "3,000,000 potential subscribers", options: { bold: true } },
    { text: " — before counting 34M general UK drivers, B2B fleet accounts, or international expansion.", options: { bold: false } },
  ], { x: 0.65, y: tamY+0.05, w: 8.7, h: 0.55, fontSize: 12, fontFace: "Calibri", color: "0D0D0D", margin: 0 });
  s.addText("At 10% penetration of the professional market: £19.2M ARR.  ·  At 30%: £57.7M ARR.", { x: 0.6, y: tamY+0.78, w: 8.8, h: 0.35, fontSize: 13, fontFace: "Calibri", color: WHITE, bold: true, margin: 0 });
  s.addText("Searching for parking costs the UK economy an estimated £23.3 billion per year in wasted time alone (INRIX).", { x: 0.6, y: tamY+1.18, w: 8.8, h: 0.28, fontSize: 10, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
}

// ─── SLIDE 6: BUSINESS MODEL ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "BUSINESS MODEL");
  slideTitle(s, "Freemium subscription. One avoided fine pays for the year.");
  const tiers = [
    { tier: "FREE",      price: "£0 / month",    annual: "£0",      includes: "Unlimited activations, ad-supported",                   highlight: false },
    { tier: "BASIC",     price: "£2.99 / month", annual: "£35.88",  includes: "8 activations/month, ad-free",                          highlight: false },
    { tier: "PRO  ★",   price: "£5.99 / month", annual: "£71.88",  includes: "20 activations/month, ad-free, priority alerts",        highlight: true  },
    { tier: "UNLIMITED", price: "£15.99 / month",annual: "£191.88", includes: "Unlimited activations, ad-free, all features",         highlight: false },
  ];
  const rowStart = 1.55; const rowH = 0.54; const rowStep = 0.60;
  tiers.forEach((t, i) => {
    const y = rowStart + i * rowStep;
    const bg = t.highlight ? YELLOW : CARD_BG; const brd = t.highlight ? YELLOW : BORDER;
    const tc = t.highlight ? "0D0D0D" : WHITE;  const lc  = t.highlight ? "0D0D0D" : YELLOW;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: rowH, fill: { color: bg }, line: { color: brd, width: 1 } });
    s.addText(t.tier,     { x: 0.7,  y: y+0.13, w: 1.7, h: 0.28, fontSize: 10, fontFace: "Calibri",    color: lc, bold: true, charSpacing: 1, margin: 0 });
    s.addText(t.price,    { x: 2.55, y: y+0.11, w: 2.2, h: 0.32, fontSize: 14, fontFace: "Arial Black", color: tc, bold: true, margin: 0 });
    s.addText(t.annual + " / year", { x: 4.9, y: y+0.16, w: 1.4, h: 0.24, fontSize: 9, fontFace: "Calibri", color: t.highlight ? "0D0D0D" : DARK_GRAY, italic: true, margin: 0 });
    s.addText(t.includes, { x: 6.45, y: y+0.14, w: 2.9, h: 0.28, fontSize: 9.5, fontFace: "Calibri", color: tc, margin: 0 });
  });
  const afterRows = rowStart + 4 * rowStep + 0.08;
  s.addText("Blended ARPU: £5.34/month  ·  55% Basic / 35% Pro / 10% Unlimited subscriber mix", { x: 0.6, y: afterRows, w: 8.8, h: 0.27, fontSize: 10, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
  const streams = [
    { t: "AD REVENUE",           b: "AdMob integrated in free tier.\nRevenue from every activation." },
    { t: "B2B FLEET ACCOUNTS",   b: "£20–50/month per company\nwith 10+ employees." },
    { t: "PEER-TO-PEER TIPPING", b: "\"Buy a Coffee\" between\ndrivers — platform takes a cut." },
  ];
  const streamsY = afterRows + 0.35;
  streams.forEach((st, i) => {
    const x = 0.5 + i * 3.1;
    addCard(s, x, streamsY, 2.85, 0.88);
    s.addText(st.t, { x: x+0.18, y: streamsY+0.1,  w: 2.55, h: 0.22, fontSize: 8,   fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
    s.addText(st.b, { x: x+0.18, y: streamsY+0.35, w: 2.55, h: 0.45, fontSize: 9.5, fontFace: "Calibri", color: GRAY,   margin: 0 });
  });
}

// ─── SLIDE 7: REVENUE PROJECTIONS ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "REVENUE PROJECTIONS");
  s.addText("Three-year trajectory — London-first, then UK-wide, and beyond!", { x: 0.6, y: 0.42, w: 8.8, h: 0.95, fontSize: 26, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  s.addChart(pres.charts.BAR, [{ name: "Annual Revenue (£M)", labels: ["Y1 Low", "Y1 High", "Y2 Low", "Y2 High", "Y3"], values: [0.32, 0.965, 3.2, 9.6, 19.3] }], {
    x: 0.5, y: 1.52, w: 5.6, h: 3.3, barDir: "col", chartColors: [YELLOW],
    chartArea: { fill: { color: "111111" }, roundedCorners: false },
    catAxisLabelColor: "888888", valAxisLabelColor: "888888",
    valGridLine: { color: "333333", size: 0.5 }, catGridLine: { style: "none" },
    showValue: false, showLegend: false, showTitle: false,
  });
  const roadmap = [
    { year: "YEAR 1", rev: "£320K–£965K",  subs: "5K–15K subscribers",   key: "London launch; tradespeople, NHS & delivery drivers simultaneously; AdMob revenue" },
    { year: "YEAR 2", rev: "£3.2M–£9.6M", subs: "50K–150K subscribers", key: "Major UK cities; network flywheel accelerates; B2B fleet pilot" },
    { year: "YEAR 3", rev: "£19.3M+",      subs: "300K+ subscribers",    key: "10% core market; B2B live; general public adoption; international scoping" },
  ];
  roadmap.forEach((r, i) => {
    const y = 1.52 + i * 1.1;
    addCard(s, 6.3, y, 3.2, 1.0, true);
    leftAccent(s, 6.3, y, 1.0);
    s.addText(r.year, { x: 6.46, y: y+0.08, w: 2.9, h: 0.22, fontSize: 9,  fontFace: "Calibri",    color: YELLOW,    bold: true, charSpacing: 2, margin: 0 });
    s.addText(r.rev,  { x: 6.46, y: y+0.28, w: 2.9, h: 0.35, fontSize: 20, fontFace: "Arial Black", color: WHITE,     bold: true, margin: 0 });
    s.addText(r.subs, { x: 6.46, y: y+0.62, w: 2.9, h: 0.18, fontSize: 9,  fontFace: "Calibri",    color: GRAY,      margin: 0 });
    s.addText(r.key,  { x: 6.46, y: y+0.80, w: 2.9, h: 0.16, fontSize: 7,  fontFace: "Calibri",    color: DARK_GRAY, italic: true, margin: 0 });
  });
  s.addText("Conservative projections from 3M core professional subscribers only (tradespeople, NHS & delivery drivers). General public, B2B fleet, and ad revenue represent additional upside not modelled here.", { x: 0.5, y: 5.32, w: 9, h: 0.2, fontSize: 7.5, fontFace: "Calibri", color: DARK_GRAY, italic: true, margin: 0 });
}

// ─── SLIDE 8: PRODUCT & TRACTION ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "PRODUCT & TRACTION");
  s.addText("Working prototype. Live on iOS & Android. Ready to scale.", { x: 0.6, y: 0.38, w: 8.8, h: 0.95, fontSize: 26, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  const items = [
    { done: true,  title: "React Native / Expo App Built",   body: "Cross-platform iOS & Android app with real-time warden alerts, interactive map, community feed, and push notifications." },
    { done: true,  title: "Supabase Backend Live",           body: "Full auth, user profiles, real-time alert database, and RPC functions deployed and operational." },
    { done: true,  title: "Gamification Engine",             body: "9-tier ranking system (Tipster → Lookout Legend), points economy, peer-to-peer gifting, and thanks notifications." },
    { done: true,  title: "AdMob Integrated",                body: "Google AdMob already integrated — revenue-generating from the very first free user activation." },
    { done: true,  title: "Subscription Model Designed",     body: "4-tier pricing (Free/Basic/Pro/Unlimited) designed and ready for RevenueCat implementation." },
    { done: false, title: "App Store & Play Store Launch",   body: "Pending Apple Developer account. Android Play Store build ready — both stores launchable simultaneously." },
  ];
  const cardH = 0.95; const cardStep = 1.05; const cardsStartY = 1.48;
  items.forEach((item, i) => {
    const col = i % 2; const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8; const y = cardsStartY + row * cardStep;
    addCard(s, x, y, 4.4, cardH, true);
    const iconColor = item.done ? "00C853" : YELLOW;
    const icon = item.done ? "✓" : "›";
    const circleY = y + (cardH - 0.38) / 2;
    s.addShape(pres.shapes.OVAL, { x: x+0.18, y: circleY, w: 0.38, h: 0.38, fill: { color: item.done ? "001A00" : "1A1400" }, line: { color: item.done ? "00C853" : YELLOW, width: 1 } });
    s.addText(icon,       { x: x+0.18, y: circleY+0.01, w: 0.38, h: 0.36, fontSize: 12,   fontFace: "Arial Black", color: iconColor, bold: true, align: "center", margin: 0 });
    s.addText(item.title, { x: x+0.70, y: y+0.1,        w: 3.55, h: 0.24, fontSize: 10.5, fontFace: "Calibri",    color: WHITE,     bold: true, margin: 0 });
    s.addText(item.body,  { x: x+0.70, y: y+0.36,       w: 3.55, h: 0.52, fontSize: 9.5,  fontFace: "Calibri",    color: GRAY,      margin: 0, valign: "top" });
  });
  s.addText("Built by a single founder as a production-ready prototype — demonstrating lean execution from concept to working app.", { x: 0.5, y: 5.32, w: 9, h: 0.2, fontSize: 8, fontFace: "Calibri", color: DARK_GRAY, italic: true, margin: 0 });
}

// ─── SLIDE 9: COMPETITIVE LANDSCAPE ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "COMPETITIVE LANDSCAPE");
  s.addText("No one is doing what we do.", { x: 0.6, y: 0.5, w: 8.8, h: 0.65, fontSize: 30, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  s.addText("Warden alerts exist informally in Facebook groups — unstructured, slow, and impossible to monetise. Double Yellow turns that behaviour into a scalable product.", { x: 0.6, y: 1.2, w: 8.8, h: 0.42, fontSize: 11.5, fontFace: "Calibri", color: GRAY, margin: 0 });
  const tData = [
    [ { text: "",                options: { bold: true, fontSize: 9, color: WHITE,    fill: { color: "222222" }, align: "left"   } }, { text: "Double Yellow",   options: { bold: true, fontSize: 9, color: "0D0D0D", fill: { color: YELLOW   }, align: "center" } }, { text: "Waze / Google",  options: { bold: true, fontSize: 9, color: WHITE,    fill: { color: "222222" }, align: "center" } }, { text: "Parking Apps",    options: { bold: true, fontSize: 9, color: WHITE,    fill: { color: "222222" }, align: "center" } }, { text: "FB Warden Groups", options: { bold: true, fontSize: 9, color: WHITE,    fill: { color: "222222" }, align: "center" } } ],
    [ { text: "Real-time warden alerts",              options: { fontSize: 10, color: WHITE,    fill: { color: CARD_BG  }, align: "left"   } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: "111A00" }, align: "center", bold: true } }, { text: "✗", options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } }, { text: "Slow", options: { fontSize: 10, color: "888888", fill: { color: CARD_BG  }, align: "center", italic: true } } ],
    [ { text: "Push notifications to nearby drivers", options: { fontSize: 10, color: WHITE,    fill: { color: "111111" }, align: "left"   } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: "111800" }, align: "center", bold: true } }, { text: "✗", options: { fontSize: 14, color: "666666", fill: { color: "111111" }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: "111111" }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: "111111" }, align: "center" } } ],
    [ { text: "Gamification & community rewards",     options: { fontSize: 10, color: WHITE,    fill: { color: CARD_BG  }, align: "left"   } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: "111A00" }, align: "center", bold: true } }, { text: "✗", options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } } ],
    [ { text: "Built for van drivers & tradespeople", options: { fontSize: 10, color: WHITE,    fill: { color: "111111" }, align: "left"   } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: "111800" }, align: "center", bold: true } }, { text: "~", options: { fontSize: 14, color: "888888", fill: { color: "111111" }, align: "center" } }, { text: "~",    options: { fontSize: 14, color: "888888", fill: { color: "111111" }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: "111111" }, align: "center" } } ],
    [ { text: "Network effect flywheel",              options: { fontSize: 10, color: WHITE,    fill: { color: CARD_BG  }, align: "left"   } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: "111A00" }, align: "center", bold: true } }, { text: "✓", options: { fontSize: 14, color: "00C853", fill: { color: CARD_BG  }, align: "center", bold: true } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } }, { text: "✗",    options: { fontSize: 14, color: "666666", fill: { color: CARD_BG  }, align: "center" } } ],
  ];
  s.addTable(tData, { x: 0.4, y: 1.72, w: 9.2, h: 3.35, colW: [3.0, 1.35, 1.35, 1.35, 1.75], border: { pt: 1, color: "2A2A2A" }, rowH: 0.55 });
}

// ─── SLIDE 10: GO-TO-MARKET ───────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "GO-TO-MARKET");
  s.addText("London First.\nSeed to critical mass. Then expand.", { x: 0.6, y: 0.35, w: 8.8, h: 1.0, fontSize: 24, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  const phases = [
    { phase: "TRADES",           items: ["Target London tradespeople via Checkatrade (650K+ registered), MyBuilder & Rated People", "Outreach to trades Facebook Groups & subreddits — parking complaints are endemic there", "Word-of-mouth flywheel: one tradesperson avoids a fine → colleague downloads the same day"] },
    { phase: "HEALTHCARE",       items: ["GMB Union, UNISON & RCN each represent hundreds of thousands of NHS workers — ready-made channels", "NHS trust intranet promotions and staff communications for zero-cost adoption at scale"] },
    { phase: "DELIVERY DRIVERS", items: ["Evri (28K couriers), Amazon Flex, DPD — driver communities on Facebook & Reddit spread fast", "B2B fleet pricing: trade companies with 10+ vans on group accounts at £20–50/month", "International scoping — parking enforcement is a universal problem in every major city globally"] },
    { phase: "SOCIAL MEDIA",     items: ["Instagram, TikTok, Facebook, Twitter — short videos & stunts to drive engagement and downloads", "Channel collabs with trade & lifestyle creators — On The Tools and similar communities"] },
  ];
  const cardH = 0.82; const cardStep = 0.92; const startY = 1.45;
  phases.forEach((ph, i) => {
    const y = startY + i * cardStep;
    addCard(s, 0.5, y, 9, cardH, true);
    leftAccent(s, 0.5, y, cardH);
    s.addText(ph.phase, { x: 0.7, y: y+0.07, w: 8.5, h: 0.22, fontSize: 9.5, fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
    const bulletText = ph.items.map((item, j) => ({ text: item, options: { bullet: true, breakLine: j < ph.items.length - 1 } }));
    s.addText(bulletText, { x: 0.7, y: y+0.3, w: 8.5, h: cardH-0.35, fontSize: 9.5, fontFace: "Calibri", color: WHITE, margin: 0, valign: "top" });
  });
}

// ─── SLIDE 11: TEAM ───────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "TEAM");
  s.addText([
    { text: "Creative Vision. Expertise.\n", options: { color: WHITE } },
    { text: "Meet the team.", options: { color: YELLOW } },
  ], { x: 0.6, y: 0.30, w: 8.8, h: 0.92, fontSize: 26, fontFace: "Arial Black", bold: true, margin: 0 });
  // Toby card
  addCard(s, 0.5, 1.35, 5.5, 3.08, true);
  s.addShape(pres.shapes.OVAL, { x: 0.72, y: 1.52, w: 0.62, h: 0.62, fill: { color: "222222" }, line: { color: YELLOW, width: 2 } });
  s.addText("T", { x: 0.72, y: 1.54, w: 0.62, h: 0.57, fontSize: 18, fontFace: "Arial Black", color: YELLOW, bold: true, align: "center", margin: 0 });
  s.addText("FOUNDER & CEO", { x: 1.45, y: 1.52, w: 4.35, h: 0.22, fontSize: 9, fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
  s.addText("Toby Laurence", { x: 1.45, y: 1.73, w: 4.35, h: 0.38, fontSize: 22, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  s.addText("Actor (BBC Radio 4's The Archers) · Founder & Director, Plucky Films · Developer, Double Yellow", { x: 1.45, y: 2.12, w: 4.35, h: 0.30, fontSize: 9, fontFace: "Calibri", color: YELLOW, bold: false, italic: true, margin: 0 });
  s.addText("With over 10 years as a professional actor — including BBC Radio 4's The Archers — and a career directing and producing video content for brands and businesses, Toby brings a genuine creative instinct to every problem he tackles. As a business owner with a young family, he's felt firsthand the financial sting of unexpected fines and costs, especially during uncertain times. That personal experience is what drives him: getting Double Yellow to market and genuinely saving people money is an all-consuming passion.", { x: 0.72, y: 2.50, w: 5.1, h: 1.70, fontSize: 9.5, fontFace: "Calibri", color: GRAY, margin: 0, valign: "top" });
  s.addText("toby@pluckyfilms.co.uk", { x: 0.72, y: 4.22, w: 5.1, h: 0.18, fontSize: 9, fontFace: "Calibri", color: YELLOW, margin: 0 });
  // Chris card
  addCard(s, 6.2, 1.35, 3.3, 3.08, true);
  s.addShape(pres.shapes.OVAL, { x: 6.38, y: 1.52, w: 0.62, h: 0.62, fill: { color: "222222" }, line: { color: YELLOW, width: 2 } });
  s.addText("C", { x: 6.38, y: 1.54, w: 0.62, h: 0.57, fontSize: 18, fontFace: "Arial Black", color: YELLOW, bold: true, align: "center", margin: 0 });
  s.addText("CONSULTANT DEVELOPER", { x: 7.12, y: 1.52, w: 2.23, h: 0.22, fontSize: 8, fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 2, margin: 0 });
  s.addText("Chris Smith", { x: 7.12, y: 1.73, w: 2.23, h: 0.38, fontSize: 22, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  s.addText("Lead Data Engineer, Lockwood Publishing · ex-Experian · Improve Digital · Proxama", { x: 7.12, y: 2.13, w: 2.23, h: 0.30, fontSize: 9, fontFace: "Calibri", color: YELLOW, bold: false, italic: true, margin: 0 });
  s.addText("Chris brings over a decade of hands-on experience building and scaling data systems at major organisations including Experian, Improve Digital, and Proxama. Now Lead Data Engineer at Lockwood Publishing, he has deep expertise in cloud architecture, backend engineering, and delivering robust platforms that perform under pressure.\n\nChris provides the engineering rigour behind Double Yellow — ensuring the platform is built to last, built to scale, and ready for whatever growth looks like.", { x: 6.38, y: 2.50, w: 2.95, h: 1.72, fontSize: 9.5, fontFace: "Calibri", color: GRAY, margin: 0, valign: "top" });
  s.addText("Open to first senior hire (Head of Growth or CTO) once funded. Advisors with sector expertise always welcome.", { x: 0.5, y: 4.50, w: 9, h: 0.28, fontSize: 9, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
}

// ─── SLIDE 12: THE ASK ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: BG };
  topBar(s);
  sectionLabel(s, "THE ASK");
  s.addText("Seed round to launch, validate, and scale.", { x: 0.6, y: 0.5, w: 8.8, h: 0.65, fontSize: 26, fontFace: "Arial Black", color: WHITE, bold: true, margin: 0 });
  addCard(s, 0.5, 1.28, 9, 1.45, true);
  s.addText("£150,000", { x: 0.85, y: 1.38, w: 5, h: 1.0, fontSize: 56, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
  s.addText("Angel seed round\n10% equity  ·  £1.35M pre-money valuation", { x: 5.8, y: 1.58, w: 3.5, h: 0.75, fontSize: 12, fontFace: "Calibri", color: GRAY, italic: true, margin: 0 });
  s.addText("USE OF FUNDS", { x: 0.6, y: 2.88, w: 4, h: 0.28, fontSize: 9, fontFace: "Calibri", color: YELLOW, bold: true, charSpacing: 4, margin: 0 });
  const funds = [
    { pct: "~53%", item: "Marketing & Community Seeding",      note: "Checkatrade, trades groups, NHS & delivery outreach", amt: "£80k" },
    { pct: "~21%", item: "Product Development",                note: "Subscriptions (RevenueCat), premium features, UX polish", amt: "£32k" },
    { pct: "~20%", item: "Operations & Legal",                 note: "12 months runway, company structure, admin", amt: "£30k" },
    { pct: " ~5%", item: "Apple Developer & App Store Launch", note: "iOS push notifications, live App Store distribution", amt: "£8k" },
  ];
  funds.forEach((f, i) => {
    const y = 3.2 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.44, fill: { color: i % 2 === 0 ? "141414" : CARD_BG }, line: { color: BORDER, width: 1 } });
    s.addText(f.pct,  { x: 0.65, y: y+0.09, w: 0.9,  h: 0.28, fontSize: 13, fontFace: "Arial Black", color: YELLOW, bold: true, margin: 0 });
    s.addText(f.item, { x: 1.7,  y: y+0.1,  w: 4.2,  h: 0.27, fontSize: 11, fontFace: "Calibri",    color: WHITE,  margin: 0 });
    s.addText(f.note, { x: 6.0,  y: y+0.11, w: 2.4,  h: 0.25, fontSize: 9.5,fontFace: "Calibri",    color: GRAY,   italic: true, margin: 0 });
    s.addText(f.amt,  { x: 8.5,  y: y+0.09, w: 0.85, h: 0.28, fontSize: 12, fontFace: "Arial Black", color: YELLOW, bold: true, align: "right", margin: 0 });
  });
  s.addText("toby@pluckyfilms.co.uk  ·  Double Yellow  ·  Confidential  ·  March 2026", { x: 0.5, y: 5.3, w: 9, h: 0.2, fontSize: 8, fontFace: "Calibri", color: DARK_GRAY, align: "center", margin: 0 });
}

// Write file
pres.writeFile({ fileName: "/sessions/beautiful-jolly-ride/mnt/DoublYellow/DoublYellow_Investor_Deck.pptx" })
  .then(() => console.log("DONE"))
  .catch(e => { console.error("ERROR:", e); process.exit(1); });
```

---

## 7. IMMEDIATE NEXT TASKS (morning)

### Priority 1 — Get Android test build out
```bash
cd [path to DoublYellow folder]
eas whoami                                        # confirm logged in
eas build --profile preview --platform android   # ~10-15 min cloud build
# → get QR code / download link to share with testers
```

### Priority 2 — iOS distribution (when ready)
- Enrol at developer.apple.com ($99/yr)
- `eas build --profile preview --platform ios`
- `eas submit` → TestFlight → invite testers by email

### Priority 3 — RevenueCat
- Subscription model is designed (4 tiers), RevenueCat not yet wired in
- Need to implement in-app purchases before App Store submission

---

## 8. USEFUL CONTEXT FOR A NEW CLAUDE SESSION

Paste this whole document and say:

> "This is the DoublYellow project handover. I'm Toby. Pick up from where we left off — the deck is done, the next task is getting an Android test build out using EAS. Walk me through it."

Claude will have everything it needs.
