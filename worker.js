// Cloudflare Worker for BONTEN eSports forms.
//   POST /api/submit  -> Trials form
//   POST /api/join    -> Team join form
// Everything else (index.html, join.html, logo.png) is served as static assets.
// Secrets needed: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

const ROLES = ['Primary Rusher','Secondary Rusher','IGL (In-Game Leader)','Sniper','Support','Nader (Grenadier)','Flanker','Fragger','Assaulter','Scout','Anchor','Flex Player'];
const TEAMS = Array.from({ length: 10 }, (_, i) => 'Team ' + (i + 1));
const GAME_EXP = ['Less than 1 year','1 year','2 years','3 years','4 years','5 years','6+ years'];
const RAM = ['4 GB','6 GB','8 GB','12 GB'];
const AGE_DOCS = ['School/College ID','Aadhaar card'];
const ESPORTS_EXP = ['No experience','Less than 1 year','1 year','2 years','3 years','4+ years'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

// Fields shared by both forms
function readCommon(d) {
  return {
    realName: str(d.realName, 60),
    ign: str(d.ign, 40),
    uid: str(d.uid, 14),
    age: str(d.age, 3),
    team: str(d.team, 10),
    whatsapp: str(d.whatsapp, 16),
    insta: str(d.insta, 40),
    discord: str(d.discord, 40),
    roles: Array.isArray(d.roles) ? d.roles.filter((r) => ROLES.includes(r)) : []
  };
}

function commonValid(c, teamOptional) {
  const age = Number(c.age);
  return (
    c.realName.length >= 2 && c.ign.length >= 1 &&
    /^\d{8,14}$/.test(c.uid) &&
    Number.isInteger(age) && age >= 5 && age <= 60 &&
    ((teamOptional && c.team === '') || TEAMS.includes(c.team)) &&
    c.roles.length >= 1 && c.roles.length <= 2 &&
    /^\+?\d{10,14}$/.test(c.whatsapp.replace(/[\s-]/g, '')) &&
    c.insta.length >= 2 && c.discord.length >= 2
  );
}

// TELEGRAM_CHAT_ID me 1 se 5 chat id daal sakte ho, comma se alag karke.
// Example: 123456789,-1001234567890,987654321
function getChatIds(env) {
  return String(env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
}

async function sendTelegram(env, text) {
  const ids = getChatIds(env);
  if (!env.TELEGRAM_BOT_TOKEN || ids.length === 0) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }
  const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  const results = await Promise.allSettled(
    ids.map((id) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: id,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })
    )
  );
  // Kam se kam ek chat me gaya to form sent maana jayega
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  if (sent === 0) return json({ ok: false, error: 'Telegram error' }, 502);
  return json({ ok: true });
}

// ---------- Telegram message helpers ----------
const line = (label, value) => '<b>' + label + ':</b> ' + value + '\n';
const waLink = (n) => {
  let d = String(n).replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  return '<a href="https://wa.me/' + d + '">' + esc(n) + '</a>';
};
const instaLink = (h) => {
  const u = String(h).replace(/^@/, '').replace(/^.*instagram\.com\//i, '').split(/[/?]/)[0].replace(/[^A-Za-z0-9._]/g, '');
  return u ? '<a href="https://instagram.com/' + u + '">@' + esc(u) + '</a>' : esc(h);
};
const stamp = () =>
  new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';

function playerBlock(c) {
  return (
    '\n<b>PLAYER</b>\n' +
    line('Name', esc(c.realName)) +
    line('In-game name', esc(c.ign)) +
    line('UID', '<code>' + esc(c.uid) + '</code>') +
    line('Age', esc(c.age))
  );
}
function contactBlock(c) {
  return (
    '\n<b>CONTACT</b>\n' +
    line('WhatsApp', waLink(c.whatsapp)) +
    line('Instagram', instaLink(c.insta)) +
    line('Discord', esc(c.discord))
  );
}

// ---------- Trials form ----------
async function handleTrials(request, env) {
  const d = await readBody(request);
  if (!d) return json({ ok: false, error: 'Bad request' }, 400);
  if (d.website) return json({ ok: true }); // honeypot

  const c = readCommon(d);
  const igl = str(d.igl, 40);
  if (!commonValid(c) || igl.length < 1) return json({ ok: false, error: 'Invalid data' }, 400);

  const text =
    '<b>NEW TRIALS FORM</b>\nBONTEN eSports\n' +
    playerBlock(c) +
    '\n<b>TEAM AND ROLE</b>\n' +
    line('Team', esc(c.team)) +
    line('Role', esc(c.roles.join(', '))) +
    line('IGL', esc(igl)) +
    contactBlock(c) +
    '\n' + stamp();

  return sendTelegram(env, text);
}

// ---------- Team join form ----------
async function handleJoin(request, env) {
  const d = await readBody(request);
  if (!d) return json({ ok: false, error: 'Bad request' }, 400);
  if (d.website) return json({ ok: true }); // honeypot

  const c = readCommon(d);
  const device = str(d.device, 60);
  const gameExp = str(d.gameExp, 30);
  const esportsExp = str(d.esportsExp, 30);
  const ageVerified = str(d.ageVerified, 3);
  const ram = str(d.ram, 6);
  const ageDoc = ageVerified === 'Yes' ? str(d.ageDoc, 30) : '';

  const valid =
    commonValid(c, true) &&
    device.length >= 2 &&
    RAM.includes(ram) &&
    GAME_EXP.includes(gameExp) &&
    ESPORTS_EXP.includes(esportsExp) &&
    (ageVerified === 'Yes' || ageVerified === 'No') &&
    (ageVerified === 'No' || AGE_DOCS.includes(ageDoc)) &&
    d.agree === true;

  if (!valid) return json({ ok: false, error: 'Invalid data' }, 400);

  const text =
    '<b>NEW TEAM JOIN FORM</b>\nBONTEN eSports\n' +
    playerBlock(c) +
    line('Device', esc(device)) +
    line('RAM', esc(ram)) +
    '\n<b>TEAM AND ROLE</b>\n' +
    line('Team', c.team ? esc(c.team) : 'Skipped (not added to any group)') +
    line('Role', esc(c.roles.join(', '))) +
    '\n<b>EXPERIENCE</b>\n' +
    line('Game', esc(gameExp)) +
    line('eSports', esc(esportsExp)) +
    contactBlock(c) +
    '\n<b>CONFIRMATION</b>\n' +
    line('Age verified', ageVerified === 'Yes' ? 'Yes (' + esc(ageDoc) + ')' : 'No, DOB to be verified by moderator') +
    line('Conduct agreement', 'Accepted') +
    '\n' + stamp();

  return sendTelegram(env, text);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/submit' || pathname === '/api/join') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
      return pathname === '/api/join' ? handleJoin(request, env) : handleTrials(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
