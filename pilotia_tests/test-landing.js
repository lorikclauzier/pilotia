// Test landing page pylotIA — backtest complet
// Usage: node pilotia_tests/test-landing.js
// Ou sur prod: BASE_URL=https://pilotia.vercel.app node pilotia_tests/test-landing.js

const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'https://pilotia.vercel.app';

const results = [];
let passed = 0, failed = 0, warned = 0;
function ok(label)   { results.push({ s: '✅', label }); console.log('✅', label); passed++; }
function warn(label) { results.push({ s: '⚠️', label }); console.log('⚠️', label); warned++; }
function fail(label) { results.push({ s: '❌', label }); console.log('❌', label); failed++; }
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // ─── 1. CHARGEMENT ────────────────────────────────────────────────────────
  console.log('\n── CHARGEMENT ──');
  await page.goto(BASE + '/index.html');
  await wait(1500);

  const title = await page.title();
  title.toLowerCase().includes('pylotia') || title.toLowerCase().includes('crm')
    ? ok('Title contient pylotIA / CRM : ' + title)
    : fail('Title inattendu : ' + title);

  // Vérif pas de dark mode (#080c14, #0e1420, #141c2e)
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const isDark = bodyBg.includes('8, 12, 20') || bodyBg.includes('14, 20, 32') || bodyBg.includes('20, 28, 46');
  isDark ? fail('Dark mode détecté sur body — interdit') : ok('Light mode confirmé (pas de fond sombre)');

  // ─── 2. NAV ───────────────────────────────────────────────────────────────
  console.log('\n── NAV ──');

  const logo = await page.$('.nav-logo');
  if (logo) {
    const logoText = await logo.textContent();
    logoText.includes('pylot') && logoText.includes('IA') ? ok('Logo pylotIA présent') : fail('Logo incorrect : ' + logoText);
  } else fail('Logo .nav-logo absent');

  // Liens nav
  for (const [label, selector] of [
    ['Fonctionnalités', 'a[href="#features"]'],
    ['Tarifs', 'a[href="#pricing"]'],
    ['Démo', 'a[href="#demo"]'],
    ['Contact', 'a[href="#contact"]'],
  ]) {
    const el = await page.$(selector);
    el ? ok('Lien nav "' + label + '" présent') : fail('Lien nav "' + label + '" MANQUANT');
  }

  // Bouton langue
  const langBtn = await page.$('#lang-btn');
  langBtn ? ok('Bouton langue #lang-btn présent') : fail('Bouton langue absent');

  // Bouton Se connecter → login.html
  const navLogin = await page.$('.nav-login');
  if (navLogin) {
    const href = await navLogin.getAttribute('href');
    href && href.includes('login') ? ok('Bouton "Se connecter" → login.html') : fail('Bouton "Se connecter" mauvaise URL : ' + href);
  } else fail('.nav-login absent');

  // Bouton CTA nav → signup.html
  const navCta = await page.$('.nav-cta');
  if (navCta) {
    const href = await navCta.getAttribute('href');
    href && href.includes('signup') ? ok('Bouton CTA nav → signup.html') : fail('Bouton CTA nav mauvaise URL : ' + href);
    // Vérif couleur teal
    const bg = await navCta.evaluate(el => getComputedStyle(el).backgroundColor);
    bg.includes('13, 148, 136') ? ok('CTA nav couleur teal (0D9488) ✓') : warn('CTA nav couleur non teal : ' + bg);
  } else fail('.nav-cta absent');

  // ─── 3. HERO ──────────────────────────────────────────────────────────────
  console.log('\n── HERO ──');

  const heroBadge = await page.$('.hero-badge');
  heroBadge ? ok('Hero badge présent') : fail('Hero badge absent');

  const h1 = await page.$('h1');
  if (h1) {
    const h1Text = await h1.textContent();
    h1Text.length > 5 ? ok('H1 présent : "' + h1Text.trim().substring(0, 50) + '"') : fail('H1 vide');
  } else fail('H1 absent');

  const heroSub = await page.$('.hero-sub');
  heroSub ? ok('Hero sous-titre (.hero-sub) présent') : fail('Hero sous-titre absent');

  // Bouton principal → signup.html
  const heroCtaMain = await page.$('.hero-actions .btn-main');
  if (heroCtaMain) {
    const href = await heroCtaMain.getAttribute('href');
    href && href.includes('signup') ? ok('Hero CTA principal → signup.html') : fail('Hero CTA principal mauvaise URL : ' + href);
  } else fail('Hero CTA principal absent');

  // Bouton ghost → ouvre modal devis
  const heroCtaGhost = await page.$('.hero-actions .btn-ghost');
  heroCtaGhost ? ok('Hero CTA ghost "Demander une démo" présent') : fail('Hero CTA ghost absent');

  // Social proof
  const heroProof = await page.$('.hero-proof');
  if (heroProof) {
    const proofText = await heroProof.textContent();
    proofText.includes('127') ? ok('Social proof "127 entreprises" présent') : warn('Social proof sans "127" : ' + proofText);
  } else fail('.hero-proof absent');

  // Screenshot
  const heroImg = await page.$('.hero-screenshot img');
  if (heroImg) {
    const src = await heroImg.getAttribute('src');
    src ? ok('Screenshot hero présent (src=' + src.substring(0, 40) + ')') : fail('Screenshot hero sans src');
    // Vérif tilt perspective
    const transform = await heroImg.evaluate(el => getComputedStyle(el).transform);
    transform && transform !== 'none' ? ok('Hero screenshot a un transform (perspective/tilt) ✓') : warn('Hero screenshot sans transform CSS');
  } else fail('Screenshot hero absent');

  // ─── 4. SECTEURS BAR ──────────────────────────────────────────────────────
  console.log('\n── SECTEURS BAR ──');
  const secteursBar = await page.$('.secteurs-bar');
  secteursBar ? ok('Barre secteurs présente') : fail('Barre secteurs absente');

  const secteursLabel = await page.$('.secteurs-label');
  if (secteursLabel) {
    const t = await secteursLabel.textContent();
    t.includes('Fait pour') ? ok('Label "Fait pour →" présent') : warn('Label secteurs inattendu : ' + t);
  }

  const pills = await page.$$('.secteur-pill');
  pills.length >= 5 ? ok(`${pills.length} pills secteurs présentes`) : fail(`Seulement ${pills.length} pills secteurs (attendu ≥5)`);

  for (const name of ['Immobilier', 'BTP', 'Commerce', 'Formation', 'Santé']) {
    const found = await page.locator('.secteur-pill', { hasText: name }).count();
    found > 0 ? ok('Pill secteur "' + name + '" présente') : fail('Pill secteur "' + name + '" MANQUANTE');
  }

  // ─── 5. SECTION PROBLÈME ──────────────────────────────────────────────────
  console.log('\n── SECTION PROBLÈME ──');
  const probSection = await page.$('.prob-section');
  probSection ? ok('Section problème présente') : fail('Section problème absente');

  const stats = await page.$$('.prob-stat-num');
  if (stats.length >= 3) {
    ok(`${stats.length} statistiques problème trouvées`);
    for (const [i, expected] of ['67%', '3h', '1/4'].entries()) {
      const text = await stats[i]?.textContent();
      text && text.includes(expected.replace('%', '').replace('h', ''))
        ? ok(`Stat ${i+1} = "${text.trim()}" ✓`)
        : warn(`Stat ${i+1} inattendue : "${text?.trim()}" (attendu : ${expected})`);
    }
  } else fail(`Seulement ${stats.length} stat(s) problème (attendu 3)`);

  // ─── 6. SECTION SOLUTION ──────────────────────────────────────────────────
  console.log('\n── SECTION SOLUTION ──');
  const solSection = await page.$('.solution-section');
  solSection ? ok('Section solution présente') : fail('Section solution absente');

  const solItems = await page.$$('.sol-item');
  solItems.length >= 3 ? ok(`${solItems.length} bénéfices solution présents`) : fail(`Seulement ${solItems.length} bénéfice(s) solution`);

  // ─── 7. RÉSULTATS ─────────────────────────────────────────────────────────
  console.log('\n── RÉSULTATS ──');
  const resultsSection = await page.$('.results-section');
  resultsSection ? ok('Section résultats présente') : warn('Section résultats absente');

  const resultCards = await page.$$('.result-card');
  resultCards.length >= 3 ? ok(`${resultCards.length} cartes résultats présentes`) : warn(`${resultCards.length} carte(s) résultats`);

  // ─── 8. AVANT / APRÈS ─────────────────────────────────────────────────────
  console.log('\n── AVANT/APRÈS ──');
  const baSection = await page.$('.ba-section');
  baSection ? ok('Section Avant/Après présente') : fail('Section Avant/Après absente');

  const baBefore = await page.$('.ba-before');
  const baAfter = await page.$('.ba-after');
  baBefore && baAfter ? ok('Colonnes Avant et Après présentes') : fail('Colonnes Avant/Après incomplètes');

  // ─── 9. DÉMO INTERACTIVE ──────────────────────────────────────────────────
  console.log('\n── DÉMO INTERACTIVE ──');
  const demoSection = await page.$('#demo');
  demoSection ? ok('Section démo (#demo) présente') : fail('Section démo absente');

  const appTabs = await page.$$('.app-tab');
  appTabs.length === 7 ? ok(`7 onglets démo trouvés ✓`) : fail(`${appTabs.length} onglet(s) démo (attendu 7)`);

  // Onglet actif au départ = Dashboard
  const activeTab = await page.$('.app-tab.active');
  if (activeTab) {
    const activeTxt = await activeTab.textContent();
    activeTxt.toLowerCase().includes('dashboard') ? ok('Onglet Dashboard actif par défaut') : warn('Onglet actif par défaut : ' + activeTxt);
  } else fail('Aucun onglet actif par défaut');

  // Test clic sur chaque onglet
  const tabNames = ['Dashboard', 'Contacts', 'Agenda', 'Activité', 'Campagnes', 'Relances', 'Assistant IA'];
  const tabIds = ['tab-dashboard', 'tab-contacts', 'tab-agenda', 'tab-activite', 'tab-campagnes', 'tab-relances', 'tab-assistant'];
  for (let i = 0; i < appTabs.length; i++) {
    await appTabs[i].click();
    await wait(200);
    const panel = await page.$('#' + tabIds[i]);
    if (panel) {
      const display = await panel.evaluate(el => el.style.display);
      display !== 'none' ? ok(`Tab "${tabNames[i]}" → panel visible`) : fail(`Tab "${tabNames[i]}" → panel MASQUÉ`);
    } else fail(`Panel #${tabIds[i]} absent`);
    // Vérif onglet actif
    const isActive = await appTabs[i].evaluate(el => el.classList.contains('active'));
    isActive ? ok(`Tab "${tabNames[i]}" a la classe .active`) : fail(`Tab "${tabNames[i]}" n'a pas .active`);
  }
  // Revenir au premier tab
  await appTabs[0].click();
  await wait(200);

  // ─── 10. FEATURES ─────────────────────────────────────────────────────────
  console.log('\n── FEATURES ──');
  const featSection = await page.$('#features, .features-section');
  featSection ? ok('Section features présente') : fail('Section features absente');

  const featureCards = await page.$$('.feature-card');
  featureCards.length >= 4 ? ok(`${featureCards.length} cartes features présentes`) : fail(`${featureCards.length} carte(s) features (attendu ≥4)`);

  // ─── 11. PRICING ──────────────────────────────────────────────────────────
  console.log('\n── PRICING ──');
  const pricingSection = await page.$('#pricing, .pricing-section');
  pricingSection ? ok('Section pricing présente') : fail('Section pricing absente');

  const planCards = await page.$$('.plan-card');
  planCards.length === 3 ? ok('3 cartes pricing présentes (Gratuit, Starter, Pro)') : fail(`${planCards.length} carte(s) pricing (attendu 3)`);

  // Carte Pro highlighted
  const featuredCard = await page.$('.plan-card.featured');
  if (featuredCard) {
    const cardText = await featuredCard.textContent();
    ok('Carte featured (Pro) présente');
    // Vérif badge "Le plus populaire"
    const featuredTag = await page.$('.featured-tag');
    featuredTag ? ok('Badge "Le plus populaire" présent') : warn('Badge featured-tag absent');
  } else fail('Aucune carte featured (.plan-card.featured)');

  // Business row
  const bizRow = await page.$('.biz-cta-row');
  bizRow ? ok('Ligne Business (biz-cta-row) présente') : fail('Ligne Business absente');

  // Bouton Gratuit → signup.html
  const freeCta = await page.$('.cta-outline');
  if (freeCta) {
    const tag = await freeCta.evaluate(el => el.tagName.toLowerCase());
    tag === 'a' || tag === 'button' ? ok('CTA Gratuit présent (tag=' + tag + ')') : warn('CTA Gratuit tag inattendu : ' + tag);
  }

  // Boutons Starter/Pro : "Rejoindre la liste d'attente" ou "Prochainement"
  const waitlistBtns = await page.$$('.plan-cta-waitlist');
  const comingBtns = await page.$$('.plan-cta-coming');
  waitlistBtns.length + comingBtns.length > 0
    ? ok(`${waitlistBtns.length} bouton(s) waitlist + ${comingBtns.length} bouton(s) "prochainement" trouvés`)
    : warn('Aucun bouton waitlist / prochainement dans le pricing');

  // Business → Demander un devis
  const bizBtn = await page.$('.biz-cta-row .cta-blue');
  bizBtn ? ok('Bouton "Demander un devis" dans la ligne Business') : fail('Bouton "Demander un devis" absent');

  // ─── 12. FAQ ──────────────────────────────────────────────────────────────
  console.log('\n── FAQ ──');
  const faqSection = await page.$('.faq-section');
  faqSection ? ok('Section FAQ présente') : fail('Section FAQ absente');

  const faqItems = await page.$$('.faq-item');
  faqItems.length >= 4 ? ok(`${faqItems.length} questions FAQ présentes`) : warn(`${faqItems.length} question(s) FAQ`);

  // Clic sur une question FAQ → réponse visible
  if (faqItems.length > 0) {
    await faqItems[0].click();
    await wait(300);
    const ans = await page.$('.faq-answer');
    if (ans) {
      const display = await ans.evaluate(el => getComputedStyle(el).display);
      display !== 'none' ? ok('FAQ : clic ouvre la réponse') : warn('FAQ : réponse non visible après clic');
    }
  }

  // ─── 13. SECTION CTA FINAL ────────────────────────────────────────────────
  console.log('\n── CTA FINAL ──');
  const ctaSection = await page.$('.cta-section');
  if (ctaSection) {
    ok('Section CTA finale présente');
    const ctaBg = await ctaSection.evaluate(el => getComputedStyle(el).backgroundColor);
    ctaBg.includes('13, 148, 136') ? ok('CTA section fond teal (0D9488) ✓') : warn('CTA section fond non teal : ' + ctaBg);
    const ctaBtn = await ctaSection.$('.btn-main-white, a[href*="signup"]');
    ctaBtn ? ok('Bouton CTA final présent') : fail('Bouton CTA final absent');
  } else fail('Section CTA finale absente');

  // ─── 14. CONTACT ──────────────────────────────────────────────────────────
  console.log('\n── CONTACT ──');
  const contactSection = await page.$('#contact, .contact-section');
  contactSection ? ok('Section contact présente') : fail('Section contact absente');

  const contactForm = await page.$('.contact-form, form');
  if (contactForm) {
    ok('Formulaire contact présent');
    const nameInput = await contactForm.$('input[name="name"], input[type="text"]');
    const emailInput = await contactForm.$('input[name="email"], input[type="email"]');
    const msgTextarea = await contactForm.$('textarea');
    const submitBtn = await contactForm.$('button[type="submit"]');
    nameInput ? ok('Champ nom présent') : warn('Champ nom absent');
    emailInput ? ok('Champ email présent') : warn('Champ email absent');
    msgTextarea ? ok('Champ message présent') : warn('Champ message absent');
    submitBtn ? ok('Bouton envoyer présent') : fail('Bouton envoyer absent');
  } else warn('Formulaire contact absent');

  // ─── 15. FOOTER ───────────────────────────────────────────────────────────
  console.log('\n── FOOTER ──');
  const footer = await page.$('footer');
  if (footer) {
    ok('Footer présent');
    const footerBg = await footer.evaluate(el => getComputedStyle(el).backgroundColor);
    // Fond dark footer : #111827 = rgb(17, 24, 39)
    footerBg.includes('17, 24, 39') || footerBg.includes('17,24,39')
      ? ok('Footer fond sombre (111827) ✓')
      : warn('Footer fond inattendu : ' + footerBg);

    // Liens légaux
    for (const [label, path] of [['CGU', 'cgu'], ['Mentions légales', 'mentions']]) {
      const link = await footer.$('a[href*="' + path + '"]');
      link ? ok('Footer lien "' + label + '" présent') : warn('Footer lien "' + label + '" absent');
    }

    // Texte © 2026
    const footerText = await footer.textContent();
    footerText.includes('2026') ? ok('Footer contient "2026"') : warn('Footer pas de "2026"');
  } else fail('Footer absent');

  // ─── 16. LANGUE (FR → EN) ─────────────────────────────────────────────────
  console.log('\n── BASCULE LANGUE ──');
  const langBtnEl = await page.$('#lang-btn');
  if (langBtnEl) {
    const beforeText = await langBtnEl.textContent();
    await langBtnEl.click();
    await wait(400);
    const afterText = await langBtnEl.textContent();
    beforeText !== afterText ? ok(`Langue basculée : "${beforeText}" → "${afterText}"`) : fail('Bouton langue ne change pas');

    // Vérif changement de contenu
    const navFeatures = await page.$('a[href="#features"]');
    const navText = navFeatures ? await navFeatures.textContent() : '';
    navText.toLowerCase().includes('features') || navText.toLowerCase().includes('function')
      ? ok('Navigation traduite en anglais ✓')
      : warn('Traduction nav non vérifiable : ' + navText);

    // Remettre en FR
    await langBtnEl.click();
    await wait(300);
  } else warn('Bouton langue absent — test bascule ignoré');

  // ─── 17. MODAL DEVIS ──────────────────────────────────────────────────────
  console.log('\n── MODAL DEVIS ──');
  // Ouvrir via le bouton hero ghost
  const ghostBtn = await page.$('.hero-actions .btn-ghost');
  if (ghostBtn) {
    await ghostBtn.click();
    await wait(500);
    // Utiliser #devis-modal directement (pas .modal-overlay qui matcherait #waitlist-modal en premier)
    const devisModal = await page.$('#devis-modal');
    if (devisModal) {
      const isOpen = await devisModal.evaluate(el => el.classList.contains('open'));
      isOpen
        ? ok('Modal devis ouvre via "Demander une démo" ✓')
        : fail('Modal devis classe .open absente après clic');

      // Fermeture via bouton ×
      const closeBtn = await page.$('#devis-modal [onclick*="closeDevis"]');
      if (closeBtn) {
        await closeBtn.click();
        await wait(300);
        const isClosed = await devisModal.evaluate(el => !el.classList.contains('open'));
        isClosed ? ok('Modal devis fermé via bouton ×') : warn('Modal devis toujours ouvert après ×');
      } else {
        // Forcer la fermeture via JS
        await page.evaluate(() => closeDevisModal());
        await wait(200);
        warn('Fermeture modal via JS (bouton × non trouvé)');
      }
    } else warn('Modal #devis-modal non trouvé dans le DOM');
  } else warn('Bouton "Demander une démo" absent — test modal ignoré');

  // ─── 18. MODAL WAITLIST ───────────────────────────────────────────────────
  console.log('\n── MODAL WAITLIST ──');
  const waitlistBtn = await page.$('.plan-cta-waitlist');
  if (waitlistBtn) {
    await waitlistBtn.scrollIntoViewIfNeeded();
    await waitlistBtn.click();
    await wait(500);
    const waitlistModal = await page.$('#waitlist-modal');
    if (waitlistModal) {
      const isOpen = await waitlistModal.evaluate(el => el.classList.contains('open'));
      isOpen ? ok('Modal waitlist ouvre (.open présente)') : warn('Modal waitlist classe .open absente');
      // Fermer via JS (pas de listener Escape sur les modals)
      await page.evaluate(() => closeWaitlistModal());
      await wait(300);
      const isClosed = await waitlistModal.evaluate(el => !el.classList.contains('open'));
      isClosed ? ok('Modal waitlist fermé correctement') : warn('Modal waitlist toujours ouvert après fermeture');
    } else warn('Modal #waitlist-modal non trouvé');
  } else warn('Bouton waitlist absent — test ignoré');

  // ─── 19. CHATBOT FLOTTANT ─────────────────────────────────────────────────
  console.log('\n── CHATBOT ──');
  const chatBtn = await page.$('#chat-btn, .chat-btn, [id*="chat"]');
  if (chatBtn) {
    ok('Bouton chatbot présent');
    await chatBtn.click();
    await wait(400);
    const chatWindow = await page.$('#chat-window, .chat-window, [id*="chat-window"]');
    chatWindow
      ? ok('Fenêtre chatbot s\'ouvre au clic')
      : warn('Fenêtre chatbot non visible après clic');
    // Refermer
    const closeChatBtn = await page.$('#close-chat, [onclick*="closeChat"]');
    if (closeChatBtn) {
      await closeChatBtn.click();
      await wait(200);
    }
  } else warn('Bouton chatbot non trouvé');

  // ─── 20. MOBILE MENU ──────────────────────────────────────────────────────
  console.log('\n── MENU MOBILE ──');
  // Simuler mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await wait(300);

  const hamburger = await page.$('#hamburger, .hamburger');
  if (hamburger) {
    ok('Bouton hamburger présent');
    const visible = await hamburger.isVisible();
    visible ? ok('Hamburger visible sur mobile') : warn('Hamburger non visible sur 375px');
    await hamburger.click();
    await wait(300);
    const mobileMenu = await page.$('#mobile-menu, .mobile-menu');
    if (mobileMenu) {
      const isOpen = await mobileMenu.evaluate(el => el.classList.contains('open'));
      isOpen ? ok('Menu mobile s\'ouvre') : warn('Menu mobile classe .open absente après clic');
    } else warn('Menu mobile non trouvé');
    // Fermer
    await hamburger.click();
    await wait(200);
  } else warn('Hamburger non trouvé');

  // Revenir desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await wait(300);

  // ─── 21. VÉRIFICATIONS CSS TEAL ───────────────────────────────────────────
  console.log('\n── PALETTE TEAL ──');
  const tealColor = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--blue').trim();
  });
  tealColor.includes('0D9488') || tealColor.includes('#0d9488')
    ? ok('Variable CSS --blue = ' + tealColor + ' (teal ✓)')
    : fail('Variable CSS --blue inattendue : ' + tealColor);

  // Pas de Syne dans les polices
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  fontFamily.toLowerCase().includes('syne')
    ? fail('Font "Syne" encore présente — doit être Inter uniquement')
    : ok('Pas de Syne — Inter uniquement ✓');

  // ─── 22. RESPONSIVE — PAS DE SCROLL HORIZONTAL ────────────────────────────
  console.log('\n── RESPONSIVE ──');
  await page.setViewportSize({ width: 375, height: 812 });
  await wait(400);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewWidth = await page.evaluate(() => window.innerWidth);
  bodyWidth <= viewWidth + 5
    ? ok(`Pas de scroll horizontal sur mobile (body=${bodyWidth}px, vp=${viewWidth}px)`)
    : fail(`Scroll horizontal détecté sur mobile (body=${bodyWidth}px > vp=${viewWidth}px)`);
  await page.setViewportSize({ width: 1280, height: 800 });

  // ─── 23. ANCRES DE NAVIGATION ─────────────────────────────────────────────
  console.log('\n── ANCRES ──');
  for (const [anchor, label] of [['#features', 'Features'], ['#pricing', 'Pricing'], ['#demo', 'Demo'], ['#contact', 'Contact']]) {
    const el = await page.$(anchor);
    el ? ok(`Ancre ${anchor} existe dans le DOM`) : fail(`Ancre ${anchor} MANQUANTE`);
  }

  // ─── 24. IMAGES ───────────────────────────────────────────────────────────
  console.log('\n── IMAGES ──');
  const images = await page.$$('img');
  ok(`${images.length} image(s) trouvée(s)`);
  for (const img of images) {
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    if (!alt || alt === 'image') {
      warn(`Image sans alt correct : src="${src?.substring(0, 40)}"`);
    }
  }

  // ─── 25. LIENS FOOTER → PAGES LÉGALES ─────────────────────────────────────
  console.log('\n── PAGES LÉGALES ──');
  const cguLink = await page.$('a[href*="cgu"]');
  if (cguLink) {
    const href = await cguLink.getAttribute('href');
    const resp = await page.request.get(BASE + '/' + href.replace(/^\//, ''));
    resp.status() < 400 ? ok('Page CGU accessible (HTTP ' + resp.status() + ')') : fail('Page CGU → HTTP ' + resp.status());
  } else warn('Lien CGU non trouvé');

  const mentionsLink = await page.$('a[href*="mentions"]');
  if (mentionsLink) {
    const href = await mentionsLink.getAttribute('href');
    const resp = await page.request.get(BASE + '/' + href.replace(/^\//, ''));
    resp.status() < 400 ? ok('Page Mentions légales accessible (HTTP ' + resp.status() + ')') : fail('Page Mentions légales → HTTP ' + resp.status());
  } else warn('Lien Mentions légales non trouvé');

  // ─── RÉSUMÉ ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`RÉSULTAT LANDING : ${passed} ✅  ${warned} ⚠️  ${failed} ❌  (total: ${passed + warned + failed})`);
  if (failed > 0) {
    console.log('\nÉCHECS :');
    results.filter(r => r.s === '❌').forEach(r => console.log('  ❌', r.label));
  }
  if (warned > 0) {
    console.log('\nAVERTISSEMENTS :');
    results.filter(r => r.s === '⚠️').forEach(r => console.log('  ⚠️', r.label));
  }
  console.log('══════════════════════════════════════════════════');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
