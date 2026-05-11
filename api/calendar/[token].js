const SUPABASE_URL      = 'https://wpyhxotefkpvqzpndpgg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m_m0c4egKS1E9LsVcJ93IQ_v7TYy-BS';

function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const chunks = [];
  let offset = 0;
  while (offset < bytes.length) {
    const chunkSize = offset === 0 ? 75 : 74;
    chunks.push(bytes.slice(offset, offset + chunkSize).toString('utf8'));
    offset += chunkSize;
  }
  return chunks.join('\r\n ');
}

function escapeIcal(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcalDate(dateStr, timeStr) {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' or null
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) return `DTSTART;VALUE=DATE:${d}`;
  const t = timeStr.replace(':', '') + '00';
  return `DTSTART:${d}T${t}`;
}

function toIcalDateEnd(dateStr, timeStr, durationMinutes) {
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) {
    // All-day: end is next day
    const dt = new Date(dateStr + 'T00:00:00');
    dt.setDate(dt.getDate() + 1);
    const nd = dt.toISOString().split('T')[0].replace(/-/g, '');
    return `DTEND;VALUE=DATE:${nd}`;
  }
  const [h, m] = timeStr.split(':').map(Number);
  const dur = durationMinutes || 60;
  const totalMin = h * 60 + m + dur;
  const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const endM = String(totalMin % 60).padStart(2, '0');
  return `DTEND:${d}T${endH}${endM}00`;
}

function buildIcs(appointments) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//pylotIA//pylotIA CRM//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Agenda pylotIA',
    'X-WR-TIMEZONE:Europe/Paris',
    'X-WR-CALDESC:Vos rendez-vous pylotIA',
  ];

  for (const appt of appointments) {
    const desc = [
      appt.contact_name ? `Contact : ${appt.contact_name}` : null,
      appt.type && appt.type !== 'rdv' ? `Type : ${appt.type}` : null,
      appt.notes ? appt.notes : null,
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${appt.id}@pilotia.vercel.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(toIcalDate(appt.date, appt.time));
    lines.push(toIcalDateEnd(appt.date, appt.time, appt.duration_minutes));
    lines.push(foldLine(`SUMMARY:${escapeIcal(appt.title || 'RDV pylotIA')}`));
    if (desc) lines.push(foldLine(`DESCRIPTION:${escapeIcal(desc)}`));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export default async function handler(req, res) {
  // token param includes '.ics' extension from the URL
  const rawToken = req.query.token || '';
  const token = rawToken.replace(/\.ics$/i, '');

  if (!token || token.length < 8) {
    return res.status(400).send('Token invalide');
  }

  // Lookup user_id from ical_token
  const planRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_plans?ical_token=eq.${encodeURIComponent(token)}&select=user_id&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );

  if (!planRes.ok) return res.status(500).send('Erreur serveur');
  const planData = await planRes.json();
  if (!planData?.length) return res.status(404).send('Calendrier introuvable');

  const userId = planData[0].user_id;

  // Fetch appointments
  const apptRes = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?user_id=eq.${userId}&order=date.asc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );

  if (!apptRes.ok) return res.status(500).send('Erreur serveur');
  const appointments = await apptRes.json();

  const icsContent = buildIcs(appointments || []);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pylotia.ics"');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.status(200).send(icsContent);
}
