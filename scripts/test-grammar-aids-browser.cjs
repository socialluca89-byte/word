// Teacher-provided grammar stays unchanged; only optional, confirmed aids vary the interaction.
const {chromium} = require(process.env.WORDYLAND_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const base = process.env.WORDYLAND_TEST_URL;
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Disposable localhost only');
const origin = new URL(base).origin, key = 'wordylandGrammarGuestV1';
const content = fs.readFileSync('dist/training.json');
const currentContent=JSON.parse(content), catalog=currentContent.grammarLessons;
const previous={...currentContent,foundationWords:currentContent.foundationWords.slice(0,53),wordPacks:currentContent.wordPacks.slice(0,8),grammarLessons:{...catalog,nouns:catalog.nouns.slice(0,16),packs:catalog.packs.slice(0,5)}};
assert.equal(crypto.createHash('sha256').update(JSON.stringify(previous)).digest('hex'),'63b58d5e3d38489d1ab4e21e959e9e42942d44673f1918c09068be64de3a51b8','All previous published teacher content stays exact; Nov8 appends only');
assert.equal(catalog.nouns.length,30);
assert.equal(catalog.packs.reduce((sum,pack)=>sum+pack.cases.length,0),75);
const captures = process.env.WORDYLAND_GRAMMAR_AIDS_SCREENSHOTS;
if (captures) {
  assert(['/workspace/', '/tmp/'].some(root => path.resolve(captures).startsWith(root)));
  fs.mkdirSync(captures, {recursive: true});
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.WORDYLAND_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const checks = [], errors = [], guestWrites = [], geometries = [], releases = new Set();
  const req = (p, action, data) => p.evaluate(({action, data}) => wordylandAccount.request(action, data), {action, data});
  const saved = p => p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const guest = async p => {
    const token = await p.locator('#grammarHub').getAttribute('data-token'), data = await saved(p);
    const session = data.sessions.find(row => row.token === token);
    assert(session, 'The visible token belongs to its dedicated guest save');
    return {...session, question: session.plan[session.step]};
  };
  const owned = async (p, profile, token) => (await req(p, 'training-state&grammar=1&profile=' + profile + '&token=' + token)).session;
  const legacy = p => p.evaluate(key => ({
    storage: Object.fromEntries(Object.keys(localStorage).filter(name => name !== key).sort().map(name => [name, localStorage.getItem(name)])),
    stats: structuredClone(stats), stars
  }), key);
  function gate() {
    let finish;
    const promise = new Promise(resolve => finish = resolve);
    const release = () => {releases.delete(release); finish();};
    releases.add(release); return {promise, release};
  }
  async function deadline(promise, label) {
    let timer;
    try {return await Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error(label + ' did not finish within 30000ms')), 30000);})]);}
    finally {clearTimeout(timer);}
  }
  async function page(width = 390) {
    const p = await browser.newPage({viewport: {width, height: width === 1360 ? 900 : 844}, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block'});
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => {
      if (p.guestOnly && request.method() === 'POST' && new URL(request.url()).pathname === '/api.php') guestWrites.push(new URL(request.url()).searchParams.get('action'));
    });
    await p.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await p.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {getVoices: () => [], cancel() {}, addEventListener() {}, speak() {throw Error('No listening is required by these aids');}}});
      window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    });
    return p;
  }
  async function menu(p, priorities = []) {
    await p.goto(base + '/#allenamento'); await p.evaluate(() => wordylandAccount.ready);
    if (priorities.length) await p.evaluate(({key, ids, all}) => {
      const data = {version: 1, sessions: [], counts: Object.fromEntries(all.map(id => [id, ids.includes(id) ? 0 : 100])), items: {}, completed: 0, stickers: [], firstDay: null, lastDay: null};
      localStorage.setItem(key, JSON.stringify(data));
    }, {key, ids: priorities, all: catalog.packs.flatMap(pack => pack.cases.map(row => row.id))});
    await p.locator('#openGrammarTraining').click(); await p.locator('#grammarMenu').waitFor();
    assert.deepEqual(await p.locator('[data-grammar-pack]').evaluateAll(nodes => nodes.map(node => node.dataset.grammarPack)), ['number','plurals','articles','sentences','questions','toys-yes-no','whats-this','it-they-choice','it-they-write','is-this','short-answer-gap'], 'All five old and six new teacher paths remain reachable');
  }
  async function start(p, pack) {
    await p.locator('[data-grammar-pack="' + pack + '"]').click();
    await p.locator('#grammarHub[data-pack="' + pack + '"]').waitFor();
  }
  async function choose(p, value) {
    await p.locator('[data-grammar-choice]').evaluateAll((nodes, value) => {
      const button = nodes.find(node => node.dataset.grammarChoice === value); if (!button) throw Error('No exact curated choice'); button.focus();
    }, value);
    await p.keyboard.press('Enter');
  }
  async function solve(p, q) {
    if (q.mode === 'grammar-model') await p.locator('#grammarModelContinue').click();
    else if (q.mode === 'grammar-choice') await choose(p, q.answer);
    else if (q.mode === 'grammar-write') {await p.locator('#grammarInput').fill(q.answer); await p.locator('#grammarCheck').click();}
    else if (q.mode === 'grammar-build') {
      for (const word of q.answer.split(' ')) {
        await p.locator('[data-grammar-token]:not(:disabled)').evaluateAll((nodes, word) => {
          const button = nodes.find(node => node.textContent.trim() === word); if (!button) throw Error('Missing frozen word'); button.focus();
        }, word); await p.keyboard.press('Enter');
      }
      await p.locator('#grammarBuildCheck').click();
    } else assert.fail('Unsupported preserved grammar mode ' + q.mode);
    await p.locator('#grammarFeedback[data-correct=true]').waitFor();
  }
  async function advance(p, snapshot = () => guest(p)) {
    const before = await snapshot(); await solve(p, before.question || before.plan[before.step]);
    const after = await snapshot(); assert.equal(after.step, before.step + 1);
    await p.locator('#grammarNext').click();
    if (!after.done) await p.locator('#grammarHub[data-step="' + after.step + '"]').waitFor();
    return after;
  }
  async function reachWrite(p) {
    let s = await guest(p), moves = 0;
    while (s.question?.mode !== 'grammar-write') {
      assert(!s.done && moves++ < 9, 'A finite plural round reaches its writing activity');
      await advance(p); s = await guest(p);
    }
    return s;
  }
  async function letter(p, value) {
    const id = await p.locator('[data-grammar-letter]:not(:disabled)').evaluateAll((nodes, value) => nodes.find(node => node.dataset.letterValue === value)?.dataset.grammarLetter, value);
    assert.notEqual(id, undefined, 'An unused tile exists for ' + JSON.stringify(value));
    await p.locator('[data-grammar-letter="' + id + '"]').focus(); await p.keyboard.press('Enter');
    return id;
  }
  async function compose(p, text) {for (const value of Array.from(text)) await letter(p, value);}
  async function geometry(p, label) {
    const overflow = await p.evaluate(() => ({viewport: innerWidth, width: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].filter(node => {const r = node.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);}).slice(-15).map(node => ({tag: node.tagName, id: node.id, classes: node.className?.baseVal ?? node.className, width: node.getBoundingClientRect().width, right: node.getBoundingClientRect().right}))}));
    if (captures) {await p.screenshot({path: path.join(captures, label + '.png'), fullPage: true}); fs.writeFileSync(path.join(captures, label + '-geometry.json'), JSON.stringify(overflow, null, 2) + '\n');}
    assert(overflow.width <= overflow.viewport, label + ' has no horizontal overflow: ' + JSON.stringify(overflow));
    const targets = await p.locator('#grammarCountTogether:visible,#grammarCountReset:visible,[data-grammar-count]:visible,#grammarLettersOpen:visible,#grammarLettersPanel button:visible,#grammarCheck:visible').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return {id: node.id || node.dataset.grammarLetter || 'object', width: r.width, height: r.height, font: parseFloat(getComputedStyle(node).fontSize)};
    }));
    assert(targets.length && targets.every(r => r.width >= 48 && r.height >= 48), label + ' keeps 48px touch targets: ' + JSON.stringify(targets));
    geometries.push({label, width: await p.evaluate(() => innerWidth), targets});
  }
  async function countAll(p, expected) {
    const objects = p.locator('[data-grammar-count]'); assert.equal(await objects.count(), expected);
    assert.equal(await p.locator('#grammarObjects').getAttribute('role'), 'group', 'Interactive picture uses group semantics');
    assert.equal(await objects.evaluateAll(nodes => nodes.some(node => node.closest('[aria-hidden=true]'))), false, 'Count buttons are accessible, not children of hidden artwork');
    await objects.first().focus(); await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
    assert.equal(await p.locator('[data-grammar-count][aria-pressed=true]').count(), 1, 'Repeating one object never counts twice');
    assert.match(await p.locator('#grammarCountStatus').innerText(), /1/);
    for (let i = 1; i < expected; i++) {await objects.nth(i).focus(); await p.keyboard.press('Space');}
    assert.equal(await p.locator('[data-grammar-count][aria-pressed=true]').count(), expected);
    assert.match(await p.locator('#grammarCountStatus').innerText(), new RegExp('\\b' + expected + '\\b'));
    await p.locator('#grammarCountReset').click();
    assert.equal(await p.locator('[data-grammar-count][aria-pressed=true]').count(), 0);
    assert.match(await p.locator('#grammarCountStatus').innerText(), /Tocca un oggetto alla volta/);
    assert.equal(await p.locator('#grammarFeedback[data-correct=true]').count(), 0, 'Counting never submits an answer');
  }
  async function quota(p) {
    await p.evaluate(key => {
      window.grammarAidOriginalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Synthetic quota', 'QuotaExceededError'); return grammarAidOriginalSet.call(this, name, value);};
    }, key);
  }
  try {
    // Counts are the same teacher pictures, with no new exercise or reward loop.
    for (const width of [320, 390, 1360]) {
      const p = await page(width); p.guestOnly = true; await menu(p, ['number-chair-many']); await start(p, 'number'); await advance(p);
      const s = await guest(p), before = await legacy(p); assert.equal(s.question.grammar.id, 'number-chair-many');
      assert.equal(await p.locator('#grammarObjects').getAttribute('role'), 'img');
      assert.equal(await p.locator('[data-grammar-count]').count(), 0);
      await p.evaluate(key => {
        const original = Storage.prototype.setItem; window.grammarAidAtCommit = [];
        Storage.prototype.setItem = function(name, value) {
          if (name === key && JSON.parse(value).sessions.some(row => row.hint === 1 && row.helped)) grammarAidAtCommit.push({count: document.querySelectorAll('[data-grammar-count]').length, letters: Boolean(document.querySelector('#grammarLettersPanel') && !document.querySelector('#grammarLettersPanel').hidden)});
          return original.call(this, name, value);
        };
      }, key);
      await p.locator('#grammarCountTogether').focus(); await p.keyboard.press('Enter'); await p.locator('[data-grammar-count]').first().waitFor();
      assert.deepEqual(await p.evaluate(() => grammarAidAtCommit), [{count: 0, letters: false}], 'No aid is painted before its guest save');
      assert.equal((await guest(p)).hint, 1); assert.equal((await guest(p)).helped, true); assert.equal((await guest(p)).step, s.step);
      await countAll(p, s.question.grammar.count); await geometry(p, 'grammar-count-' + width);
      await choose(p, s.question.answer); await p.locator('#grammarNext').waitFor();
      const row = (await saved(p)).items[s.question.item + '|grammar.number']; assert.equal(row.guided, 1); assert.equal(row.independent, 0);
      assert.deepEqual(await legacy(p), before, 'Optional count leaves legacy games, wallet and statistics untouched');
      await p.close();
    }
    checks.push('same four teacher objects count once each with keyboard/touch-sized controls at320/390/1360; confirmed hint before interaction; guided results and untouched legacy state');

    // Repeatable letters include duplicates and explicit spaces from the frozen answer.
    const seen = new Set();
    for (const width of [320, 390, 1360]) {
      const p = await page(width); p.guestOnly = true;
      await menu(p, ['plural-pencil-sharpener', 'plural-book-bag', 'plural-glue-stick']); await start(p, 'plurals');
      const before = await legacy(p);
      for (let index = 0; index < 3; index++) {
        const s = await reachWrite(p), q = s.question; seen.add(q.answer);
        await p.locator('#grammarInput').fill('draft');
        await p.locator('#grammarLettersOpen').click(); await p.locator('#grammarLettersPanel').waitFor();
        assert.equal((await guest(p)).hint, 1); assert.equal((await guest(p)).helped, true);
        assert.equal(await p.locator('#grammarInput').getAttribute('readonly') !== null, true);
        assert.equal(await p.locator('#grammarInput').inputValue(), '', 'Starting tiles does not silently submit or combine an old draft');
        assert.equal(await p.locator('#grammarComposedWord').isVisible(), false, 'An empty composition has no duplicate word preview');
        assert.equal(await p.locator('#grammarCheck').isEnabled(), false);
        const tiles = await p.locator('[data-grammar-letter]').evaluateAll(nodes => nodes.map(node => ({id: node.dataset.grammarLetter, value: node.dataset.letterValue, label: node.getAttribute('aria-label') || node.textContent})));
        assert.deepEqual(tiles.map(row => row.value).sort(), Array.from(q.answer).sort(), 'Tiles come only from this exact frozen answer');
        assert.equal(new Set(tiles.map(row => row.id)).size, tiles.length, 'Duplicate letters retain distinct identities');
        assert(tiles.some(row => row.value === ' ' && /spazio|␣/i.test(row.label)), 'A compound contains an explicit accessible space tile');
        // Empty composition restores the untouched manual draft.
        await p.locator('#grammarTypeInstead').click(); assert.equal(await p.locator('#grammarInput').inputValue(), 'draft');
        assert.equal(await p.locator('#grammarInput').getAttribute('readonly'), null);
        await p.locator('#grammarLettersOpen').click(); await p.locator('#grammarLettersPanel').waitFor();
        await letter(p, q.answer[0]); assert.equal(await p.locator('#grammarInput').inputValue(), q.answer[0]);
        await p.locator('#grammarLetterUndo').click(); assert.equal(await p.locator('#grammarInput').inputValue(), '');
        assert.equal(await p.locator('#grammarComposedWord').isVisible(), false);
        assert.equal(await p.locator('#grammarCheck').isEnabled(), false);
        assert.equal(await p.evaluate(() => document.activeElement?.isConnected && document.activeElement !== document.body), true, 'Undo retains a usable focus target');
        await compose(p, q.answer); assert.equal(await p.locator('#grammarInput').inputValue(), q.answer);
        const composedWord = p.locator('#grammarComposedWord');
        assert.equal(await composedWord.isVisible(), true);
        assert.equal(await composedWord.textContent(), q.answer, 'The complete assembled answer, including the final plural s, is readable beyond the narrow input');
        assert.equal(await composedWord.getAttribute('aria-hidden'), 'true', 'The readonly input remains the single accessible field value');
        const preview = await composedWord.evaluate(node => {
          const rect = node.getBoundingClientRect(), css = getComputedStyle(node), range = document.createRange(); range.selectNodeContents(node);
          return {width: rect.width, right: rect.right, height: rect.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', maxHeight: css.maxHeight, textRects: [...range.getClientRects()].map(text => ({left: text.left - rect.left, right: text.right - rect.left, top: text.top - rect.top, bottom: text.bottom - rect.top}))};
        });
        assert(preview.font >= 22 && preview.width > 0 && preview.height > 0 && preview.right <= width + 1, 'The assembled word remains large and inside the viewport: ' + JSON.stringify(preview));
        assert(!preview.ellipsis && preview.maxHeight === 'none' && preview.scrollWidth <= preview.clientWidth + 1 && preview.scrollHeight <= preview.clientHeight + 1, 'The preview wraps without clipped or ellipsized content: ' + JSON.stringify(preview));
        assert(preview.textRects.length && preview.textRects.every(rect => rect.left >= -1 && rect.right <= preview.width + 1 && rect.top >= -1 && rect.bottom <= preview.height + 1), 'Every rendered part of the assembled word is inside its visible preview: ' + JSON.stringify(preview));
        assert.equal(await p.locator('[data-grammar-letter]:not(:disabled)').count(), 0);
        assert.equal((await guest(p)).step, s.step, 'Even a complete word is never auto-submitted');
        await geometry(p, 'grammar-letters-' + width + '-' + q.grammar.noun);
        await p.locator('#grammarLetterReset').click(); assert.equal(await p.locator('#grammarInput').inputValue(), '');
        assert.equal(await composedWord.isVisible(), false, 'Reset hides the empty preview');
        assert.equal(await p.locator('[data-grammar-letter]:not(:disabled)').count(), Array.from(q.answer).length);
        await letter(p, q.answer[0]); await p.locator('#grammarTypeInstead').click();
        assert.equal(await composedWord.isVisible(), false, 'Ordinary typing uses its input without a stale composition preview');
        assert.equal(await p.locator('#grammarInput').inputValue(), q.answer[0], 'A partial composition can be finished using ordinary typing');
        assert.equal(await p.locator('#grammarInput').getAttribute('readonly'), null);
        await p.locator('#grammarInput').fill(q.answer); await p.locator('#grammarCheck').click(); await p.locator('#grammarNext').waitFor();
        const row = (await saved(p)).items[q.item + '|grammar.plural.write']; assert.equal(row.guided, 1); assert.equal(row.independent, 0, 'Typing after tiles remains aided writing');
        await p.locator('#grammarNext').click();
      }
      assert.deepEqual(await legacy(p), before); await p.close();
    }
    assert.deepEqual([...seen].sort(), ['book bags', 'glue sticks', 'pencil sharpeners']);
    checks.push('all three teacher compounds, duplicate letters and explicit spaces across three viewports; undo/reset and both draft/typing branches; fully readable wrapped word preview; no automatic answer or independent-credit inflation');

    // Saving help is authoritative, including a pause before the child answers.
    const paused = await page(); paused.guestOnly = true; await menu(paused, ['plural-egg']); await start(paused, 'plurals');
    let s = await reachWrite(paused); assert.equal(s.question.answer, 'eggs');
    await paused.locator('#grammarLettersOpen').click(); await paused.locator('#grammarLettersPanel').waitFor();
    await letter(paused, 'g'); await letter(paused, 'g'); assert.equal(await paused.locator('#grammarInput').inputValue(), 'gg', 'Two identical letters are separate usable tiles');
    const frozen = structuredClone(s.plan); await paused.locator('#grammarPause').click(); await paused.reload();
    await paused.locator('#openGrammarTraining').click(); await paused.locator('[data-grammar-resume="' + s.token + '"]').click();
    assert.equal((await guest(paused)).hint, 1); assert.equal((await guest(paused)).helped, true); assert.deepEqual((await guest(paused)).plan, frozen);
    assert.equal(await paused.locator('#grammarLettersPanel:visible').count(), 0, 'Unconfirmed tile gestures are not presented as a saved draft');
    await paused.locator('#grammarInput').fill(s.question.answer); await paused.locator('#grammarCheck').click(); await paused.locator('#grammarNext').waitFor();
    const pausedRow = (await saved(paused)).items[s.question.item + '|grammar.plural.write']; assert.equal(pausedRow.guided, 1); assert.equal(pausedRow.independent, 0);
    await paused.close(); checks.push('duplicate-letter use and pause/reload preserve the frozen question and aided classification while leaving draft gestures ephemeral');

    // Removing selected words must not destroy the keyboard user's focus.
    const builder = await page(); builder.guestOnly = true; await menu(builder); await start(builder, 'sentences'); await advance(builder);
    await builder.locator('[data-grammar-token="0"]').focus(); await builder.keyboard.press('Enter');
    assert.equal(await builder.evaluate(() => document.activeElement?.dataset.grammarPicked), '0');
    await builder.locator('[data-grammar-token="1"]').focus(); await builder.keyboard.press('Enter');
    await builder.locator('[data-grammar-picked="0"]').focus(); await builder.keyboard.press('Enter');
    assert.equal(await builder.evaluate(() => document.activeElement?.dataset.grammarPicked), '1', 'Removing a selected word moves focus to its surviving neighbour');
    await builder.locator('#grammarUndo').focus(); await builder.keyboard.press('Enter');
    assert.equal(await builder.evaluate(() => document.activeElement?.dataset.grammarToken), '1', 'Undo focuses the available original word');
    assert.equal(await builder.locator('#grammarBuildCheck').isEnabled(), false); assert.equal(await builder.locator('[data-grammar-picked]').count(), 0);
    await builder.close(); checks.push('existing sentence composition preserves keyboard focus after a selected word is removed or undone');

    for (const kind of ['count', 'letters']) {
      const p = await page(); p.guestOnly = true; await menu(p); await start(p, kind === 'count' ? 'number' : 'plurals');
      if (kind === 'count') await advance(p); else await reachWrite(p);
      const before = await p.evaluate(key => localStorage.getItem(key), key), current = await guest(p); await quota(p);
      await p.locator(kind === 'count' ? '#grammarCountTogether' : '#grammarLettersOpen').click(); await p.locator('#grammarRecover').waitFor();
      assert.equal(await p.locator('[data-grammar-count]').count(), 0); assert.equal(await p.locator('#grammarLettersPanel:visible').count(), 0);
      assert.equal(await p.evaluate(key => localStorage.getItem(key), key), before); assert.equal((await guest(p)).step, current.step);
      await p.evaluate(() => Storage.prototype.setItem = grammarAidOriginalSet); await p.locator('#grammarRecover').click();
      await p.locator(kind === 'count' ? '#grammarCountTogether' : '#grammarLettersOpen').click();
      await p.locator(kind === 'count' ? '[data-grammar-count]' : '#grammarLettersPanel').first().waitFor();
      assert.equal((await guest(p)).hint, 1); await p.close();
    }
    checks.push('both aids fail closed on guest quota errors and can reopen only after explicit saved-state recovery');

    // Navigation between a confirmed guest save and its callback must not repaint.
    for (const kind of ['count', 'letters']) {
      const p = await page(); p.guestOnly = true; await menu(p); await start(p, kind === 'count' ? 'number' : 'plurals');
      if (kind === 'count') await advance(p); else await reachWrite(p);
      s = await guest(p);
      await p.evaluate(({key, token}) => {
        const original = Storage.prototype.setItem; let left = false;
        Storage.prototype.setItem = function(name, value) {
          const result = original.call(this, name, value);
          if (!left && name === key && JSON.parse(value).sessions.some(row => row.token === token && row.hint === 1)) {left = true; queueMicrotask(() => location.hash = '#allenati');}
          return result;
        };
      }, {key, token: s.token});
      await p.locator(kind === 'count' ? '#grammarCountTogether' : '#grammarLettersOpen').click();
      await p.locator('.lessonCard').first().waitFor(); assert.equal(await p.locator('#grammarHub:visible').count(), 0);
      assert.equal((await saved(p)).sessions.find(row => row.token === s.token).hint, 1); await p.close();
    }
    checks.push('confirmed guest aid saves followed by immediate route navigation never reactivate a disposed exercise');

    // Real local synthetic requests prove response confirmation and profile/step isolation.
    const p = await page(); await p.goto(base + '/#allenamento'); await p.evaluate(() => wordylandAccount.ready);
    const profiles = await p.evaluate(async () => {
      const a = wordylandAccount; await a.connect(await a.request('register', {username: 'grammar_aids_parent', password: 'Synthetic-grammar-aids-parent-123', adult: true}));
      const first = await a.createProfile('Aids owner'), second = await a.createProfile('Other synthetic profile'); await a.selectProfile(first.id); return {first, second};
    });
    await p.locator('#openGrammarTraining').click(); await start(p, 'number');
    let token = await p.locator('#grammarHub').getAttribute('data-token');
    await advance(p, () => owned(p, profiles.first.id, token)); s = await owned(p, profiles.first.id, token);
    const committed = gate(), reply = gate(); let hintCalls = 0;
    await p.route('**/api.php?action=training-hint', async route => {hintCalls++; const response = await route.fetch(); committed.release(); await reply.promise; await route.fulfill({response});});
    await p.locator('#grammarCountTogether').dblclick(); await deadline(committed.promise, 'Owned hint commit');
    assert.equal(hintCalls, 1); assert.equal(await p.locator('[data-grammar-count]').count(), 0, 'Server commit alone does not expose an unconfirmed aid');
    assert.equal((await owned(p, profiles.first.id, token)).hint, 1);
    await p.evaluate(id => wordylandAccount.selectProfile(id), profiles.second.id); await p.locator('#openGrammarTraining').waitFor();
    const response = p.waitForResponse(response => response.url().includes('api.php?action=training-hint')); reply.release(); await response; await p.unroute('**/api.php?action=training-hint');
    assert.equal(await p.evaluate(() => wordylandAccount.info().id), profiles.second.id);
    assert.equal(await p.locator('#grammarHub:visible').count(), 0); assert.equal(await p.locator('[data-grammar-count]:visible').count(), 0);
    assert.equal((await req(p, 'training-state&grammar=1&profile=' + profiles.second.id)).sessions.length, 0);
    assert.equal(await p.evaluate(token => Object.values(localStorage).some(value => value.includes(token)), token), false, 'Owned tokens never enter a guest cache');
    await p.evaluate(id => wordylandAccount.selectProfile(id), profiles.first.id); await p.locator('#openGrammarTraining').click(); await p.locator('[data-grammar-resume="' + token + '"]').click();
    assert.equal((await owned(p, profiles.first.id, token)).hint, 1); await p.locator('#grammarCountTogether').click(); await p.locator('[data-grammar-count]').first().waitFor();
    await choose(p, s.question.answer); await p.locator('#grammarNext').waitFor();
    const progress = await req(p, 'training-progress&profile=' + profiles.first.id), competence = progress.items.find(row => row.item === s.question.item)?.competencies.find(row => row.skill === 'grammar.number');
    assert(competence); assert.equal(competence.guided, 1); assert.equal(competence.independent, 0);
    await p.locator('#grammarNext').click(); s = await owned(p, profiles.first.id, token);
    // A different-device answer overtakes a pending hint; replay must draw the next step without opening the old aid.
    const sent = gate(), letRequest = gate(); hintCalls = 0;
    await p.route('**/api.php?action=training-hint', async route => {hintCalls++; sent.release(); await letRequest.promise; await route.continue();});
    await p.locator('#grammarCountTogether').click(); await deadline(sent.promise, 'Old-step hint request');
    await req(p, 'training-answer', {profile: profiles.first.id, token, step: s.step, attempt: crypto.randomBytes(16).toString('hex'), answer: s.question.answer});
    letRequest.release(); await p.locator('#grammarHub[data-step="' + (s.step + 1) + '"]').waitFor();
    assert.equal(hintCalls, 1); assert.equal(await p.locator('[data-grammar-count]').count(), 0); assert.equal(await p.locator('#grammarLettersPanel:visible').count(), 0);
    assert.equal((await owned(p, profiles.first.id, token)).step, s.step + 1); await p.unroute('**/api.php?action=training-hint');
    const sameQuestion = await p.evaluate(() => wordylandAccount.createProfile('Two simultaneous aids'));
    await p.locator('#openGrammarTraining').click(); await start(p, 'plurals'); token = await p.locator('#grammarHub').getAttribute('data-token');
    await advance(p, () => owned(p, sameQuestion.id, token)); await advance(p, () => owned(p, sameQuestion.id, token));
    s = await owned(p, sameQuestion.id, token); assert.equal(s.question.mode, 'grammar-write');
    const twoCommitted = gate(), twoReply = gate(); hintCalls = 0;
    await p.route('**/api.php?action=training-hint', async route => {hintCalls++; const response = await route.fetch(); twoCommitted.release(); await twoReply.promise; await route.fulfill({response});});
    await p.locator('#grammarCountTogether').click(); await deadline(twoCommitted.promise, 'Competing aid commit');
    assert.equal(await p.locator('#grammarLettersOpen').isEnabled(), false);
    await p.locator('#grammarLettersOpen').dispatchEvent('click');
    assert.equal(hintCalls, 1); assert.equal(await p.locator('#grammarLettersPanel:visible').count(), 0); assert.equal(await p.locator('[data-grammar-count]').count(), 0);
    twoReply.release(); await p.locator('[data-grammar-count]').first().waitFor(); await p.unroute('**/api.php?action=training-hint');
    await p.locator('#grammarLettersOpen').click(); await p.locator('#grammarLettersPanel').waitFor();
    assert.equal((await owned(p, sameQuestion.id, token)).step, s.step); assert.equal((await owned(p, sameQuestion.id, token)).hint, 1);
    await p.close();
    checks.push('owned hints wait for one confirmed response; late profile replies and newer-step replay never open the old aid; private progress remains guided and tokens never enter guest storage; competing aid clicks cannot launch a second pending request');

    assert.deepEqual(guestWrites, [], 'Guest aids send no API writes'); assert.deepEqual(errors, [], 'No application page errors');
    const report = {status: 'passed', checks, geometries, contentSha256: crypto.createHash('sha256').update(content).digest('hex'), syntheticOnly: true, realVoiceQuality: 'not validated', realDevice: 'not tested', pageErrors: errors};
    if (captures) fs.writeFileSync(path.join(captures, 'grammar-aids-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {for (const release of releases) release(); await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
