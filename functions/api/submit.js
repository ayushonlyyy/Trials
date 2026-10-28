// Cloudflare Pages Function: POST /api/submit
// Secrets needed (Cloudflare > Pages project > Settings > Variables and Secrets):
//   TELEGRAM_BOT_TOKEN  = token from BotFather
//   TELEGRAM_CHAT_ID    = chat / group / channel id where the form should arrive

const ROLES = ['Rusher','Entry Fragger','Support','Sniper','Scout','Flanker','Defender','IGL','All-rounder'];
const TEAMS = Array.from({ length: 10 }, (_, i) => 'Team ' + (i + 1));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: 'Server not configured' }, 500);
  }

  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }

  // Honeypot: bots fill this hidden field. Pretend success, send nothing.
  if (d.website) return json({ ok: true });

  const s = (v, max) => String(v ?? '').trim().slice(0, max);
  const clean = {
    realName: s(d.realName, 60),
    ign: s(d.ign, 40),
    uid: s(d.uid, 14),
    age: s(d.age, 3),
    team: s(d.team, 10),
    igl: s(d.igl, 40),
    whatsapp: s(d.whatsapp, 16),
    insta: s(d.insta, 40),
    discord: s(d.discord, 40),
    roles: Array.isArray(d.roles) ? d.roles.filter((r) => ROLES.includes(r)) : []
  };

  const age = Number(clean.age);
  const valid =
    clean.realName.length >= 2 && clean.ign && clean.igl &&
    /^\d{8,14}$/.test(clean.uid) &&
    Number.isInteger(age) && age >= 5 && age <= 60 &&
    TEAMS.includes(clean.team) &&
    clean.roles.length >= 1 && clean.roles.length <= 2 &&
    /^\+?\d{10,14}$/.test(clean.whatsapp.replace(/[\s-]/g, '')) &&
    clean.insta.length >= 2 && clean.discord.length >= 2;

  if (!valid) return json({ ok: false, error: 'Invalid data' }, 400);

  const text =
    '<b>New Trials Form - BONTEN eSports</b>\n\n' +
    'Real name: ' + esc(clean.realName) + '\n' +
    'In-game name: ' + esc(clean.ign) + '\n' +
    'UID: <code>' + esc(clean.uid) + '</code>\n' +
    'Age: ' + esc(clean.age) + '\n' +
    'Team: ' + esc(clean.team) + '\n' +
    'Role: ' + esc(clean.roles.join(', ')) + '\n' +
    'IGL: ' + esc(clean.igl) + '\n' +
    'WhatsApp: ' + esc(clean.whatsapp) + '\n' +
    'Instagram: ' + esc(clean.insta) + '\n' +
    'Discord: ' + esc(clean.discord);

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
