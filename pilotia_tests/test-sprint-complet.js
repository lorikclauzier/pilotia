// Backtest sprint complet — mai 2026
// Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-sprint-complet.js

const { chromium } = require('playwright');

const BASE     = 'https://pilotia.vercel.app';
const EMAIL    = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Usage: TEST_EMAIL=xxx TEST_PASSWORD=yyy node pilotia_tests/test-sprint-complet.js');
  process.exit(1);
}

const results = [];
function ok(label)   { results.push({ s: '✅', label }); console.log('✅', label); }
function warn(label) { results.push({ s: '⚠️', label }); console.log('⚠️', label); }
function fail(label) { results.push({ s: '❌', label }); console.log('❌', label); }
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  // ── LOGIN ───────────────────────────────────────────────────────
  console.log('\n── AUTH ──');
  await page.goto(BASE + '/login.html');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard.html', { timeout: 12000 }).catch(() => {});
  if (!page.url().includes('dashboard')) { fail('Login échoué — arrêt'); await browser.close(); process.exit(1); }
  ok('Login → redirection dashboard');

  // Bloquer brief + onboarding pour ne pas interférer avec les tests
  await page.evaluate(() => {
    localStorage.setItem('pylotia_brief_date', new Date().toISOString().split('T')[0]);
  });
  await wait(2500); // laisser Supabase charger
  // Fermer modals ouverts
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });
  await wait(300);

  // ── 1. BRIEF QUOTIDIEN ─────────────────────────────────────────
  console.log('\n── 1. BRIEF QUOTIDIEN ──');
  const briefOverlay = await page.$('#brief-overlay');
  briefOverlay ? ok('brief-overlay présent dans le DOM') : fail('brief-overlay absent du DOM');

  const briefFab = await page.$('#brief-fab');
  briefFab ? ok('FAB sparkle bas-droite présent') : fail('FAB sparkle absent');
  if (briefFab) {
    const fabVisible = await briefFab.evaluate(el => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && parseFloat(s.opacity) > 0;
    });
    fabVisible ? ok('FAB sparkle visible') : warn('FAB sparkle non visible (normal si plan Free)');
  }

  // Forcer l'ouverture du brief
  await page.evaluate(() => {
    localStorage.removeItem('pylotia_brief_date');
    openBriefModal();
  });
  await wait(1000);
  const briefOpen = await page.$('#brief-overlay.open');
  briefOpen ? ok('Brief ouvert via openBriefModal()') : fail('Brief non ouvert');

  // Fermeture clic en dehors
  if (briefOpen) {
    await page.click('#brief-overlay', { position: { x: 5, y: 5 } });
    await wait(400);
    const briefClosed = !(await page.$('#brief-overlay.open'));
    briefClosed ? ok('Brief fermé au clic en dehors') : fail('Brief non fermé au clic en dehors');
  }

  // Réouvrir via FAB
  if (briefFab) {
    await page.click('#brief-fab');
    await wait(600);
    const reopened = await page.$('#brief-overlay.open');
    reopened ? ok('Brief réouvert via FAB') : warn('Brief non réouvert via FAB (délai)');
    await page.evaluate(() => { if (typeof closeBriefModal === 'function') closeBriefModal(); });
    await wait(300);
  }

  // Bloquer à nouveau
  await page.evaluate(() => localStorage.setItem('pylotia_brief_date', new Date().toISOString().split('T')[0]));

  // ── 2. SCORING KANBAN ──────────────────────────────────────────
  console.log('\n── 2. SCORING KANBAN ──');
  await page.evaluate(() => showSection('prospection'));
  await wait(800);
  const prospSection = await page.$('#section-prospection.active, #section-prospection');
  prospSection ? ok('Section prospection chargée') : fail('Section prospection non chargée');

  const kbCards = await page.$$('.kb-card');
  if (kbCards.length === 0) {
    warn('Aucune carte Kanban — scoring non testable (base vide)');
  } else {
    ok(`${kbCards.length} carte(s) Kanban présente(s)`);
    const firstCard = kbCards[0];

    // Pastille score
    const scoreBadge = await firstCard.$('.kb-score');
    scoreBadge ? ok('Pastille score présente sur carte Kanban') : fail('Pastille score absente');

    // Score différencié
    const scores = await page.$$eval('.kb-score', els => [...new Set(els.map(e => e.className.match(/chaud|tiede|froid/)?.[0]))].filter(Boolean));
    scores.length > 1
      ? ok(`Scoring différencié : ${scores.join(', ')}`)
      : warn(`Scoring homogène (${scores.join(', ')}) — base trop petite ou IA non appelée`);

    // Menu score manuel
    if (scoreBadge) {
      await scoreBadge.click();
      await wait(400);
      const scoreMenu = await page.$('#score-menu');
      scoreMenu ? ok('Menu scoring manuel ouvert au clic sur pastille') : fail('Menu scoring manuel absent');
      if (scoreMenu) {
        const menuItems = await page.$$('#score-menu button, #score-menu [onclick*="setScore"]');
        menuItems.length >= 3 ? ok(`Menu contient ${menuItems.length} options (chaud/tiède/froid)`) : fail('Options menu incomplètes');
        await page.keyboard.press('Escape');
        await page.evaluate(() => { const m = document.getElementById('score-menu'); if (m) m.style.display='none'; });
      }
    }

    // Drag & drop kanban
    const kanbanBoard = await page.$('.kanban-board, #kanban-board');
    kanbanBoard ? ok('Kanban board présent') : fail('Kanban board absent');
  }

  // Colonne client_actif
  const clientCol = await page.$('.kb-col[data-col="client_actif"], [data-col="client_actif"]');
  clientCol ? ok('Colonne "Clients ✓" (client_actif) présente') : warn('Colonne client_actif non détectée — chercher via texte');
  if (!clientCol) {
    const allCols = await page.$$eval('.kb-col-title, .kb-col h3, .kb-col > div:first-child', els => els.map(e => e.textContent.trim()));
    allCols.some(t => t.includes('Clients')) ? ok('Colonne "Clients ✓" détectée par texte') : fail('Colonne "Clients ✓" absente du Kanban');
  }

  // ── 3. ANALYSER + MESSAGE (contacts) ──────────────────────────
  console.log('\n── 3. ANALYSER + MESSAGE (contacts) ──');
  await page.evaluate(() => showSection('contacts'));
  await wait(800);

  const contactRows = await page.$$('.table-row.clickable');
  if (contactRows.length === 0) {
    warn('Aucun contact — Analyser/Message non testable');
  } else {
    await contactRows[0].click();
    await wait(700);
    const drawer = await page.$('.contact-drawer.open, #contact-drawer[style*="right: 0"]');
    drawer ? ok('Drawer contact ouvert') : warn('Drawer contact non détecté (sélecteur)');

    const analyseBtn = await page.$('#drawer-analyse-btn, button[onclick*="analyseContact"]');
    analyseBtn ? ok('Bouton "✦ Analyser" présent dans drawer contact') : fail('Bouton Analyser absent dans drawer');

    const msgBtn = await page.$('#drawer-msg-btn, button[onclick*="draftMessage"]');
    msgBtn ? ok('Bouton "✉ Message" présent dans drawer contact') : fail('Bouton Message absent dans drawer');

    if (msgBtn) {
      await msgBtn.click();
      await wait(4000); // appel IA
      const msgSection = await page.$('#drawer-msg-section');
      if (msgSection) {
        const msgContent = await msgSection.textContent();
        msgContent.length > 30
          ? ok(`Message IA contact généré (${msgContent.length} caractères)`)
          : fail('Message IA contact vide ou trop court');

        const copyBtn = await msgSection.$('button[onclick*="copy"], .copy-btn, button[title*="opier"]');
        copyBtn ? ok('Bouton Copier présent dans section message') : warn('Bouton Copier non trouvé');

        const ta = await msgSection.$('textarea');
        ta ? ok('Textarea éditable présent') : warn('Textarea absent dans section message');
      } else fail('Section message non visible après clic');
    }

    if (analyseBtn) {
      await analyseBtn.click();
      await wait(4000);
      const aiBox = await page.$('.ai-analyse-box, #drawer-ai-section .ai-analyse-box');
      if (aiBox) {
        const analyseTxt = await aiBox.textContent();
        analyseTxt.length > 30
          ? ok(`Analyse IA contact générée (${analyseTxt.length} caractères)`)
          : fail('Analyse IA contact vide');
      } else warn('Box analyse IA non détectée (sélecteur)');
    }

    // Fermer drawer
    await page.keyboard.press('Escape');
    await page.evaluate(() => { if (typeof closeContactDrawer === 'function') closeContactDrawer(); });
    await wait(400);
  }

  // ── 4. ANALYSER + MESSAGE (prospects) ─────────────────────────
  console.log('\n── 4. ANALYSER + MESSAGE (prospects) ──');
  await page.evaluate(() => showSection('prospection'));
  await wait(800);

  const kbCardsAfter = await page.$$('.kb-card');
  if (kbCardsAfter.length === 0) {
    warn('Aucun prospect — Analyser/Message prospects non testable');
  } else {
    await kbCardsAfter[0].click();
    await wait(700);
    const prospModal = await page.$('#modal-prospect.open');
    prospModal ? ok('Modal prospect ouvert') : warn('Modal prospect non ouvert (sélecteur)');

    const prospAnalyseBtn = await page.$('#prosp-analyse-btn');
    prospAnalyseBtn ? ok('Bouton "✦ Analyser" dans modal prospect') : fail('Bouton Analyser absent dans modal prospect');

    const prospMsgBtn = await page.$('#prosp-msg-btn');
    prospMsgBtn ? ok('Bouton "✉ Message" dans modal prospect') : fail('Bouton Message absent dans modal prospect');

    // Bouton Campagne
    const campBtn = await page.$('button[onclick*="toggleCampaignSelector"], #prosp-campaign-btn, button[onclick*="Campaign"]');
    campBtn ? ok('Bouton "→ Campagne" présent dans modal prospect') : warn('Bouton Campagne non trouvé (plan ou sélecteur)');

    if (prospMsgBtn) {
      await prospMsgBtn.click();
      await wait(4000);
      const prospMsgSection = await page.$('#prosp-msg-section');
      if (prospMsgSection) {
        const txt = await prospMsgSection.textContent();
        txt.length > 30
          ? ok(`Message IA prospect généré (${txt.length} caractères)`)
          : fail('Message IA prospect vide');
      } else fail('Section message prospect non visible');
    }

    // Fermer modal
    await page.keyboard.press('Escape');
    await page.evaluate(() => { const m = document.getElementById('modal-prospect'); if (m) m.classList.remove('open'); });
    await wait(400);
  }

  // ── 5. ONBOARDING + TOUR GUIDÉ ────────────────────────────────
  console.log('\n── 5. ONBOARDING + TOUR GUIDÉ ──');

  const onboardingOverlay = await page.$('#onboarding-overlay');
  onboardingOverlay ? ok('#onboarding-overlay présent dans le DOM') : fail('#onboarding-overlay absent');

  const tourCanvas  = await page.$('#tour-canvas');
  const tourBubble  = await page.$('#tour-bubble');
  tourCanvas ? ok('#tour-canvas présent') : fail('#tour-canvas absent');
  tourBubble ? ok('#tour-bubble présent') : fail('#tour-bubble absent');

  // Tour guidé — lancer manuellement
  await page.evaluate(() => {
    if (typeof startTour === 'function') startTour(0);
  });
  await wait(1200);

  const tourActive = await page.evaluate(() => typeof _tourActive !== 'undefined' && _tourActive);
  tourActive ? ok('Tour guidé démarré (_tourActive = true)') : fail('Tour guidé non démarré');

  const canvasVisible = await page.$eval('#tour-canvas', el => el.style.display !== 'none').catch(() => false);
  canvasVisible ? ok('Canvas overlay tour visible') : fail('Canvas overlay tour non visible');

  const bubbleVisible = await page.$eval('#tour-bubble', el => el.style.display !== 'none').catch(() => false);
  bubbleVisible ? ok('Bulle tour visible') : fail('Bulle tour non visible');

  if (bubbleVisible) {
    const label = await page.$eval('#tour-step-label', el => el.textContent.trim()).catch(() => '');
    label ? ok(`Bulle — étape label : "${label}"`) : warn('Label étape vide');

    const counter = await page.$eval('#tour-step-counter', el => el.textContent.trim()).catch(() => '');
    counter.includes('/') ? ok(`Compteur étapes : ${counter}`) : warn('Compteur étapes non affiché');

    // Vérifier que le contenu principal est visible (pas complètement masqué)
    const mainOpacity = await page.$eval('.main', el => parseFloat(getComputedStyle(el).opacity)).catch(() => 1);
    mainOpacity > 0.5 ? ok('Contenu principal visible derrière overlay tour') : warn(`Contenu principal partiellement masqué (opacity: ${mainOpacity})`);

    // Navigation Suivant
    const nextBtn = await page.$('#tour-next-btn');
    if (nextBtn) {
      await nextBtn.click();
      await wait(500);
      const step2 = await page.$eval('#tour-step-counter', el => el.textContent.trim()).catch(() => '');
      step2.startsWith('2') ? ok('Navigation Suivant fonctionne (step 1→2)') : warn(`Navigation Suivant — counter: ${step2}`);

      // Précédent
      const prevBtn = await page.$('#tour-prev-btn');
      if (prevBtn) {
        const prevDisabled = await prevBtn.evaluate(el => !el.disabled);
        prevDisabled ? ok('Bouton Préc. activé en étape 2') : warn('Bouton Préc. désactivé en étape 2');
      }
    }
  }

  // Modale de fin de tour
  const tourEndModal = await page.$('#modal-tour-end');
  tourEndModal ? ok('#modal-tour-end présent dans le DOM') : fail('#modal-tour-end absent');

  // Quitter le tour
  await page.evaluate(() => { if (typeof tourQuit === 'function') tourQuit(); });
  await wait(400);
  await page.evaluate(() => document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')));
  await wait(200);

  // Progression tour en Supabase (colonne tour_etape_courante)
  const tourStepSaved = await page.evaluate(async () => {
    try {
      const { data } = await supabaseClient.from('user_plans').select('tour_etape_courante').eq('user_id', currentUser.id).single();
      return data?.tour_etape_courante;
    } catch(e) { return null; }
  });
  tourStepSaved !== null ? ok(`Progression tour sauvegardée en Supabase (étape : ${tourStepSaved})`) : warn('Progression tour non récupérée');

  // ── 6. NAVBAR DRAG & DROP ─────────────────────────────────────
  console.log('\n── 6. NAVBAR DRAG & DROP ──');

  const navList = await page.$('#nav-list');
  navList ? ok('#nav-list wrapper présent') : fail('#nav-list absent — drag & drop non initialisé');

  const draggableItems = await page.$$('#nav-list .nav-item[draggable="true"]');
  draggableItems.length > 0
    ? ok(`${draggableItems.length} items nav draggables`)
    : fail('Aucun item nav avec draggable="true"');

  // Vérifier l'ordre est bien une liste de 10 items
  const navItemIds = await page.$$eval('#nav-list .nav-item[id]', els => els.map(e => e.id));
  navItemIds.length === 10
    ? ok(`10 items dans #nav-list : ${navItemIds.slice(0,3).join(', ')}...`)
    : warn(`${navItemIds.length}/10 items dans #nav-list`);

  // Vérifier que navbar_order est chargé depuis Supabase
  const navbarOrder = await page.evaluate(async () => {
    try {
      const { data } = await supabaseClient.from('user_plans').select('navbar_order').eq('user_id', currentUser.id).single();
      return data?.navbar_order;
    } catch(e) { return null; }
  });
  navbarOrder !== null
    ? ok(`navbar_order colonne Supabase accessible (${navbarOrder ? 'ordre sauvegardé' : 'null = ordre par défaut'})`)
    : warn('navbar_order non récupéré depuis Supabase (colonne manquante ?)');

  // Espacement sidebar — vérifier que body est height:100vh
  const bodyHeight = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { height: s.height, overflow: s.overflow };
  });
  bodyHeight.height.includes('800') || bodyHeight.height.includes('100vh')
    ? ok(`Body height contrainte (${bodyHeight.height}) — espacement sidebar fixe`)
    : warn(`Body height = ${bodyHeight.height} (attendu 800px/100vh)`);

  // ── 7. INJECTION SECTEUR ──────────────────────────────────────
  console.log('\n── 7. INJECTION SECTEUR ──');

  const secteurActivite = await page.evaluate(() => typeof _secteurActivite !== 'undefined' ? _secteurActivite : '__undef__');
  if (secteurActivite === '__undef__') {
    fail('_secteurActivite non défini en JS');
  } else if (secteurActivite === null) {
    ok('_secteurActivite = null (secteur non configuré) — injection désactivée OK');
  } else {
    ok(`_secteurActivite = "${secteurActivite}"`);
  }

  // Vérifier que _secteurCtx() existe et fonctionne
  const secteurCtxFn = await page.evaluate(() => {
    if (typeof _secteurCtx !== 'function') return 'absent';
    const r = _secteurCtx();
    return { type: typeof r, empty: r === '' };
  });
  if (secteurCtxFn === 'absent') fail('Fonction _secteurCtx() absente');
  else if (secteurCtxFn.empty) ok('_secteurCtx() retourne "" (secteur null) — correct');
  else ok(`_secteurCtx() retourne un contexte secteur (${secteurCtxFn.type})`);

  // ── 8. NAVIGATION COMPLÈTE ────────────────────────────────────
  console.log('\n── 8. NAVIGATION COMPLÈTE ──');
  const sections = ['dashboard','contacts','agenda','activite','performance','postvente','messages','prospection','assistant','parametres'];
  for (const s of sections) {
    await page.evaluate(name => showSection(name), s);
    await wait(400);
    const active = await page.$(`#section-${s}.active`);
    active ? ok(`Section "${s}" active après navigation`) : fail(`Section "${s}" non active`);
  }

  // ── 9. AGENDA ────────────────────────────────────────────────
  console.log('\n── 9. AGENDA ──');
  await page.evaluate(() => showSection('agenda'));
  await wait(800);
  const rdvBtn = await page.$('button[onclick*="openRdvModal"], button[onclick*="RdvModal"]');
  rdvBtn ? ok('Bouton + Nouveau RDV présent') : fail('Bouton Nouveau RDV absent');
  const calGrid = await page.$('.cal-grid, #cal-grid, [class*="cal"]');
  calGrid ? ok('Grille calendrier présente') : warn('Grille calendrier non détectée');
  const upcomingTab = await page.$('button[onclick*="upcoming"], button[onclick*="Upcoming"], [onclick*="switchAgendaView"]');
  upcomingTab ? ok('Onglet "À venir" présent') : warn('Onglet À venir non détecté');

  // ── 10. POST-VENTE ────────────────────────────────────────────
  console.log('\n── 10. POST-VENTE ──');
  await page.evaluate(() => showSection('postvente'));
  await wait(600);
  const pvContent = await page.$('#pv-content, #section-postvente .pv-');
  pvContent ? ok('Contenu post-vente chargé') : warn('Contenu post-vente non détecté');
  const markDoneBtn = await page.$('button[onclick*="markRdvDone"]');
  markDoneBtn ? ok('Bouton "✓ Fait" présent sur un RDV') : warn('Aucun bouton Fait (aucun RDV en retard)');

  // ── 11. ASSISTANT IA ──────────────────────────────────────────
  console.log('\n── 11. ASSISTANT IA ──');
  await page.evaluate(() => showSection('assistant'));
  await wait(800);
  const aiContent = await page.$('#ai-content');
  const aiGate    = await page.$('#ai-gate');
  if (aiContent) {
    const aiDisplay = await aiContent.evaluate(el => getComputedStyle(el).display);
    aiDisplay !== 'none' ? ok('Assistant IA section visible (plan Pro)') : warn('Assistant IA section masquée (plan insuffisant ?)');
    const aiInput = await page.$('#ai-input, .ai-input');
    aiInput ? ok('Input chat assistant présent') : warn('Input chat absent');
    const aiMessages = await page.$('#ai-messages, .ai-messages');
    aiMessages ? ok('Zone messages assistant présente') : warn('Zone messages absente');
    const statsBar = await page.$('.ai-stats-bar, [class*="stats"]');
    statsBar ? ok('Stats bar assistant présente') : warn('Stats bar non détectée');
  } else if (aiGate) {
    ok('Gating assistant IA actif (plan insuffisant) — comportement correct');
  } else {
    fail('Ni ai-content ni ai-gate trouvé');
  }

  // ── 12. PARAMÈTRES ────────────────────────────────────────────
  console.log('\n── 12. PARAMÈTRES ──');
  await page.evaluate(() => showSection('parametres'));
  await wait(600);
  const settingsName = await page.$('#settings-name');
  settingsName ? ok('Champ nom présent dans Paramètres') : fail('Champ nom absent');
  const settingsSecteur = await page.$('#settings-secteur');
  settingsSecteur ? ok('Champ secteur d\'activité présent dans Paramètres') : fail('Champ secteur absent (config IA)');
  const exportBtn = await page.$('button[onclick*="exportContacts"]');
  exportBtn ? ok('Bouton export Excel présent') : warn('Bouton export absent (plan insuffisant ?)');
  const iaCard = await page.$('#settings-ia-card');
  iaCard ? ok('Carte config IA présente (plan Pro)') : warn('Carte config IA absente (plan Free ou non Pro)');

  // ── 13. PLAN GATING ──────────────────────────────────────────
  console.log('\n── 13. PLAN GATING ──');
  const planBadge = await page.$('#plan-badge-sidebar');
  const planText  = planBadge ? (await planBadge.textContent()).trim() : '';
  ok(`Plan actif : "${planText}"`);

  const isFree = planText.toLowerCase().includes('free');
  if (isFree) {
    await page.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });
    await page.evaluate(() => { const h = window.showSection; if (h) h('performance'); });
    await wait(500);
    const upgradeOpen = await page.$('#modal-upgrade.open');
    upgradeOpen ? ok('Performance bloquée en plan Free → modal upgrade ✓') : fail('Performance accessible en Free — plan gating cassé !');
    await page.evaluate(() => { const m = document.getElementById('modal-upgrade'); if (m) m.classList.remove('open'); });
  } else {
    ok(`Plan ${planText} — plan gating non testé (non Free)`);
  }

  // ── 14. LIGHT MODE ────────────────────────────────────────────
  console.log('\n── 14. LIGHT MODE ──');
  const darkBg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dark').trim());
  const isDark = darkBg.includes('080c') || darkBg.includes('0e14') || darkBg.includes('141c');
  isDark ? fail(`Dark mode détecté (--dark: ${darkBg}) — NE PAS INTRODUIRE`) : ok(`Light mode confirmé (--dark: ${darkBg})`);

  // ── 15. ERREURS JS ────────────────────────────────────────────
  console.log('\n── 15. ERREURS JS ──');
  const totalErrors = jsErrors.length;
  totalErrors === 0 ? ok('Aucune erreur JS console') : fail(`${totalErrors} erreur(s) JS détectée(s) : ${jsErrors.slice(0,3).join(' | ')}`);

  // ── 16. API SÉCURITÉ ──────────────────────────────────────────
  console.log('\n── 16. API SÉCURITÉ ──');
  const apiResp = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 5, messages: [{ role: 'user', content: 'test' }] })
      });
      return { status: r.status };
    } catch(e) { return { status: 'fetch_error', err: e.message }; }
  });
  apiResp.status === 401 ? ok('API /api/claude sans token → 401 ✓') : fail(`API /api/claude sans token → ${apiResp.status} (attendu 401)`);

  // ── RAPPORT FINAL ─────────────────────────────────────────────
  console.log('\n' + '═'.repeat(56));
  console.log('RAPPORT FINAL — BACKTEST SPRINT COMPLET');
  console.log('═'.repeat(56));
  const passed = results.filter(r => r.s === '✅').length;
  const warned = results.filter(r => r.s === '⚠️').length;
  const failed = results.filter(r => r.s === '❌').length;
  console.log(`\n  ✅  ${passed} validés`);
  console.log(`  ⚠️   ${warned} avertissements`);
  console.log(`  ❌  ${failed} échecs\n`);

  if (warned > 0) {
    console.log('Avertissements :');
    results.filter(r => r.s === '⚠️').forEach(r => console.log('  ⚠️ ', r.label));
  }
  if (failed > 0) {
    console.log('\nÉchecs :');
    results.filter(r => r.s === '❌').forEach(r => console.log('  ❌', r.label));
  }

  console.log('\nFichiers modifiés ce sprint :');
  console.log('  • dashboard.html — toutes les features ci-dessus');
  console.log('  • signup.html — toggle visibilité mot de passe');
  console.log('  • supabase_migration_004_navbar_order.sql — colonne navbar_order\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
