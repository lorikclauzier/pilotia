// Backtest sprint — brief, scoring kanban, analyser, message IA, colonne clients
// Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-backtest-sprint.js

const { chromium } = require('playwright');

const BASE     = 'https://pilotia.vercel.app';
const EMAIL    = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-backtest-sprint.js');
  process.exit(1);
}

const results = [];
function ok(label)   { results.push({ s: '✅', label }); console.log('✅', label); }
function warn(label) { results.push({ s: '⚠️', label }); console.log('⚠️', label); }
function fail(label) { results.push({ s: '❌', label }); console.log('❌', label); }
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  // ── LOGIN ────────────────────────────────────────────────────
  console.log('\n── AUTH ──');
  await page.goto(BASE + '/login.html');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard.html', { timeout: 12000 }).catch(() => {});
  if (!page.url().includes('dashboard')) { fail('Login échoué — arrêt'); await browser.close(); process.exit(1); }
  ok('Login → redirection dashboard');

  // ── 1. BRIEF QUOTIDIEN ────────────────────────────────────────
  console.log('\n── 1. BRIEF QUOTIDIEN ──');
  await wait(2500); // laisser le délai 1.5s s'écouler

  const briefOverlay = await page.$('#brief-overlay');
  briefOverlay ? ok('brief-overlay présent dans le DOM') : fail('brief-overlay absent du DOM');

  const briefOpen = await page.$('#brief-overlay.open');
  briefOpen ? ok('Brief auto-ouvert après login') : warn('Brief non auto-ouvert (déjà vu aujourd\'hui ou erreur)');

  // FAB visible si brief fermé, ou doit devenir visible après fermeture
  if (briefOpen) {
    // Fermer via clic extérieur
    await page.evaluate(() => {
      const overlay = document.getElementById('brief-overlay');
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await wait(400);
    const briefClosed = !(await page.$('#brief-overlay.open'));
    briefClosed ? ok('Brief fermé au clic en dehors') : fail('Brief ne se ferme pas au clic en dehors');
  } else {
    // Forcer localStorage pour tester clic extérieur au prochain chargement — on vérifie juste la structure
    warn('Brief déjà vu aujourd\'hui — test fermeture clic extérieur non exécuté');
  }

  const fabVisible = await page.$('#brief-fab.visible');
  fabVisible ? ok('FAB sparkle bleu visible après fermeture') : fail('FAB #brief-fab.visible absent');

  // Rouvrir via FAB
  if (fabVisible) {
    await page.click('#brief-fab');
    await wait(300);
    const reopened = await page.$('#brief-overlay.open');
    reopened ? ok('Brief réouvert via FAB') : fail('Brief ne se réouvre pas via FAB');
    if (reopened) {
      // Fermer proprement pour la suite
      await page.click('#brief-close-btn').catch(() =>
        page.evaluate(() => closeBriefModal())
      );
      await wait(300);
    }
  }

  // Vérifier les sections du brief
  const briefTitle   = await page.$('#brief-title');
  const briefActions = await page.$('#brief-actions-list');
  const briefIntro   = await page.$('#brief-intro');
  briefTitle   ? ok('Brief — section titre présente') : fail('Brief — #brief-title absent');
  briefActions ? ok('Brief — section actions urgentes présente') : fail('Brief — #brief-actions-list absent');
  briefIntro   ? ok('Brief — section intro IA présente') : fail('Brief — #brief-intro absent');

  // ── 2. SCORING KANBAN ─────────────────────────────────────────
  console.log('\n── 2. SCORING KANBAN ──');

  // Dismiss brief si encore ouvert
  await page.evaluate(() => {
    const o = document.getElementById('brief-overlay');
    if (o && o.classList.contains('open')) closeBriefModal();
  }).catch(() => {});
  await wait(200);

  await page.click('#nav-prospection');
  await wait(1200);

  const prospectionActive = await page.$('#section-prospection.active');
  prospectionActive ? ok('Section prospection active') : fail('Section prospection non active');

  // Vérifier absence du bouton email IA sur les cartes
  const emailBtn = await page.$('.kb-card button[onclick*="aiDraftEmail"]');
  !emailBtn ? ok('Bouton "Rédigez email IA" absent des cartes Kanban') : fail('Bouton "Rédigez email IA" encore présent sur les cartes');

  // Vérifier présence des badges de scoring
  const allCards = await page.$$('.kb-card');
  if (allCards.length === 0) {
    warn('Aucune carte Kanban — impossible de tester les badges scoring');
  } else {
    const badges = await page.$$('.kb-score');
    badges.length > 0
      ? ok(`Badges scoring présents (${badges.length} badges pour ${allCards.length} cartes)`)
      : fail('Aucun badge .kb-score trouvé sur les cartes');

    // Vérifier la diversité des scores si plusieurs cartes
    if (badges.length >= 2) {
      const classes = await Promise.all(badges.map(b => b.getAttribute('class')));
      const hasChaud  = classes.some(c => c.includes('chaud'));
      const hasTiede  = classes.some(c => c.includes('tiede'));
      const hasFroid  = classes.some(c => c.includes('froid'));
      const diversity = [hasChaud, hasTiede, hasFroid].filter(Boolean).length;
      diversity >= 2
        ? ok(`Scoring différencié — ${diversity} valeurs distinctes présentes`)
        : warn(`Scoring peu diversifié — seulement ${diversity} valeur(s) distincte(s) (normal si tous les prospects sont au même stade)`);
    }

    // Drag & drop : vérifier que les cartes non-client ont draggable=true
    const draggableCards = await page.$$('.kb-card[draggable="true"]');
    draggableCards.length > 0
      ? ok(`Drag & drop : ${draggableCards.length} carte(s) draggable`)
      : warn('Aucune carte draggable (normal si tous sont clients)');
  }

  // Colonne Clients — vérifier présence
  const clientCol = await page.$('#kbc-client_actif');
  clientCol ? ok('Colonne "Clients ✓" présente dans le Kanban') : fail('Colonne "Clients ✓" absente');

  // ── 3. BOUTON ANALYSER — CONTACTS ─────────────────────────────
  console.log('\n── 3. BOUTON ANALYSER (contacts) ──');
  await page.click('#nav-contacts');
  await wait(800);

  const rows = await page.$$('.table-row.clickable');
  if (rows.length === 0) {
    warn('Aucun contact — tests drawer ignorés');
  } else {
    await rows[0].click();
    await wait(700);

    const drawerOpen = await page.$('#contact-drawer.open');
    drawerOpen ? ok('Drawer contact ouvert') : fail('Drawer contact non ouvert');

    const analyseBtn = await page.$('#drawer-analyse-btn');
    analyseBtn ? ok('Bouton "✦ Analyser" présent dans le drawer') : fail('Bouton "✦ Analyser" absent du drawer');

    // 3b. BOUTON MESSAGE — CONTACTS
    console.log('\n── 3b. BOUTON MESSAGE (contacts) ──');
    const msgBtn = await page.$('#drawer-msg-btn');
    msgBtn ? ok('Bouton "✉ Message" présent dans le drawer') : fail('Bouton "✉ Message" absent du drawer');

    // Vérifier section cachée par défaut
    const msgSectionHidden = await page.$eval('#drawer-msg-section', el =>
      el.style.display === 'none' || getComputedStyle(el).display === 'none'
    ).catch(() => true);
    msgSectionHidden ? ok('Section message masquée par défaut') : warn('Section message visible sans avoir cliqué');

    // Clic sur Message et attente génération IA
    if (msgBtn) {
      await page.click('#drawer-msg-btn');
      await wait(500);
      const sectionVisible = await page.$eval('#drawer-msg-section', el =>
        el.style.display !== 'none'
      ).catch(() => false);
      sectionVisible ? ok('Section message IA visible après clic') : fail('Section message IA ne s\'affiche pas');

      // Attendre la génération (max 15s)
      try {
        await page.waitForSelector('#drawer-msg-ta', { timeout: 15000 });
        const taVal = await page.$eval('#drawer-msg-ta', el => el.value.trim());
        taVal.length > 20
          ? ok(`Message IA généré (${taVal.length} caractères)`)
          : warn(`Message IA trop court (${taVal.length} caractères)`);

        // Bouton Copier
        const copyBtn = await page.$('.btn-copy');
        copyBtn ? ok('Bouton "Copier" présent') : fail('Bouton "Copier" absent');

        // Test éditabilité textarea
        await page.fill('#drawer-msg-ta', 'Message modifié pour test');
        const modified = await page.$eval('#drawer-msg-ta', el => el.value);
        modified === 'Message modifié pour test'
          ? ok('Textarea éditable — modification confirmée')
          : fail('Textarea non éditable');

      } catch(e) {
        warn('Message IA non généré dans le délai (timeout 15s) — peut indiquer un problème API');
      }
    }

    // Clic sur Analyser
    if (analyseBtn) {
      await page.click('#drawer-analyse-btn');
      await wait(500);
      const aiSectionVisible = await page.$eval('#drawer-ai-section', el =>
        el.style.display !== 'none'
      ).catch(() => false);
      aiSectionVisible ? ok('Section analyse IA visible après clic') : fail('Section analyse IA ne s\'affiche pas');

      try {
        await page.waitForSelector('#drawer-ai-result .ai-analyse-box', { timeout: 15000 });
        ok('Analyse IA générée dans le drawer contact');
      } catch(e) {
        warn('Analyse IA non générée dans le délai (timeout 15s)');
      }
    }

    // Reset à la fermeture
    await page.click('.drawer-close-btn').catch(() =>
      page.evaluate(() => closeContactDrawer())
    );
    await wait(400);
    const msgSectionAfterClose = await page.$eval('#drawer-msg-section', el =>
      el.style.display === 'none'
    ).catch(() => true);
    msgSectionAfterClose ? ok('Section message réinitialisée à la fermeture du drawer') : fail('Section message non réinitialisée à la fermeture');
  }

  // ── 4. BOUTON ANALYSER + MESSAGE — PROSPECTS ──────────────────
  console.log('\n── 4. ANALYSER + MESSAGE (prospects) ──');

  // Créer un prospect si besoin pour tester le modal
  await page.click('#nav-prospection');
  await wait(800);
  let prospCreated = false;
  let kbCards = await page.$$('.kb-card[onclick*="openProspModal"]');
  if (kbCards.length === 0) {
    // Créer un prospect de test
    await page.click('.kb-add').catch(() => {});
    await wait(500);
    const pNom = await page.$('#p-nom');
    if (pNom) {
      await page.fill('#p-nom', 'Prospect Test Backtest');
      await page.fill('#p-entreprise', 'Société Test');
      await page.fill('#p-note', 'Prospect créé automatiquement pour les tests de backtest sprint');
      await page.click('#prosp-modal-submit');
      await wait(1000);
      prospCreated = true;
      kbCards = await page.$$('.kb-card[onclick*="openProspModal"]');
    }
  }
  if (kbCards.length === 0) {
    warn('Aucun prospect modifiable — tests modal ignorés');
  } else {
    await kbCards[0].click();
    await wait(600);

    const modalOpen = await page.$('#modal-prospect.open');
    modalOpen ? ok('Modal prospect ouvert') : fail('Modal prospect non ouvert');

    const prospAnalyseBtn = await page.$('#prosp-analyse-btn');
    if (prospAnalyseBtn) {
      const analyseVisible = await prospAnalyseBtn.isVisible();
      analyseVisible ? ok('Bouton "✦ Analyser" visible dans modal prospect') : fail('Bouton "✦ Analyser" non visible');
    } else {
      fail('Bouton "✦ Analyser" absent du modal prospect');
    }

    const prospMsgBtn = await page.$('#prosp-msg-btn');
    if (prospMsgBtn) {
      const msgVisible = await prospMsgBtn.isVisible();
      msgVisible ? ok('Bouton "✉ Message" visible dans modal prospect') : fail('Bouton "✉ Message" non visible');

      // Clic + attente génération
      await page.click('#prosp-msg-btn');
      await wait(500);
      try {
        await page.waitForSelector('#prosp-msg-ta', { timeout: 15000 });
        const val = await page.$eval('#prosp-msg-ta', el => el.value.trim());
        val.length > 20
          ? ok(`Message IA prospect généré (${val.length} caractères)`)
          : warn('Message IA prospect trop court');
      } catch(e) {
        warn('Message IA prospect non généré dans le délai (timeout 15s)');
      }
    } else {
      fail('Bouton "✉ Message" absent du modal prospect');
    }

    // Fermeture + reset
    await page.click('button[onclick="closeProspModal()"]').catch(() =>
      page.keyboard.press('Escape')
    );
    await wait(400);
    const prosMsgHidden = await page.$eval('#prosp-msg-section', el =>
      el.style.display === 'none'
    ).catch(() => true);
    prosMsgHidden ? ok('Section message prospect réinitialisée à la fermeture') : fail('Section message prospect non réinitialisée');
  }

  // ── 5. FONCTIONNALITÉS PRÉSERVÉES ─────────────────────────────
  console.log('\n── 5. FONCTIONNALITÉS PRÉSERVÉES ──');

  // Light mode — pas de variable CSS dark
  const hasDarkVar = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue('--dark');
    // En light mode --dark doit être une couleur claire (#f0f5ff), pas sombre (#080c14)
    return bg.trim();
  }).catch(() => 'N/A');
  const isDark = hasDarkVar.includes('08') || hasDarkVar.includes('0e') || hasDarkVar.includes('14');
  !isDark ? ok(`Light mode confirmé (--dark = "${hasDarkVar.trim()}")`) : fail(`Dark mode détecté ! --dark = "${hasDarkVar}"`);

  // Navigation complète sans erreur JS
  const sections = ['nav-dashboard','nav-contacts','nav-agenda','nav-activite',
                    'nav-performance','nav-postvente','nav-messages','nav-prospection',
                    'nav-assistant','nav-parametres'];
  let navErrors = 0;
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  for (const id of sections) {
    await page.click(`#${id}`).catch(() => {});
    await wait(400);
  }
  await wait(500);
  if (jsErrors.length === 0) {
    ok('Navigation complète — 0 erreur JS console');
  } else {
    fail(`Navigation — ${jsErrors.length} erreur(s) JS : ${jsErrors.slice(0,2).join(' | ')}`);
  }

  // Assistant IA — présence des éléments
  await page.click('#nav-assistant');
  await wait(800);
  const assistantSection = await page.$('#section-assistant.active');
  assistantSection ? ok('Section assistant IA active') : fail('Section assistant IA non active');
  const aiInput = await page.$('#ai-input, .ai-input');
  aiInput ? ok('Champ de saisie assistant IA présent') : warn('Champ de saisie assistant IA non trouvé');

  // Post-vente
  await page.click('#nav-postvente');
  await wait(600);
  const pvSection = await page.$('#section-postvente.active');
  pvSection ? ok('Section post-vente active') : fail('Section post-vente non active');

  // Paramètres
  await page.click('#nav-parametres');
  await wait(500);
  const exportBtn = await page.$('button[onclick="exportContacts()"]');
  exportBtn ? ok('Bouton export Excel (Pro) présent dans paramètres') : warn('Bouton export absent (normal si plan insuffisant)');

  // API sécurité
  const apiResp = await page.evaluate(async () => {
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 5, messages: [{ role: 'user', content: 'test' }] })
    });
    return r.status;
  });
  apiResp === 401
    ? ok('API /api/claude sans token → 401 ✓')
    : fail(`API /api/claude sans token → ${apiResp} (attendu 401)`);

  // ── RAPPORT FINAL ─────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('RAPPORT BACKTEST SPRINT — pylotIA');
  console.log('══════════════════════════════════════════════');
  const passed = results.filter(r => r.s === '✅').length;
  const warned = results.filter(r => r.s === '⚠️').length;
  const failed = results.filter(r => r.s === '❌').length;
  console.log(`✅ ${passed} OK  ⚠️ ${warned} partiels  ❌ ${failed} échecs`);

  if (warned > 0) {
    console.log('\nPartiels :');
    results.filter(r => r.s === '⚠️').forEach(r => console.log('  ⚠️', r.label));
  }
  if (failed > 0) {
    console.log('\nÉchecs :');
    results.filter(r => r.s === '❌').forEach(r => console.log('  ❌', r.label));
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
