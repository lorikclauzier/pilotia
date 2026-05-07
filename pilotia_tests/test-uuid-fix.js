// Test ciblé : flux drawer contact → Modifier → Enregistrer
const { chromium } = require('playwright');

const EMAIL    = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  // Intercepter les requêtes Supabase pour tracer les IDs
  page.on('request', req => {
    const url = req.url();
    if (url.includes('supabase') && url.includes('contacts') && req.method() === 'PATCH') {
      console.log('🔍 PATCH contacts URL:', url);
      try { console.log('   body:', req.postData()); } catch(e) {}
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('supabase') && url.includes('contacts') && res.request().method() === 'PATCH') {
      const status = res.status();
      console.log('🔍 PATCH contacts response:', status);
      if (status >= 400) {
        try { console.log('   error body:', await res.text()); } catch(e) {}
      }
    }
  });

  // Login
  await page.goto('https://pilotia.vercel.app/login.html');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard.html', { timeout: 10000 });
  console.log('✅ Login OK');

  // Empêcher le brief de s'ouvrir
  await page.evaluate(() => {
    localStorage.setItem('pylotia_brief_date', new Date().toISOString().split('T')[0]);
  });

  await wait(2500);

  // Fermer si quand même ouvert
  const briefOpen = await page.$('#brief-overlay.open');
  if (briefOpen) { await page.evaluate(() => closeBriefModal()); await wait(300); }

  // Section contacts
  await page.click('#nav-contacts');
  await wait(1000);

  // Contact existant ou en créer un
  let rows = await page.$$('.table-row.clickable');
  if (rows.length === 0) {
    await page.click('button[onclick="openModal()"]');
    await wait(400);
    await page.fill('#c-nom', 'Test UUID Fix');
    await page.click('#modal-submit');
    await wait(1500);
    await page.click('#nav-contacts');
    await wait(1000);
    rows = await page.$$('.table-row.clickable');
  }
  console.log('Contacts visibles :', rows.length);

  // Ouvrir le drawer
  await rows[0].click();
  await wait(800);

  // Lire currentDrawerContactId DANS le contexte JS de la page
  const drawerContactId = await page.evaluate(() => window.currentDrawerContactId || 'non accessible (let)');
  console.log('currentDrawerContactId (window) :', drawerContactId);

  // Clic Modifier
  await page.click('#contact-drawer button.btn-ghost:first-of-type');
  await wait(700);

  const modalTitle = await page.textContent('#modal-title').catch(() => '?');
  console.log('Titre modal :', modalTitle);

  // Vérifier editingId via le DOM (non accessible directement, on regarde le submit button)
  const submitLabel = await page.textContent('#modal-submit').catch(() => '?');
  console.log('Submit button :', submitLabel);

  // Remplir et sauvegarder
  await page.fill('#c-note', 'Note uuid test ' + Date.now());
  await page.click('#modal-submit');
  await wait(1500);

  const toastText = await page.evaluate(() => document.getElementById('toast').textContent);
  console.log('Toast :', JSON.stringify(toastText));

  if (toastText.includes('Erreur') || toastText.includes('uuid')) {
    console.log('❌ BUG UUID TOUJOURS PRÉSENT');
  } else {
    console.log('✅ OK');
  }

  await browser.close();
})().catch(e => { console.error('❌ Test error:', e.message); process.exit(1); });
