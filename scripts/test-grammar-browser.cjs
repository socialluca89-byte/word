// Grammar is exercised through the real local UI and disposable synthetic profiles.
const {chromium} = require(process.env.WORDYLAND_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const base = process.env.WORDYLAND_TEST_URL;
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Disposable localhost only');
const origin = new URL(base).origin;
const catalog = JSON.parse(fs.readFileSync('dist/training.json', 'utf8')).grammarLessons;
assert(catalog && catalog.packs.length === 5 && catalog.nouns.length === 16);
const cases = new Map(catalog.packs.flatMap(pack => pack.cases.map(row => [row.id, row])));
const captures = process.env.WORDYLAND_GRAMMAR_SCREENSHOTS;
if (captures) {
  assert(['/workspace/', '/tmp/'].some(root => path.resolve(captures).startsWith(root)));
  fs.mkdirSync(captures, {recursive: true});
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.WORDYLAND_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const errors = [], guestWrites = [], checks = [], geometries = [], art = new Map();
  const shortAnswers = new Set(), articles = new Set(), sentenceStarts = new Set(), releases = new Set();
  let undoChecked = false;
  function gate() {
    let finish;
    const promise = new Promise(resolve => finish = resolve);
    const release = () => {releases.delete(release); finish();};
    releases.add(release);
    return {promise, release};
  }
  async function deadline(promise, label) {
    let timer;
    try {return await Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error(label + ' did not complete within 30000ms')), 30000);})]);}
    finally {clearTimeout(timer);}
  }
  async function page({width = 390, voices = false, context, staleStorage = false} = {}) {
    const p = context ? await context.newPage() : await browser.newPage({
      viewport: {width, height: width === 1360 ? 900 : 844}, hasTouch: true, reducedMotion: 'reduce'
    });
    await p.setViewportSize({width, height: width === 1360 ? 900 : 844});
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => {
      if (r.method() === 'POST' && new URL(r.url()).pathname === '/api.php') {
        if (p.grammarGuestOnly) guestWrites.push(new URL(r.url()).searchParams.get('action'));
      }
    });
    await p.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await p.addInitScript(({voices, staleStorage}) => {
      if (staleStorage) addEventListener('storage', event => event.stopImmediatePropagation(), true);
      const state = window.grammarVoiceFixture = {enabled: voices, hold: false, cancels: 0, spoken: [], pending: []};
      Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {
        getVoices: () => state.enabled ? [{name: 'Synthetic local English', voiceURI: 'grammar-test-en', lang: 'en-GB', localService: true}] : [],
        get speaking() {return state.pending.length > 0;},
        cancel() {state.cancels++; state.pending = [];},
        addEventListener() {},
        speak(u) {
          state.spoken.push(u.text); state.pending.push(u); u.onstart?.();
          if (!state.hold) queueMicrotask(() => {
            if (state.pending.includes(u)) {state.pending = state.pending.filter(item => item !== u); u.onend?.();}
          });
        }
      }});
      window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    }, {voices, staleStorage});
    return p;
  }
  const req = (p, action, data) => p.evaluate(({action, data}) => wordylandAccount.request(action, data), {action, data});
  const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('wordylandGrammarGuestV1')));
  const legacy = p => p.evaluate(() => ({
    storage: Object.fromEntries(Object.keys(localStorage).filter(key => !key.startsWith('wordylandGrammar')).sort().map(key => [key, localStorage.getItem(key)])),
    stats: structuredClone(stats), stars
  }));
  async function guest(p) {
    const token = await p.locator('#grammarHub').getAttribute('data-token');
    const data = await saved(p);
    const session = data.sessions.find(row => row.token === token);
    assert(session, 'The displayed guest token belongs to its dedicated saved store');
    return session;
  }
  async function menu(p, entry = '#openGrammarTraining') {
    await p.goto(base + (entry === '#classroomGrammarTraining' ? '/#dettato' : '/#allenamento'));
    await p.evaluate(() => wordylandAccount.ready);
    await p.locator(entry).click();
    await p.locator('#grammarMenu').waitFor();
    assert.equal(await p.locator('[data-grammar-pack]').count(), 5);
  }
  async function start(p, pack) {
    await p.locator('[data-grammar-pack="' + pack + '"]').click();
    await p.locator('#grammarHub[data-pack="' + pack + '"]').waitFor();
  }
  async function scene(p, q, {imageState = 'ready'} = {}) {
    const row = cases.get(q.grammar.id);
    assert(row, 'A displayed case is from the curated catalog');
    assert.equal(q.grammar.count, row.count);
    assert.equal(q.grammar.noun, row.noun);
    const objects = p.locator('#grammarObjects [data-grammar-object]');
    assert.equal(await objects.count(), row.count, 'Exactly one visual object per counted instance');
    const expectedArt = catalog.nouns.find(noun => noun.id === row.noun).art;
    assert.deepEqual(await objects.evaluateAll(nodes => nodes.map(node => node.dataset.grammarArt)), Array(row.count).fill(expectedArt));
    if (!expectedArt.startsWith('grammar-')) {
      assert.equal(await p.locator('#grammarObjects [data-word-art]').count(), row.count);
      await p.waitForFunction(state => [...document.querySelectorAll('#grammarObjects [data-word-art]')].every(node => node.dataset.artState === state), imageState);
      if (imageState === 'ready') assert(await p.locator('#grammarObjects image[data-art-src]').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display !== 'none' && Number(getComputedStyle(node).opacity) > 0)), 'The actual atlas image is visible, not only an object wrapper');
    }
    const label = await p.locator('#grammarObjects').getAttribute('aria-label');
    const escaped = row.answer.replace(/[.!?]+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert(label && (row.answer.length < 3 || !new RegExp('\\b' + escaped + '\\b', 'i').test(label)), 'Count-scene alternative text does not reveal the English answer');
    assert(!await objects.evaluateAll(nodes => nodes.some(node => node.textContent.includes('📚'))), 'A single book is not represented as a stack');
    if (!art.has(row.noun)) art.set(row.noun, await objects.first().evaluate(node => node.querySelector('svg')?.innerHTML || node.innerHTML));
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No grammar horizontal overflow');
  }
  async function token(p, text) {
    const id = await p.locator('[data-grammar-token]:not(:disabled)').evaluateAll((nodes, value) => nodes.find(node => node.textContent.trim() === value)?.dataset.grammarToken, text);
    assert.notEqual(id, undefined, 'A visible token exists for ' + text);
    await p.locator('[data-grammar-token="' + id + '"]').focus();
    await p.keyboard.press('Enter');
  }
  async function solve(p, q, {answer = q.answer, double = false} = {}) {
    if (q.mode === 'grammar-model') {
      if (double) await p.locator('#grammarModelContinue').dblclick();
      else await p.locator('#grammarModelContinue').click();
    } else if (q.mode === 'grammar-choice') {
      const exact = await p.locator('[data-grammar-choice]').evaluateAll((nodes, value) => nodes.find(node => node.dataset.grammarChoice === value)?.dataset.grammarChoice, answer);
      assert.notEqual(exact, undefined);
      await p.locator('[data-grammar-choice]').evaluateAll((nodes, value) => nodes.find(node => node.dataset.grammarChoice === value).focus(), exact);
      await p.keyboard.press('Enter');
    } else if (q.mode === 'grammar-write') {
      await p.locator('#grammarInput').fill(answer);
      if (double) await p.locator('#grammarCheck').dblclick();
      else await p.locator('#grammarCheck').click();
    } else if (q.mode === 'grammar-build') {
      assert.equal(await p.locator('#grammarBuildCheck').isEnabled(), false, 'An incomplete composition cannot be submitted');
      const words = (q.tokens || []).slice().sort();
      assert.deepEqual(words, q.answer.split(' ').sort(), 'The frozen tokens compose exactly the required phrase');
      if (!undoChecked) {
        await token(p, q.answer.split(' ')[0]);
        assert.equal(await p.locator('[data-grammar-picked]').count(), 1);
        await p.locator('#grammarUndo').click();
        assert.equal(await p.locator('[data-grammar-picked]').count(), 0);
        assert.equal(await p.locator('#grammarBuildCheck').isEnabled(), false);
        undoChecked = true;
      }
      for (const text of q.answer.split(' ')) await token(p, text);
      await p.locator('#grammarBuildCheck').click();
    } else assert.fail('Unsupported grammar mode ' + q.mode);
    await p.locator('#grammarFeedback[data-correct=true]').waitFor();
    await p.locator('#grammarNext').waitFor();
  }
  async function round(p, pack, {aliases = false, wrong = false, inspect = true} = {}) {
    await start(p, pack);
    let session = await guest(p), answerCount = 0, wrongDone = false, aliasCount = 0;
    while (!session.done) {
      assert(++answerCount <= 12, 'Each small grammar round is finite');
      const q = session.plan[session.step], before = session.step;
      if (q.grammar.phase === 'short-answer') shortAnswers.add(q.answer);
      if (q.grammar.phase === 'article') articles.add(q.answer);
      if (q.grammar.phase === 'sentence') sentenceStarts.add(q.answer.split(' ')[0]);
      if (inspect) await scene(p, q);
      if (wrong && !wrongDone && q.mode === 'grammar-choice') {
        const bad = q.choices.find(value => value !== q.answer);
        assert(bad);
        await p.locator('[data-grammar-choice]').evaluateAll((nodes, value) => nodes.find(node => node.dataset.grammarChoice === value).focus(), bad);
        await p.keyboard.press('Enter');
        await p.locator('#grammarFeedback[data-correct=false]').waitFor();
        assert.equal((await guest(p)).step, before);
        assert((await p.locator('#grammarFeedback').innerText()).includes(q.grammar.explanation), 'An error explains this specific singular/plural distinction');
        assert(await p.locator('#grammarFeedback .grammarFeedbackMark').evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 48), 'The error mark is large enough for a child');
        assert.equal(await p.locator('#grammarNext').count(), 0);
        wrongDone = true;
      }
      let answer = q.answer;
      if (aliases && q.mode === 'grammar-write' && q.aliases?.length) {answer = q.aliases[0].toUpperCase() + '.'; aliasCount++;}
      await solve(p, q, {answer});
      session = await guest(p);
      assert.equal(session.step, before + 1, 'One confirmation stores exactly one step');
      await p.locator('#grammarNext').click();
    }
    await p.locator('#grammarAgain').click();
    await p.locator('#grammarMenu').waitFor();
    return {aliasCount, wrongDone};
  }
  const shot = async (p, name) => {if (captures) await p.screenshot({path: path.join(captures, name + '.png')});};
  try {
    // Entry points and readable controls work at the three project viewports.
    for (const width of [320, 390, 1360]) {
      const p = await page({width}); p.grammarGuestOnly = true;
      await menu(p); const before = await legacy(p);
      const targets = await p.locator('[data-grammar-pack]').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node.querySelector('strong') || node);
        return {height: rect.height, font: parseFloat(style.fontSize)};
      }));
      assert(targets.every(rect => rect.height >= 48 && rect.font >= 18), 'Large menu actions ' + JSON.stringify({width, targets}));
      await shot(p, 'grammar-menu-' + width);
      if (width === 320) {
        const target = p.locator('[data-grammar-pack=number]'); await target.scrollIntoViewIfNeeded();
        const rect = await target.boundingBox(); await p.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
      } else {await p.locator('[data-grammar-pack=number]').focus(); await p.keyboard.press('Enter');}
      await p.locator('#grammarModelContinue').waitFor();
      let s = await guest(p); await scene(p, s.plan[s.step]);
      const next = await p.locator('#grammarModelContinue').evaluate(node => {
        const r = node.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, height: r.height, font: parseFloat(getComputedStyle(node).fontSize), viewport: innerHeight};
      });
      assert(next.height >= 48 && next.font >= 18, 'Model action remains readable');
      await shot(p, 'grammar-model-' + width); await solve(p, s.plan[s.step]); await p.locator('#grammarNext').click();
      s = await guest(p); await scene(p, s.plan[s.step]);
      assert.equal(await p.locator('#grammarModel').isVisible(), false, 'A practice answer starts concealed');
      await p.locator('#grammarPause').click(); await p.reload();
      await p.locator('#openGrammarTraining').click(); await p.locator('[data-grammar-resume="' + s.token + '"]').click();
      const restored = await guest(p); assert.equal(restored.step, s.step); assert.deepEqual(restored.plan, s.plan);
      assert.deepEqual(await legacy(p), before, 'Grammar preserves every legacy guest archive, wallet and game statistic');
      geometries.push({width, targets, modelAction: next}); await p.close();
    }
    checks.push('both classroom entry points, three viewports, large controls, exact scene counts, frozen pause/reload and untouched legacy state');

    const p = await page(); p.grammarGuestOnly = true; await menu(p, '#classroomGrammarTraining'); const before = await legacy(p);
    for (const pack of ['number', 'articles', 'sentences', 'questions']) {
      const result = await round(p, pack, {wrong: pack === 'number'});
      if (pack === 'number') assert(result.wrongDone);
    }
    await round(p, 'articles'); await round(p, 'sentences');
    assert.deepEqual([...shortAnswers].sort(), ["No, it isn't.", 'Yes, it is.'], 'Both positive and negative short answers are exercised');
    assert.deepEqual([...articles].sort(), ['a', 'an'], 'Both consonant and vowel articles are exercised');
    assert.deepEqual([...sentenceStarts].sort(), ['It', 'They'], 'Singular and plural sentence composition are exercised');
    // Rotation reaches every school object and exercises free-writing aliases.
    let aliasCount = 0;
    for (let index = 0; index < 7 && (art.size < 16 || aliasCount === 0); index++) aliasCount += (await round(p, 'plurals', {aliases: true})).aliasCount;
    assert.equal(art.size, 16, 'Repeated short paths reach all sixteen nouns rather than repeating the same three');
    assert(aliasCount > 0, 'A curated free-writing alias is accepted by the visible input');
    assert.notEqual(art.get('chair'), art.get('table'), 'Chair and table are visually distinct');
    assert.notEqual(art.get('desk'), art.get('table'), 'School desk and table are visually distinct');
    assert.deepEqual(await legacy(p), before); await shot(p, 'grammar-completed-390'); await p.close();
    checks.push('five finite paths, wrong-answer explanation, sentence/question keyboard composition, both short answers, sixteen distinct objects and plural aliases');

    // A failed preferred atlas loads the local PNG; two failures stay explicit.
    for (const both of [false, true]) {
      const images = await page(); images.grammarGuestOnly = true; const imageRequests = [];
      images.on('request', request => {if (/\/classroom-objects\.(?:webp|png)(?:\?|$)/.test(request.url())) imageRequests.push(new URL(request.url()).pathname);});
      await images.route(both ? /\/classroom-objects\.(?:webp|png)(?:\?|$)/ : /\/classroom-objects\.webp(?:\?|$)/, route => route.abort('failed'));
      await menu(images); await start(images, 'number'); const s = await guest(images);
      await scene(images, s.plan[s.step], {imageState: both ? 'fallback' : 'ready'});
      assert(imageRequests.includes('/classroom-objects.webp') && imageRequests.includes('/classroom-objects.png'), 'The preferred atlas and its PNG fallback were both exercised');
      if (both) {
        const labels = images.locator('#grammarObjects .trainingWordArtFallback:visible');
        assert.equal(await labels.count(), s.question?.grammar.count || s.plan[s.step].grammar.count);
        assert((await labels.first().innerText()).includes(s.plan[s.step].grammar.nounData.meaning), 'When both assets fail the visible fallback names the object in Italian');
      } else assert(await images.locator('#grammarObjects [data-word-art]').evaluateAll(nodes => nodes.every(node => /classroom-objects\.png(?:\?|$)/.test(node.dataset.artSource))), 'PNG is actually painted after the WebP failure');
      assert.equal((await guest(images)).step, 0); await shot(images, both ? 'grammar-images-missing-390' : 'grammar-png-fallback-390'); await images.close();
    }
    checks.push('preferred WebP failure loads the real PNG; a double image failure shows explicit Italian object labels without advancing');

    // Storage quota errors must not expose a model or advance an unsaved step.
    const quota = await page(); quota.grammarGuestOnly = true; await menu(quota); await start(quota, 'articles');
    let s = await guest(quota); await solve(quota, s.plan[s.step]); await quota.locator('#grammarNext').click();
    s = await guest(quota); assert.equal(s.plan[s.step].mode, 'grammar-choice'); const storeBefore = await quota.evaluate(() => localStorage.getItem('wordylandGrammarGuestV1'));
    await quota.evaluate(() => {
      window.realGrammarSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {if (key === 'wordylandGrammarGuestV1') throw new DOMException('Synthetic quota', 'QuotaExceededError'); return realGrammarSet.call(this, key, value);};
    });
    await quota.locator('#grammarRead').click(); await quota.locator('#grammarRecover').waitFor();
    assert.equal(await quota.locator('#grammarModel').isVisible(), false); assert.equal(await quota.evaluate(() => localStorage.getItem('wordylandGrammarGuestV1')), storeBefore);
    await quota.evaluate(() => Storage.prototype.setItem = realGrammarSet); await quota.locator('#grammarRecover').click();
    await quota.locator('#grammarRead').click(); await quota.locator('#grammarModel').waitFor();
    s = await guest(quota); assert.equal(s.hint, 2); assert.equal(s.helped, true);
    await quota.locator('#grammarPause').click(); await quota.reload(); await quota.locator('#openGrammarTraining').click(); await quota.locator('[data-grammar-resume="' + s.token + '"]').click();
    assert.equal((await guest(quota)).hint, 2); assert.equal(await quota.locator('#grammarModel').isVisible(), true); await quota.close();
    checks.push('quota failure reveals no unsaved answer; recovery confirms help before reveal and preserves it after reload');

    // A missed storage event cannot let a stale tab overwrite a newer step.
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce'});
    const a = await page({context}), b = await page({context, staleStorage: true}); a.grammarGuestOnly = b.grammarGuestOnly = true;
    await menu(a); await start(a, 'number'); const original = await guest(a);
    await menu(b); await b.locator('[data-grammar-resume="' + original.token + '"]').click();
    await solve(a, original.plan[0]); const advanced = await a.evaluate(() => localStorage.getItem('wordylandGrammarGuestV1'));
    await b.locator('#grammarModelContinue').click(); await b.locator('#grammarRecover').waitFor();
    assert.equal(await b.evaluate(() => localStorage.getItem('wordylandGrammarGuestV1')), advanced, 'The stale model cannot replace a newer saved step');
    await b.locator('#grammarRecover').click(); assert.equal((await guest(b)).step, 1); await context.close();
    checks.push('cross-tab stale state is reconciled without overwriting progress');

    // A new catalog must not rewrite a paused guest's object, quantity or answer.
    const frozenContext = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block'});
    const frozen = await page({context: frozenContext}); frozen.grammarGuestOnly = true; await menu(frozen); await start(frozen, 'number');
    s = await guest(frozen); await solve(frozen, s.plan[s.step]); await frozen.locator('#grammarNext').click();
    s = await guest(frozen); const frozenPlan = structuredClone(s.plan), oldRow = s.plan[s.step].grammar; await frozen.locator('#grammarPause').click();
    const changed = JSON.parse(fs.readFileSync('dist/training.json', 'utf8')), changedPack = changed.grammarLessons.packs.find(pack => pack.id === 'number'), changedRow = changedPack.cases.find(row => row.id === oldRow.id), noun = changed.grammarLessons.nouns.find(row => row.id === oldRow.noun);
    changedPack.title = 'Uno o tanti? Variante locale'; changedRow.count = oldRow.count === 1 ? 3 : 1;
    changedRow.answer = changedRow.count === 1 ? noun.singular : noun.plural; changedRow.tokens = [changedRow.answer]; changedRow.audio = changedRow.answer;
    changedRow.explanation = changedRow.count === 1 ? 'Nella variante locale vedi una sola cosa: ' + noun.singular + '.' : 'Nella variante locale vedi più cose: ' + noun.plural + '.';
    let catalogRequests = 0;
    await frozen.route('**/training.json*', route => {catalogRequests++; return route.fulfill({json: changed});});
    await frozen.reload(); await frozen.locator('#openGrammarTraining').click(); await frozen.locator('#grammarMenu').waitFor();
    assert(catalogRequests > 0, 'The updated local catalog fixture was actually loaded');
    assert.match(await frozen.locator('[data-grammar-pack=number]').innerText(), /Variante locale/);
    await frozen.locator('[data-grammar-resume="' + s.token + '"]').click();
    const preserved = await guest(frozen); assert.equal(preserved.step, s.step); assert.deepEqual(preserved.plan, frozenPlan, 'Resume keeps the complete original frozen plan across a valid catalog update');
    await scene(frozen, preserved.plan[preserved.step]); await frozenContext.close();
    checks.push('a valid catalog update leaves the paused guest plan, quantity, expected answer and phase unchanged');

    // Navigation between a local commit and its microtask reply cannot repaint.
    const departing = await page(); departing.grammarGuestOnly = true; await menu(departing); await start(departing, 'number'); const departureToken = (await guest(departing)).token;
    await departing.evaluate(token => {
      const originalSet = Storage.prototype.setItem;
      let navigated = false;
      Storage.prototype.setItem = function(key, value) {
        const result = originalSet.call(this, key, value);
        if (!navigated && key === 'wordylandGrammarGuestV1' && JSON.parse(value).sessions.some(row => row.token === token && row.step === 1)) {
          navigated = true;
          queueMicrotask(() => location.hash = '#allenati');
        }
        return result;
      };
    }, departureToken);
    await departing.locator('#grammarModelContinue').click();
    await departing.locator('.lessonCard').first().waitFor(); assert.equal(await departing.locator('#grammarHub:visible').count(), 0);
    assert.equal((await saved(departing)).sessions.find(row => row.token === departureToken).step, 1, 'A confirmed local commit is retained after immediate navigation');
    await departing.close(); checks.push('a guest commit followed immediately by navigation cannot paint a disposed route');

    // Real local requests: confirmed saves, held replies and profile isolation.
    const owned = await page({voices: true}); await owned.goto(base + '/#allenamento'); await owned.evaluate(() => wordylandAccount.ready);
    const profile = await owned.evaluate(async () => {
      const a = wordylandAccount;
      await a.connect(await a.request('register', {username: 'grammar_browser_parent', password: 'Grammar-browser-synthetic-123', adult: true}));
      return a.createProfile('Grammatica prova');
    });
    await owned.locator('#openGrammarTraining').click(); await start(owned, 'articles');
    let seen; const held = gate(), committed = new Promise(resolve => seen = resolve); let calls = 0;
    await owned.route('**/api.php?action=training-answer', async route => {calls++; const response = await route.fetch(); seen(); await held.promise; await route.fulfill({response});});
    await owned.locator('#grammarModelContinue').dblclick(); await deadline(committed, 'Synthetic answer commit');
    assert.equal(calls, 1); assert.equal(await owned.locator('#grammarNext').count(), 0);
    assert.equal(await owned.locator('#grammarHub').getAttribute('aria-busy'), 'true');
    held.release(); await owned.locator('#grammarNext').waitFor(); await owned.unroute('**/api.php?action=training-answer'); await owned.locator('#grammarNext').click();
    const active = (await req(owned, 'training-state&grammar=1&profile=' + profile.id)).sessions.find(row => !row.done);
    assert(active && active.step === 1); assert.equal((await req(owned, 'training-state&profile=' + profile.id)).sessions.some(row => row.track.startsWith('grammar:')), false, 'Legacy clients do not receive unknown grammar modes');
    let hintSeen; const hintGate = gate(), hintCommitted = new Promise(resolve => hintSeen = resolve);
    await owned.route('**/api.php?action=training-hint', async route => {const response = await route.fetch(); hintSeen(); await hintGate.promise; await route.fulfill({response});});
    await owned.locator('#grammarRead').click(); await deadline(hintCommitted, 'Synthetic hint commit'); assert.equal(await owned.locator('#grammarModel').isVisible(), false, 'A full model waits for the confirmed hint response');
    await owned.evaluate(() => location.hash = '#allenati'); await owned.locator('.lessonCard').first().waitFor();
    const reply = owned.waitForResponse(response => response.url().includes('api.php?action=training-hint')); hintGate.release(); await reply; await owned.unroute('**/api.php?action=training-hint');
    assert.equal(await owned.locator('#grammarHub:visible').count(), 0, 'A late committed hint never repaints the departed page');
    assert.equal(await owned.evaluate(token => Object.values(localStorage).some(value => value.includes(token)), active.token), false, 'Private tokens are not cached in guest storage');
    await menu(owned); await owned.locator('[data-grammar-resume="' + active.token + '"]').click();
    await owned.locator('#grammarHub[data-token="' + active.token + '"][data-step="1"]').waitFor();
    await owned.locator('#grammarModel').waitFor();
    assert.equal(await owned.locator('#grammarModel').isVisible(), true); const confirmed = (await req(owned, 'training-state&profile=' + profile.id + '&token=' + active.token)).session; assert.equal(confirmed.hint, 2); assert(confirmed.helped);
    await solve(owned, confirmed.question); await owned.locator('#grammarNext').click();
    await owned.goto(base + '/#account'); await owned.locator('#trainingParentProgress>summary').click(); await owned.locator('#trainingParentStatus').getByText(/aggiornati/).waitFor();
    const parentText = await owned.locator('#trainingParentData').innerText();
    assert(parentText.includes(catalog.packs.find(pack => pack.id === 'articles').title));
    assert(parentText.includes(confirmed.question.grammar.nounData.meaning));
    assert(parentText.includes('senza aiuto') && parentText.includes('con modello'), 'The private report distinguishes independent and guided practice');
    assert(!/grammar:article-/.test(parentText), 'Parent rows have meaningful labels rather than internal IDs');
    await owned.close(); checks.push('owned profile confirmation gate, single double-click save, stale reply disposal, private cache boundary and readable parent progress');

    // Audio is synthetic for lifecycle checks, never a claim about real voices.
    const audio = await page({voices: true}); audio.grammarGuestOnly = true; await menu(audio); await start(audio, 'number');
    await audio.evaluate(() => grammarVoiceFixture.hold = true); await audio.locator('#grammarListen').click();
    const speaking = await audio.evaluate(() => ({spoken: grammarVoiceFixture.spoken.length, cancels: grammarVoiceFixture.cancels})); assert(speaking.spoken > 0);
    await audio.evaluate(() => location.hash = '#allenati'); await audio.locator('.lessonCard').first().waitFor();
    assert(await audio.evaluate(before => grammarVoiceFixture.cancels > before, speaking.cancels), 'Navigating away cancels the outstanding utterance');
    assert.equal(await audio.locator('#grammarHub:visible').count(), 0); await audio.close(); checks.push('synthetic audio replay/cancellation is scoped to the active route');

    assert.deepEqual(guestWrites, [], 'Guest grammar produces no API writes'); assert.deepEqual(errors, []);
    const report = {status: 'passed', checks, geometries, syntheticOnly: true, voiceQuality: 'not validated', pageErrors: errors};
    if (captures) fs.writeFileSync(path.join(captures, 'grammar-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {for (const release of releases) release(); await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
