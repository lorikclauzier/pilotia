import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { from_name, from_email, message } = req.body || {};
  if (!from_name || !from_email || !message) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(500).json({ error: 'Variables GMAIL non configurées' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${from_name}" <${user}>`,
    replyTo: from_email,
    to: 'pylotia.app@gmail.com',
    subject: `[pylotIA] Nouveau message de ${from_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#3b82f6">Nouveau message via pylotIA</h2>
        <p><strong>Nom :</strong> ${from_name}</p>
        <p><strong>Email :</strong> <a href="mailto:${from_email}">${from_email}</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="white-space:pre-wrap">${message}</p>
      </div>
    `,
  });

  return res.status(200).json({ ok: true });
}
