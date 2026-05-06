// Test dashboard pylotIA en production
// Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-dashboard.js

const { chromium } = require('playwright');

const BASE = 'https://pilotia.vercel.app';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-dashboard.js');
  process.exit(1);
}

const results = [];
function ok(label)   { results.push({ s: '✅', label }); console.log('✅', label); }
function warn(label) { results.push({ s: '⚠️', label }); console.log('⚠️', label); }
function fail(label) { results.push({ s: '❌', label }); console.log('❌', label); }

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);

  // ── 1. LOGIN ────────────────────────────────────────────────
  console.log('\n── AUTH ──');
  await page.goto(BASE + '/login.html');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"], .btn');
  await page.waitForURL('**/dashboard.html', { timeout: 10000 }).catch(() => {});
  if (page.url().includes('dashboard')) ok('Login → redirection dashboard');
  else { fail('Login échoué — arrêt'); await browser.close(); process.exit(1); }

  await wait(2000); // laisser le JS charger les données

  // ── 2. SIDEBAR ──────────────────────────────────────────────
  console.log('\n── SIDEBAR ──');
  const navIds = ['nav-dashboard','nav-contacts','nav-agenda','nav-activite',
                  'nav-performance','nav-postvente','nav-messages','nav-prospection',
                  'nav-assistant','nav-parametres'];
  for (const id of navIds) {
    const el = await page.$('#' + id);
    el ? ok('Nav item présent : ' + id) : fail('Nav item MANQUANT : ' + id);
  }
  const themeBtn = await page.$('#theme-toggle');
  themeBtn ? fail('Bouton thème toujours présent (doit être supprimé)') : ok('Bouton thème absent ✓');

  const planBadge = await page.$('#plan-badge-sidebar');
  if (planBadge) {
    const txt = await planBadge.textContent();
    ok('Badge plan sidebar : ' + txt.trim());
  } else fail('Badge plan sidebar absent');

  // ── 3. DASHBOARD PRINCIPAL ──────────────────────────────────
  console.log('\n── DASHBOARD ──');
  const statIds = ['dash-contacts','dash-prospects','dash-messages','dash-plan'];
  for (const id of statIds) {
    const el = await page.$('#' + id);
    el ? ok('Stat card présente : ' + id) : fail('Stat card MANQUANTE : ' + id);
  }

  // ── 4. CONTACTS ─────────────────────────────────────────────
  console.log('\n── CONTACTS ──');
  await page.click('#nav-contacts');
  await wait(800);
  const contactsSection = await page.$('#section-contacts.active');
  contactsSection ? ok('Section contacts active') : fail('Section contacts non active');

  const searchInput = await page.$('#search-contacts');
  searchInput ? ok('Barre de recherche contacts présente') : fail('Barre recherche absente');

  const filterStatut = await page.$('#filter-statut');
  filterStatut ? ok('Filtre statut présent') : fail('Filtre statut absent');

  const addBtn = await page.$('button[onclick="openModal()"]');
  addBtn ? ok('Bouton + Nouveau contact présent') : fail('Bouton ajout contact absent');

  // Plan badge sur contacts
  const freeBanner = await page.$('#contacts-free-banner');
  freeBanner ? ok('Bannière plan Free contacts présente') : warn('Bannière plan Free absente (normal si Starter/Pro)');

  // ── 5. AGENDA ───────────────────────────────────────────────
  console.log('\n── AGENDA ──');
  await page.click('#nav-agenda');
  await wait(1000);
  const agendaSection = await page.$('#section-agenda.active');
  agendaSection ? ok('Section agenda active') : fail('Section agenda non active');
  const calendar = await page.$('.cal-grid, .calendar, #cal-grid, [id*="cal"]');
  calendar ? ok('Grille calendrier présente') : warn('Grille calendrier non détectée');
  const newRdvBtn = await page.$('button[onclick="openRdvModal()"]');
  newRdvBtn ? ok('Bouton + Nouveau RDV présent') : fail('Bouton nouveau RDV absent');

  // ── 6. ACTIVITÉ ─────────────────────────────────────────────
  console.log('\n── ACTIVITÉ ──');
  await page.click('#nav-activite');
  await wait(600);
  const activiteSection = await page.$('#section-activite.active');
  activiteSection ? ok('Section activité active') : fail('Section activité non active');
  const feed = await page.$('#activity-feed');
  feed ? ok('Feed activité présent') : fail('Feed activité absent');

  // ── 7. SECTIONS VERROUILLÉES (plan Free) ────────────────────
  console.log('\n── PLAN GATING ──');
  const planText = planBadge ? (await planBadge.textContent()).trim() : '';
  const isFree = planText.includes('Free');

  // Tester Campagnes (Starter requis pour Free)
  await page.click('#nav-messages');
  await wait(600);
  const upgradeModal = await page.$('#modal-upgrade.open');
  if (isFree) {
    upgradeModal ? ok('Campagnes bloqué Free → modal upgrade ✓') : fail('Campagnes accessible en Free — pas de blocage !');
  } else {
    const messagesActive = await page.$('#section-messages.active');
    messagesActive ? ok('Campagnes accessible (plan ' + planText + ')') : warn('Campagnes non accessible');
  }
  // Fermer modal si ouvert
  if (upgradeModal) await page.keyboard.press('Escape').catch(() => {});
  await page.click('button[onclick="closeUpgradeModal()"]').catch(() => {});
  await wait(300);

  // Tester Performance (Pro requis)
  await page.click('#nav-performance');
  await wait(600);
  const perfModal = await page.$('#modal-upgrade.open');
  if (!planText.includes('Pro') && !planText.includes('Business')) {
    perfModal ? ok('Performance bloqué → modal upgrade ✓') : fail('Performance accessible sans Pro !');
  } else {
    ok('Performance accessible (plan Pro/Business)');
  }
  await page.click('button[onclick="closeUpgradeModal()"]').catch(() => {});
  await wait(300);

  // ── 8. RECHERCHE GLOBALE ────────────────────────────────────
  console.log('\n── RECHERCHE GLOBALE ──');
  await page.click('#nav-dashboard');
  await wait(400);
  await page.click('#nav-search');
  await wait(500);
  const searchOverlay = await page.$('#gsearch-overlay');
  const overlayVisible = searchOverlay ? await searchOverlay.isVisible() : false;
  if (isFree) {
    !overlayVisible ? ok('Recherche globale bloquée en Free ✓') : fail('Recherche globale accessible en Free !');
  } else {
    overlayVisible ? ok('Recherche globale ouverte ✓') : warn('Recherche globale non ouverte');
    await page.keyboard.press('Escape');
  }
  // Fermer modal upgrade si ouvert
  await page.click('button[onclick="closeUpgradeModal()"]').catch(() => {});
  await wait(300);

  // ── 9. PARAMÈTRES ───────────────────────────────────────────
  console.log('\n── PARAMÈTRES ──');
  await page.click('#nav-parametres');
  await wait(600);
  const paramsSection = await page.$('#section-parametres.active');
  paramsSection ? ok('Section paramètres active') : fail('Section paramètres non active');
  const settingsName = await page.$('#settings-name');
  settingsName ? ok('Champ nom présent dans paramètres') : fail('Champ nom absent');
  const exportBtn = await page.$('button[onclick="exportContacts()"]');
  exportBtn ? ok('Bouton export Excel présent') : fail('Bouton export absent');

  // ── 10. API /api/claude sans auth ───────────────────────────
  console.log('\n── API SÉCURITÉ ──');
  const apiResp = await page.evaluate(async () => {
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 5, messages: [{ role: 'user', content: 'test' }] })
    });
    return { status: r.status, body: await r.json() };
  });
  apiResp.status === 401 ? ok('API /api/claude sans token → 401 ✓') : fail('API /api/claude sans token → ' + apiResp.status + ' (attendu 401)');

  // ── RAPPORT FINAL ────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('RAPPORT FINAL');
  console.log('══════════════════════════════════════');
  const passed = results.filter(r => r.s === '✅').length;
  const warned = results.filter(r => r.s === '⚠️').length;
  const failed = results.filter(r => r.s === '❌').length;
  console.log(`✅ ${passed} validés  ⚠️ ${warned} partiels  ❌ ${failed} échecs`);
  if (failed > 0) {
    console.log('\nÉchecs :');
    results.filter(r => r.s === '❌').forEach(r => console.log('  ❌', r.label));
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
