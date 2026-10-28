// Cloudflare Worker for BONTEN eSports forms.
//   POST /api/submit  -> Trials form
//   POST /api/join    -> Team join form
// Everything else (index.html, join.html, logo.png) is served as static assets.
// Secrets needed: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

const ROLES = ['Primary Rusher','Secondary Rusher','IGL (In-Game Leader)','Sniper','Support','Nader (Grenadier)','Flanker','Fragger','Assaulter','Scout','Anchor','Flex Player'];
const TEAMS = Array.from({ length: 10 }, (_, i) => 'Team ' + (i + 1));
const GAME_EXP = ['Less than 1 year','1 year','2 years','3 years','4 years','5 years','6+ years'];
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

function commonValid(c) {
  const age = Number(c.age);
  return (
    c.realName.length >= 2 && c.ign.length >= 1 &&
    /^\d{8,14}$/.test(c.uid) &&
    Number.isInteger(age) && age >= 5 && age <= 60 &&
    TEAMS.includes(c.team) &&
    c.roles.length >= 1 && c.roles.length <= 2 &&
    /^\+?\d{10,14}$/.test(c.whatsapp.replace(/[\s-]/g, '')) &&
    c.insta.length >= 2 && c.discord.length >= 2
  );
}

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }
  const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!res.ok) return json({ ok: false, error: 'Telegram error' }, 502);
  return json({ ok: true });
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
    '<b>New Trials Form - BONTEN eSports</b>\n\n' +
    'Real name: ' + esc(c.realName) + '\n' +
    'In-game name: ' + esc(c.ign) + '\n' +
    'UID: <code>' + esc(c.uid) + '</code>\n' +
    'Age: ' + esc(c.age) + '\n' +
    'Team: ' + esc(c.team) + '\n' +
    'Role: ' + esc(c.roles.join(', ')) + '\n' +
    'IGL: ' + esc(igl) + '\n' +
    'WhatsApp: ' + esc(c.whatsapp) + '\n' +
    'Instagram: ' + esc(c.insta) + '\n' +
    'Discord: ' + esc(c.discord);

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

  const valid =
    commonValid(c) &&
    device.length >= 2 &&
    GAME_EXP.includes(gameExp) &&
    ESPORTS_EXP.includes(esportsExp) &&
    (ageVerified === 'Yes' || ageVerified === 'No') &&
    d.agree === true;

  if (!valid) return json({ ok: false, error: 'Invalid data' }, 400);

  const text =
    '<b>New Team Join Form - BONTEN eSports</b>\n\n' +
    'Real name: ' + esc(c.realName) + '\n' +
    'In-game name: ' + esc(c.ign) + '\n' +
    'UID: <code>' + esc(c.uid) + '</code>\n' +
    'Age: ' + esc(c.age) + '\n' +
    'Device: ' + esc(device) + '\n' +
    'Team: ' + esc(c.team) + '\n' +
    'Role: ' + esc(c.roles.join(', ')) + '\n' +
    'Game experience: ' + esc(gameExp) + '\n' +
    'eSports experience: ' + esc(esportsExp) + '\n' +
    'WhatsApp: ' + esc(c.whatsapp) + '\n' +
    'Instagram: ' + esc(c.insta) + '\n' +
    'Discord: ' + esc(c.discord) + '\n' +
    'Age verified: ' + esc(ageVerified) + '\n' +
    'Conduct agreement accepted: Yes';

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
