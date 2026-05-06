const SUPABASE_URL      = 'https://wpyhxotefkpvqzpndpgg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m_m0c4egKS1E9LsVcJ93IQ_v7TYy-BS';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ error: 'Clé API Anthropic non configurée dans Vercel.' });
  }

  // Verify JWT + plan via Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié. Reconnectez-vous.' });
  }
  const token = authHeader.slice(7);

  try {
    const planRes = await fetch(`${SUPABASE_URL}/rest/v1/user_plans?select=plan&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!planRes.ok) {
      return res.status(401).json({ error: 'Session invalide ou expirée. Reconnectez-vous.' });
    }

    const planData = await planRes.json();
    const plan = planData?.[0]?.plan || 'free';

    if (!['pro', 'business'].includes(plan)) {
      return res.status(403).json({ error: 'L\'Assistant IA est réservé au plan Pro.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Erreur vérification plan : ' + e.message });
  }

  // Forward to Anthropic
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
