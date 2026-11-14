// Independent real-UI oracle for the 13 Best 2 source photographs. Local synthetic data only.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {randomBytes} = require('crypto');
const {chromium} = require(process.env.WORDYLAND_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORDYLAND_TEST_URL;
assert(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Disposable localhost only');
const origin = new URL(base).origin;
const baseline = '3614c4476101814b307dd72a80b935ca7883e2fd';
const legacyKeys = ['wordylandGrammarGuestV1', 'wordylandTrainingGuest', 'wordylandActivitiesGuestV1'];
const grammarKey = 'wordylandBest2GrammarGuestV1', wordsKey = 'wordylandBest2TrainingGuestV1';
const grammarPacks = ['best2-what-questions', 'best2-this-these', 'best2-it-they-sentences'];
const units = ['best2-20261114-words', 'best2-20261114-questions', 'best2-20261114-this-these', 'best2-20261114-statements'];
const wordIds = ['slide', 'scooter', 'swing', 'shelf', 'cupboard', 'computer', 'tree'];
const expectedMatrix = [
  ['best2-what-questions', 'desk', 1], ['best2-what-questions', 'desk', 2],
  ['best2-what-questions', 'bookbag', 1], ['best2-what-questions', 'bookbag', 2],
  ['best2-what-questions', 'pencil-sharpener', 1], ['best2-what-questions', 'pencil-sharpener', 3],
  ['best2-what-questions', 'pen', 1], ['best2-what-questions', 'pen', 2],
  ['best2-what-questions', 'apple', 1], ['best2-what-questions', 'apple', 3],
  ...['apple', 'ball', 'dog', 'tree'].flatMap(noun => [1, 2].map(count => ['best2-this-these', noun, count])),
  ...['pencil', 'pencil-sharpener', 'desk'].flatMap(noun => [1, 3].map(count => ['best2-it-they-sentences', noun, count])),
  ...['boy', 'hand'].flatMap(noun => [1, 2].map(count => ['best2-it-they-sentences', noun, count]))
].map(row => row.join('|')).sort();
const captures = process.env.WORDYLAND_BEST2_SCREENSHOTS;
if (captures) {
  assert(['/workspace/', '/tmp/'].some(root => path.resolve(captures).startsWith(root)));
  fs.mkdirSync(captures, {recursive: true});
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.WORDYLAND_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const contexts = [], errors = [], checks = [], external = [], writes = [];
  const checkpoint = message => {checks.push(message); console.log('Best 2 browser checkpoint: ' + message);};
  const req = (page, action, data) => page.evaluate(({action, data}) => wordylandAccount.request(action, data), {action, data});
  const raw = (page, keys) => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys);
  const stored = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  async function fresh({serviceWorkers = 'block'} = {}) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, reducedMotion: 'reduce', serviceWorkers});
    contexts.push(context);
    await context.addInitScript(() => {
      const fixture = window.best2Speech = {enabled: false, pending: [], spoken: [], cancels: 0, hold: false};
      Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {
        getVoices: () => fixture.enabled ? [{name: 'Synthetic English', voiceURI: 'best2-fixture', lang: 'en-GB', localService: true}] : [],
        get speaking() {return fixture.pending.length > 0;}, addEventListener() {},
        cancel() {fixture.cancels++; fixture.pending = [];},
        speak(utterance) {fixture.pending.push(utterance); fixture.spoken.push(utterance.text); utterance.onstart?.();
          if (!fixture.hold) queueMicrotask(() => {if (fixture.pending.includes(utterance)) {fixture.pending = fixture.pending.filter(item => item !== utterance); utterance.onend?.();}});}
      }});
      window.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api.php') writes.push({page, action: new URL(request.url()).searchParams.get('action'), body: request.postDataJSON()});
    });
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push({url: route.request().url(), method: route.request().method(), body: route.request().postData()});
      return route.abort();
    });
    await page.goto(base);
    await ready(page);
    return page;
  }
  async function ready(page) {
    await page.evaluate(() => wordylandAccount.ready);
    await page.waitForFunction(() => Boolean(window.wordylandClassProgram));
  }
  async function training(page) {
    if (new URL(page.url()).hash === '#allenamento') {
      await page.evaluate(() => {location.hash = 'allenati';});
      await page.locator('#trainingHub').waitFor({state: 'hidden'});
    }
    await page.evaluate(() => {location.hash = 'allenamento';});
    await page.locator('#trainingHub:not([hidden]) #trainingWords').waitFor();
  }
  async function grammarMenu(page) {
    await training(page);
    await page.locator('#openGrammarTraining').click();
    await page.locator('#grammarMenu').waitFor();
  }
  async function grammarStart(page, pack) {
    await page.locator('[data-grammar-pack="' + pack + '"]').click();
    await page.locator('#grammarHub[data-pack="' + pack + '"]').waitFor();
    return page.locator('#grammarHub').getAttribute('data-token');
  }
  async function guestGrammar(page, token) {
    const data = await stored(page, grammarKey);
    const session = data.sessions.find(row => row.token === token);
    assert(session, 'The new grammar plan exists in its dedicated store');
    return {...session, question: session.plan[session.step] || null};
  }
  async function guestWord(page, token) {
    const data = await stored(page, wordsKey);
    const session = data.sessions.find(row => row.token === token);
    assert(session, 'The new word plan exists in its dedicated store');
    return {...session, question: session.plan[session.step] || null};
  }
  async function compose(page, question, {reverse = false, undo = false} = {}) {
    const words = question.answer.split(' ');
    if (reverse) words.reverse();
    assert.equal(await page.locator('#grammarBuildCheck').isDisabled(), true);
    for (const [index, text] of words.entries()) {
      const id = await page.locator('[data-grammar-token]:not(:disabled)').evaluateAll((nodes, text) => nodes.find(node => node.textContent.trim() === text)?.dataset.grammarToken, text);
      assert.notEqual(id, undefined, 'An actual available word tile matches the answer');
      await page.locator('[data-grammar-token="' + id + '"]').focus();
      await page.keyboard.press('Enter');
      if (undo && index === 0) {
        await page.locator('#grammarUndo').click();
        assert.equal(await page.locator('[data-grammar-picked]').count(), 0);
        await page.locator('[data-grammar-token="' + id + '"]').click();
      }
    }
    await page.locator('#grammarBuildCheck').click();
  }
  async function grammarAnswer(page, q, wrong = false) {
    if (q.mode === 'grammar-model') await page.locator('#grammarModelContinue').click();
    else if (q.mode === 'grammar-choice') {
      const answer = wrong ? q.choices.find(value => value !== q.answer) : q.answer;
      assert.notEqual(answer, undefined);
      await page.locator('[data-grammar-choice]').evaluateAll((nodes, answer) => nodes.find(node => node.dataset.grammarChoice === answer).focus(), answer);
      await page.keyboard.press('Enter');
    } else if (q.mode === 'grammar-build') await compose(page, q, {reverse: wrong, undo: !wrong});
    else if (q.mode === 'grammar-write') {
      await page.locator('#grammarInput').fill(wrong ? 'synthetic wrong' : q.answer);
      await page.locator('#grammarInput').press('Enter');
    } else assert.fail('Unexpected grammar mode ' + q.mode);
    await page.locator('#grammarFeedback[data-correct=' + !wrong + ']').waitFor();
  }
  async function geometry(page, width, name) {
    await page.setViewportSize({width, height: width === 1360 ? 900 : 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ': no horizontal overflow at ' + width);
    const targets = await page.locator('#grammarExercise button:not(:disabled), #trainingExercise button:not(:disabled)').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => ({width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height})));
    assert(targets.length > 0, 'The activity has a visible usable control');
    assert(targets.every(rect => rect.width >= 47.5 && rect.height >= 47.5), 'At least 48px touch controls at ' + width);
    if (captures) await page.screenshot({path: path.join(captures, name + '-' + width + '.png'), fullPage: true});
  }
  async function objectArt(page, q) {
    const objects = page.locator('#grammarObjects [data-grammar-object]');
    assert.equal(await objects.count(), q.grammar.count);
    assert.equal(await objects.locator('svg').count(), q.grammar.count, 'Each actual object has local vector/atlas art');
    const atlas = page.locator('#grammarObjects [data-word-art]');
    if (await atlas.count()) {
      await page.waitForFunction(() => [...document.querySelectorAll('#grammarObjects [data-word-art]')].every(node => node.dataset.artState === 'ready'));
      assert(await atlas.locator('image').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display !== 'none' && +getComputedStyle(node).opacity > 0)), 'The bookbag and classroom atlas imagery really appears');
    }
  }
  async function nextGrammar(page, next) {
    await page.locator('#grammarNext').click();
    if (next.done) await page.locator('#grammarAgain').waitFor();
    else await page.locator('#grammarHub[data-step="' + next.step + '"]').waitFor();
  }
  async function wordAnswer(page, q) {
    if (q.mode === 'model') await page.locator('#trainingContinue').click();
    else if (q.mode === 'recognize') {
      await page.locator('[data-training-choice="' + q.answer + '"]').focus();
      await page.keyboard.press('Enter');
    } else if (q.mode === 'build') {
      for (const char of q.answer) {
        const id = await page.locator('[data-training-tile]:not(:disabled)').evaluateAll((nodes, char) => nodes.find(node => node.textContent === char)?.dataset.trainingTile, char);
        assert.notEqual(id, undefined);
        await page.locator('[data-training-tile="' + id + '"]').click();
      }
      await page.locator('#trainingBuildCheck').click();
    } else if (q.mode === 'recall') {
      await page.locator('#trainingAnswer').fill(q.answer);
      await page.locator('#trainingAnswer').press('Enter');
    } else assert.fail('The new teacher word-only pack must not invent a phrase: ' + q.mode);
    try {await page.locator('#nextTrainingStep').waitFor();}
    catch (error) {
      const ui = await page.evaluate(() => ({mode: document.querySelector('#trainingHub')?.dataset.sessionMode,
        busy: document.querySelector('#trainingHub')?.getAttribute('aria-busy'),
        status: document.querySelector('#trainingStatus')?.textContent,
        feedback: document.querySelector('#trainingFeedback')?.textContent,
        input: document.querySelector('#trainingAnswer')?.value,
        picked: [...document.querySelectorAll('[data-training-slot]')].map(node => node.textContent)}));
      if (captures) await page.screenshot({path: path.join(captures, 'word-failure-' + q.mode + '.png'), fullPage: true});
      throw new Error('Synthetic word UI failed for ' + q.word.id + ' / ' + q.mode + ': ' + JSON.stringify(ui), {cause: error});
    }
  }
  try {
    const guest = await fresh();
    // Create valid old pending plans using real controls rather than manufacturing a private schema.
    await grammarMenu(guest);
    const oldGrammarToken = await grammarStart(guest, 'sentences');
    await guest.locator('#grammarModelContinue').click();
    await guest.locator('#grammarFeedback[data-correct=true]').waitFor();
    await guest.locator('#grammarNext').click();
    await guest.locator('#grammarRead').click();
    await guest.locator('#grammarModel:not([hidden])').waitFor();
    await training(guest);
    await guest.locator('#startWordTraining').click();
    await guest.locator('#trainingContinue').click();
    await guest.locator('#nextTrainingStep').click();
    await guest.locator('#trainingHint').click();
    await training(guest);
    await guest.locator('#startInstructionTraining').click();
    await guest.locator('#trainingExercise').waitFor();
    await training(guest);
    await guest.evaluate(keys => {
      // Synthetic historical awards deliberately overlap across the pre-existing stores.
      for (const [index, key] of keys.entries()) {
        const saved = JSON.parse(localStorage.getItem(key));
        saved.stickers = index === 1 ? ['first', 'explore'] : ['first'];
        saved.completed = 3; saved.firstDay = '2026-11-01'; saved.lastDay = '2026-11-02';
        localStorage.setItem(key, JSON.stringify(saved));
      }
    }, legacyKeys);
    await guest.reload();
    await ready(guest);
    const oldBytes = await raw(guest, legacyKeys);
    assert(Object.values(oldBytes).every(Boolean), 'All three existing stores contain real pending synthetic plans');
    const oldGrammar = JSON.parse(oldBytes[legacyKeys[0]]).sessions.find(row => row.token === oldGrammarToken);
    assert(oldGrammar.hint === 2 && oldGrammar.helped, 'The old helped pending plan is a meaningful regression fixture');

    await grammarMenu(guest);
    const guestToken = await grammarStart(guest, 'best2-this-these');
    assert(await guest.evaluate(() => document.activeElement?.matches('#trainingHub h2')), 'The new activity announces its focused heading to keyboard users');
    let session = await guestGrammar(guest, guestToken);
    await grammarAnswer(guest, session.question);
    session = await guestGrammar(guest, guestToken);
    await nextGrammar(guest, session);
    assert.equal(session.question.grammar.phase, 'demonstrative-choice');
    assert.deepEqual(session.question.choices.slice().sort(), ['This is', 'These are'].sort());
    assert.match(await guest.locator('.grammarAudioNote').innerText(), /non è una prova d’ascolto/i);
    await guest.locator('#grammarListen').click();
    assert.equal(await guest.evaluate(() => best2Speech.spoken.length), 0, 'An unavailable voice never simulates a listening result');

    // A failed durable save cannot reveal the answer or grant progress.
    const beforeQuota = await raw(guest, [grammarKey]);
    await guest.evaluate(key => {
      window.best2OriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Synthetic quota', 'QuotaExceededError'); return window.best2OriginalSetItem.call(this, name, value);};
    }, grammarKey);
    await guest.locator('#grammarRead').click();
    await guest.locator('#grammarStatus').getByText(/salv|spazio/i).waitFor();
    assert.equal(await guest.locator('#grammarModel').isHidden(), true);
    assert.deepEqual(await raw(guest, [grammarKey]), beforeQuota);
    await guest.evaluate(() => {Storage.prototype.setItem = window.best2OriginalSetItem;});
    await guest.locator('#grammarRead').click();
    await guest.locator('#grammarModel:not([hidden])').waitFor();
    session = await guestGrammar(guest, guestToken);
    assert.equal(session.hint, 2);
    assert.equal(session.helped, true);
    const helpedBytes = await raw(guest, [grammarKey]);
    await guest.locator('#grammarPause').click();
    await guest.reload();
    await ready(guest);
    await grammarMenu(guest);
    assert.equal(await guest.locator('[data-grammar-resume="' + oldGrammarToken + '"]').count(), 1);
    await guest.locator('[data-grammar-resume="' + guestToken + '"]').click();
    await guest.locator('#grammarModel:not([hidden])').waitFor();
    assert.deepEqual(await raw(guest, [grammarKey]), helpedBytes, 'Reload and explicit resume preserve the frozen new plan and help');
    for (const width of [320, 390, 1360]) await geometry(guest, width, 'best2-this-these');
    await guest.setViewportSize({width: 390, height: 844});

    // Browser double activation advances one step; build undo and a paused draft remain usable.
    const correct = guest.locator('[data-grammar-choice="' + session.question.answer + '"]');
    await correct.dblclick();
    await guest.locator('#grammarFeedback[data-correct=true]').waitFor();
    let next = await guestGrammar(guest, guestToken);
    assert.equal(next.step, session.step + 1);
    await nextGrammar(guest, next);
    assert.equal(next.question.grammar.phase, 'demonstrative-build');
    const tile = guest.locator('[data-grammar-token]').first();
    await tile.click();
    await guest.locator('#grammarUndo').click();
    assert.equal(await guest.locator('[data-grammar-picked]').count(), 0);
    await grammarAnswer(guest, next.question);
    next = await guestGrammar(guest, guestToken);
    await nextGrammar(guest, next);
    assert.equal(next.question.grammar.phase, 'demonstrative-write');
    await guest.locator('#grammarInput').fill('This is');
    await guest.evaluate(() => {best2Speech.enabled = true; best2Speech.hold = true;});
    await guest.locator('#grammarListen').click();
    assert.equal(await guest.evaluate(() => best2Speech.pending.length), 1);
    assert.equal(await guest.evaluate(() => best2Speech.spoken.at(-1)), next.question.grammar.audio, 'Only the provided whole-word audio is requested, never manufactured phonemes');
    await guest.locator('#grammarPause').click();
    assert.equal(await guest.evaluate(() => best2Speech.pending.length), 0, 'Pausing cancels the current synthetic utterance');
    await guest.locator('[data-grammar-resume="' + guestToken + '"]').click();
    await guest.locator('#grammarInput').waitFor();
    assert.equal((await guestGrammar(guest, guestToken)).step, next.step, 'Pausing an unconfirmed typed draft grants no progress');
    await guest.evaluate(() => {best2Speech.enabled = false; best2Speech.hold = false;});
    assert.deepEqual(await raw(guest, legacyKeys), oldBytes, 'New grammar never mutates any of the three legacy stores');
    checkpoint('new guest grammar: quota failure is atomic, hint survives pause/reload, keyboard/double-click/undo/mobile and old plans are preserved');

    // Exercise all seven word illustrations and all eight steps, using actual letter tiles and input.
    const seenWords = new Set();
    for (let round = 0; seenWords.size < wordIds.length; round++) {
      assert(round < 5, 'The seven teacher words rotate in finite small rounds');
      await training(guest);
      await guest.locator('[data-training-pack="best2-new-words"]').click();
      await guest.locator('#trainingContinue').waitFor();
      const token = (await stored(guest, wordsKey)).sessions.find(row => row.track === 'words:best2-new-words' && !row.done).token;
      let word = await guestWord(guest, token);
      assert.equal(word.plan.length, 8);
      assert.equal(word.trainingSchema, 3);
      while (!word.done) {
        const q = word.question;
        assert(wordIds.includes(q.word.id));
        assert.equal(q.word.wordOnly, true);
        assert.equal(q.word.phrase, q.word.id);
        if (q.mode === 'model') {
          const art = guest.locator('#trainingModel .trainingWordArt[data-art-state="ready"] svg');
          await art.waitFor();
          assert(await art.locator('path,rect,circle,ellipse').count() >= 3, 'The word illustration contains actual original shapes');
          assert.equal(await guest.locator('#trainingModel .trainingWord').innerText(), q.word.id);
          seenWords.add(q.word.id);
          if (seenWords.size === 1) for (const width of [320, 390, 1360]) await geometry(guest, width, 'best2-new-word');
          await guest.setViewportSize({width: 390, height: 844});
        }
        await wordAnswer(guest, q);
        word = await guestWord(guest, token);
        await guest.locator('#nextTrainingStep').click();
        if (word.done) await guest.locator('#trainingAgain').waitFor();
        else await guest.locator('#trainingHub[data-session-mode="' + word.question.mode + '"]').waitFor();
      }
    }
    assert.deepEqual([...seenWords].sort(), wordIds.slice().sort());
    assert.deepEqual(await raw(guest, legacyKeys), oldBytes, 'New word practice never prunes saved old word, grammar or activity plans');
    assert.equal(writes.filter(row => row.page === guest).length, 0, 'Guest practice never submits answers, profiles or rewards to an API');
    const guestWords = await stored(guest, wordsKey);
    assert(guestWords.stickers.length <= 3 && new Set(guestWords.stickers).size === guestWords.stickers.length);
    const shownStickers = await guest.locator('.trainingStickers span').allTextContents();
    assert(shownStickers.length >= 2 && shownStickers.length <= 3 && new Set(shownStickers).size === shownStickers.length, 'Existing and newly earned finite stickers are displayed once');
    checkpoint('all seven supplied new word spellings have real SVG art and complete eight-step word-only rounds, with finite stickers and no guest API writes');

    // Exact historical client scripts and data, rather than a mock that only resembles the old version.
    const v3Bytes = await raw(guest, [grammarKey, wordsKey]);
    const oldFiles = Object.fromEntries(['grammar.js', 'training.js', 'training.json'].map(name => [name, execFileSync('git', ['show', baseline + ':dist/' + name], {encoding: 'utf8'})]));
    const rollbackRoute = async route => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      await route.fulfill({status: 200, contentType: name.endsWith('.json') ? 'application/json' : 'application/javascript', body: oldFiles[name]});
    };
    const rollbackPattern = /\/(?:grammar\.js|training\.js|training\.json)(?:\?.*)?$/;
    await guest.route(rollbackPattern, rollbackRoute);
    await guest.reload();
    await ready(guest);
    await grammarMenu(guest);
    assert.equal(await guest.locator('[data-grammar-pack]').count(), 11);
    assert.equal(await guest.locator('[data-grammar-resume="' + guestToken + '"]').count(), 0, 'Cached old JS never enumerates the isolated new plan');
    await guest.locator('[data-grammar-resume="' + oldGrammarToken + '"]').click();
    await guest.locator('#grammarModel:not([hidden])').waitFor();
    assert.deepEqual(await raw(guest, legacyKeys), oldBytes, 'Old pending plans/help/rewards remain byte-for-byte intact');
    await grammarMenu(guest);
    await grammarStart(guest, 'articles');
    await guest.locator('#grammarModelContinue').waitFor();
    await guest.locator('#grammarModelContinue').click();
    await guest.locator('#grammarFeedback[data-correct=true]').waitFor();
    assert.deepEqual(await raw(guest, [grammarKey, wordsKey]), v3Bytes, 'Actual 3614 grammar writes cannot damage new plans or rewards');
    await training(guest);
    assert.equal(await guest.locator('[data-training-pack="best2-new-words"]').count(), 0);
    await guest.locator('[data-training-pack="classroom"]').click();
    await guest.locator('#trainingContinue').click();
    await guest.locator('#nextTrainingStep').waitFor();
    assert.deepEqual(await raw(guest, [grammarKey, wordsKey]), v3Bytes, 'Actual 3614 word writes cannot prune the new word store');
    await guest.unroute(rollbackPattern, rollbackRoute);
    await guest.reload();
    await ready(guest);
    await grammarMenu(guest);
    await guest.locator('[data-grammar-resume="' + guestToken + '"]').click();
    await guest.locator('#grammarInput').waitFor();
    assert.deepEqual(await raw(guest, [grammarKey, wordsKey]), v3Bytes, 'Returning to the current client resumes the preserved V3 plan');
    checkpoint('real cached 3614 JS and JSON can read/play old exercises while leaving both isolated new stores intact; upgrading restores the pending V3 session');
    await guest.close();

    // A legitimate mixed cache can contain old JS with the new JSON. Its already-confirmed
    // markerless word plan must remain authoritative in place, rather than disappear on upgrade.
    const hybrid = await fresh();
    const hybridPattern = /\/(?:grammar\.js|training\.js)(?:\?.*)?$/;
    await hybrid.route(hybridPattern, rollbackRoute);
    await hybrid.reload();
    await ready(hybrid);
    await training(hybrid);
    await hybrid.locator('[data-training-pack="best2-new-words"]').click();
    await hybrid.locator('#trainingContinue').waitFor();
    let hybridState = await stored(hybrid, legacyKeys[1]);
    let hybridSaved = hybridState.sessions.find(row => row.track === 'words:best2-new-words' && !row.done);
    assert(hybridSaved && !Object.hasOwn(hybridSaved, 'trainingSchema'), 'The actual old JS creates a markerless plan in its old bucket');
    const hybridToken = hybridSaved.token, hybridPlan = structuredClone(hybridSaved.plan);
    await wordAnswer(hybrid, hybridSaved.plan[0]);
    await hybrid.locator('#nextTrainingStep').click();
    await hybrid.locator('#trainingHint').click();
    hybridState = await stored(hybrid, legacyKeys[1]);
    hybridSaved = hybridState.sessions.find(row => row.token === hybridToken);
    assert.equal(hybridSaved.step, 1);
    assert(hybridSaved.hint > 0 && hybridSaved.helped);
    const hybridBytes = await raw(hybrid, [legacyKeys[1], wordsKey]);
    assert.equal(hybridBytes[wordsKey], null);
    await hybrid.unroute(hybridPattern, rollbackRoute);
    await hybrid.reload();
    await ready(hybrid);
    await training(hybrid);
    await hybrid.locator('[data-training-resume="' + hybridToken + '"]').click();
    await hybrid.locator('#trainingHub[data-session-mode="recognize"]').waitFor();
    assert.deepEqual(await raw(hybrid, [legacyKeys[1], wordsKey]), hybridBytes, 'Current JS resumes the hybrid token/step/help in place without a migration or copy');
    while (!hybridSaved.done) {
      await wordAnswer(hybrid, hybridSaved.plan[hybridSaved.step]);
      hybridState = await stored(hybrid, legacyKeys[1]);
      hybridSaved = hybridState.sessions.find(row => row.token === hybridToken);
      await hybrid.locator('#nextTrainingStep').click();
      if (hybridSaved.done) await hybrid.locator('#trainingAgain').waitFor();
      else await hybrid.locator('#trainingHub[data-session-mode="' + hybridSaved.plan[hybridSaved.step].mode + '"]').waitFor();
    }
    assert.deepEqual(hybridSaved.plan, hybridPlan);
    assert.equal(hybridState.completed, 1, 'The mixed-cache round is credited exactly once');
    assert.equal(new Set(hybridState.stickers).size, hybridState.stickers.length);
    assert.equal((await raw(hybrid, [wordsKey]))[wordsKey], null, 'Resuming an old hybrid plan never duplicates it or its awards into V3');
    await hybrid.locator('#trainingAgain').click();
    const completedHybridBytes = await raw(hybrid, [legacyKeys[1]]);
    await hybrid.locator('[data-training-pack="best2-new-words"]').click();
    await hybrid.locator('#trainingContinue').waitFor();
    const newHybrid = (await stored(hybrid, wordsKey)).sessions.find(row => !row.done);
    assert(newHybrid.trainingSchema === 3 && newHybrid.token !== hybridToken, 'Only genuinely new starts use the isolated V3 bucket');
    assert.deepEqual(await raw(hybrid, [legacyKeys[1]]), completedHybridBytes);
    checkpoint('real mixed cache old JS/new JSON upgrades in place with its token, plan, step and help; one completion/finite awards, new starts isolated');
    await hybrid.close();

    // The real service worker supplies the public page offline; no account/API response is cached.
    const offline = await fresh({serviceWorkers: 'allow'});
    await offline.locator('#offlineReady').waitFor();
    await offline.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const offlineContext = offline.context(), publicLegacy = 'wordylandOfflineTrainingV1', publicV3 = 'wordylandBest2OfflineTrainingV1';
    await offlineContext.setOffline(true);
    await offline.goto(origin + '/index.html#account');
    await offline.locator('#offlineFoundationOpen').click();
    await offline.locator('[data-offline-pack="body"]').click();
    await offline.locator('#offlineWordModel').waitFor();
    await offline.locator('#offlineFoundationPause').click();
    const publicLegacyBytes = await raw(offline, [publicLegacy]);
    await offline.locator('[data-offline-pack="best2-new-words"]').click();
    await offline.locator('#offlineWordModel').waitFor();
    const publicBefore = await raw(offline, [publicV3]);
    await offline.evaluate(key => {
      window.best2OfflineSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Synthetic public quota', 'QuotaExceededError'); return window.best2OfflineSetItem.call(this, name, value);};
    }, publicV3);
    await offline.locator('#offlineWordModel').click();
    await offline.locator('#offlineFoundationStatus').getByText(/non ha confermato/).waitFor();
    assert.deepEqual(await raw(offline, [publicV3]), publicBefore);
    assert.equal(await offline.locator('#offlineWordNext').isVisible(), false);
    await offline.evaluate(() => {Storage.prototype.setItem = window.best2OfflineSetItem;});
    let offlineSteps = 0, publicDraft = false;
    while (!await offline.locator('#offlineFoundationAgain').count()) {
      assert(++offlineSteps <= 8, 'The public new word-only round is exactly eight finite steps');
      const state = await stored(offline, publicV3), saved = state.sessions['best2-new-words'];
      const id = saved.words[Math.floor(saved.step / 4)], mode = ['model', 'recognize', 'build', 'recall'][saved.step % 4];
      assert(wordIds.includes(id));
      if (mode === 'model') await offline.locator('#offlineWordModel').dblclick();
      else if (mode === 'recognize') await offline.locator('[data-offline-word="' + id + '"]').click();
      else if (mode === 'build') {
        for (const char of id) {
          const tile = offline.locator('[data-offline-tile]:not(:disabled)').filter({hasText: new RegExp('^' + char + '$')}).first();
          await tile.focus(); await offline.keyboard.press('Enter');
        }
        await offline.locator('#offlineWordBuild').click();
      } else {
        if (!publicDraft) {
          await offline.locator('#offlineWordAnswer').fill(id.slice(0, 1));
          await offline.locator('#offlineWordHint').click();
          const beforeReload = await raw(offline, [publicV3]);
          await offline.reload();
          await offline.locator('#offlineFoundationOpen').click();
          await offline.locator('[data-offline-pack="best2-new-words"]').click();
          assert.equal(await offline.locator('#offlineWordAnswer').inputValue(), id.slice(0, 1));
          assert.match(await offline.locator('#offlineWordHintModel').innerText(), /Guardiamo insieme/);
          assert.deepEqual(await raw(offline, [publicV3]), beforeReload, 'Cold offline reload retains the unconfirmed draft and durable hint');
          publicDraft = true;
        }
        await offline.locator('#offlineWordAnswer').fill(id);
        await offline.locator('#offlineWordWrite button').click();
      }
      await offline.locator('#offlineWordNext').click();
    }
    assert.equal(offlineSteps, 8);
    assert.equal((await stored(offline, publicV3)).completed, 1);
    assert.deepEqual(await raw(offline, [publicLegacy]), publicLegacyBytes, 'New public offline practice never rewrites the legacy key');
    assert.equal(writes.filter(row => row.page === offline).length, 0);
    const publicV3Bytes = await raw(offline, [publicV3]);
    const rollbackOffline = await fresh();
    await rollbackOffline.evaluate(records => {for (const [key, value] of Object.entries(records)) localStorage.setItem(key, value);}, {...publicLegacyBytes, ...publicV3Bytes});
    const oldOfflineJs = execFileSync('git', ['show', baseline + ':dist/offline.js'], {encoding: 'utf8'});
    await rollbackOffline.route(/\/offline\.js(?:\?.*)?$/, route => route.fulfill({status: 200, contentType: 'application/javascript', body: oldOfflineJs}));
    await rollbackOffline.route(/\/training\.json(?:\?.*)?$/, route => route.fulfill({status: 200, contentType: 'application/json', body: oldFiles['training.json']}));
    await rollbackOffline.goto(origin + '/offline.html');
    await rollbackOffline.locator('#offlineFoundationOpen').click();
    assert.equal(await rollbackOffline.locator('[data-offline-pack="best2-new-words"]').count(), 0);
    await rollbackOffline.locator('[data-offline-pack="body"]').click();
    await rollbackOffline.locator('#offlineWordModel').click();
    await rollbackOffline.locator('#offlineWordNext').waitFor();
    assert.deepEqual(await raw(rollbackOffline, [publicV3]), publicV3Bytes, 'Real old offline client pruning cannot touch the isolated public V3 store');
    checkpoint('real cold public offline round: eight steps, quota without credit, keyboard, draft/help/reload, isolated old key and real 3614 offline pruning protection');
    await offline.close();
    await rollbackOffline.close();

    // The same mixed-cache case exists on the public offline page. Adoption is copy-on-write:
    // the legacy raw value is untouched, and its historical completion count is never copied.
    const hybridOffline = await fresh();
    const hybridPublicSeed = JSON.parse(publicLegacyBytes[publicLegacy]);
    hybridPublicSeed.completed = 4; // Four unrelated synthetic historical public rounds.
    await hybridOffline.evaluate(({key, value}) => localStorage.setItem(key, value), {key: publicLegacy, value: JSON.stringify(hybridPublicSeed)});
    const oldOfflinePattern = /\/offline\.js(?:\?.*)?$/;
    const oldOfflineRoute = route => route.fulfill({status: 200, contentType: 'application/javascript', body: oldOfflineJs});
    await hybridOffline.route(oldOfflinePattern, oldOfflineRoute);
    await hybridOffline.goto(origin + '/offline.html');
    await hybridOffline.locator('#offlineFoundationOpen').click();
    await hybridOffline.locator('[data-offline-pack="best2-new-words"]').click();
    await hybridOffline.locator('#offlineWordModel').click();
    await hybridOffline.locator('#offlineWordNext').click();
    let oldPublic = (await stored(hybridOffline, publicLegacy)).sessions['best2-new-words'];
    await hybridOffline.locator('[data-offline-word="' + oldPublic.words[0] + '"]').click();
    await hybridOffline.locator('#offlineWordNext').click();
    await hybridOffline.locator('[data-offline-tile]').first().click();
    await hybridOffline.locator('#offlineWordHint').click();
    await hybridOffline.locator('#offlineWordHint').click();
    oldPublic = (await stored(hybridOffline, publicLegacy)).sessions['best2-new-words'];
    assert.equal(oldPublic.step, 2);
    assert.equal(oldPublic.hint, 2);
    assert.equal(oldPublic.picks.length, 1);
    const publicHybridBytes = await raw(hybridOffline, [publicLegacy, publicV3]);
    assert.equal(publicHybridBytes[publicV3], null);
    await hybridOffline.unroute(oldOfflinePattern, oldOfflineRoute);
    await hybridOffline.reload();
    await hybridOffline.locator('#offlineFoundationOpen').click();
    await hybridOffline.locator('[data-offline-pack="best2-new-words"]').click();
    assert.equal(await hybridOffline.locator('[data-offline-slot]').count(), 1, 'The old offline partial composition remains visible after upgrade');
    assert.match(await hybridOffline.locator('#offlineWordHintModel').innerText(), /Guardiamo insieme/);
    assert.deepEqual(await raw(hybridOffline, [publicLegacy, publicV3]), publicHybridBytes, 'Reading a validated legacy fallback does not migrate or rewrite any state');
    await hybridOffline.evaluate(key => {
      window.best2HybridSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {if (name === key) throw new DOMException('Synthetic adoption quota', 'QuotaExceededError'); return window.best2HybridSetItem.call(this, name, value);};
    }, publicV3);
    await hybridOffline.locator('[data-offline-tile]:not(:disabled)').first().click();
    await hybridOffline.locator('#offlineFoundationStatus').getByText(/non ha confermato/).waitFor();
    assert.equal(await hybridOffline.locator('[data-offline-slot]').count(), 1);
    assert.deepEqual(await raw(hybridOffline, [publicLegacy, publicV3]), publicHybridBytes, 'Failed copy-on-write leaves both authoritative stores and the draft unchanged');
    await hybridOffline.evaluate(() => {Storage.prototype.setItem = window.best2HybridSetItem;});
    await hybridOffline.locator('[data-offline-tile]:not(:disabled)').first().click();
    let adopted = await stored(hybridOffline, publicV3);
    assert.equal(adopted.completed, 0, 'Unrelated legacy completion history is never imported as new awards');
    assert.equal(adopted.sessions['best2-new-words'].step, 2);
    assert.equal(adopted.sessions['best2-new-words'].hint, 2);
    assert.equal(adopted.sessions['best2-new-words'].picks.length, 2);
    assert.deepEqual(adopted.sessions['best2-new-words'].words, oldPublic.words);
    assert.deepEqual(adopted.sessions['best2-new-words'].choices, oldPublic.choices);
    assert.equal((await raw(hybridOffline, [publicLegacy]))[publicLegacy], publicHybridBytes[publicLegacy]);
    while (await hybridOffline.locator('[data-offline-slot]').count()) await hybridOffline.locator('[data-offline-slot]').first().click();
    while (!await hybridOffline.locator('#offlineFoundationAgain').count()) {
      const saved = (await stored(hybridOffline, publicV3)).sessions['best2-new-words'];
      const id = saved.words[Math.floor(saved.step / 4)], mode = ['model', 'recognize', 'build', 'recall'][saved.step % 4];
      if (mode === 'model') await hybridOffline.locator('#offlineWordModel').click();
      else if (mode === 'recognize') await hybridOffline.locator('[data-offline-word="' + id + '"]').click();
      else if (mode === 'build') {
        for (const char of id) await hybridOffline.locator('[data-offline-tile]:not(:disabled)').filter({hasText: new RegExp('^' + char + '$')}).first().click();
        await hybridOffline.locator('#offlineWordBuild').click();
      } else {
        await hybridOffline.locator('#offlineWordAnswer').fill(id);
        await hybridOffline.locator('#offlineWordWrite button').click();
      }
      await hybridOffline.locator('#offlineWordNext').click();
    }
    assert.equal((await stored(hybridOffline, publicV3)).completed, 1);
    assert.equal((await raw(hybridOffline, [publicLegacy]))[publicLegacy], publicHybridBytes[publicLegacy], 'Completing the adopted round neither alters old plans nor duplicates four old awards');
    checkpoint('real mixed-cache public offline upgrade retains partial tiles/help, atomically adopts on first write, preserves legacy bytes and credits only one new completion');
    await hybridOffline.close();

    // Full live UI for the 28 source cases in a disposable explicitly configured class.
    const pupil = await fresh();
    const suffix = randomBytes(5).toString('hex');
    const profile = await pupil.evaluate(async suffix => {
      const account = wordylandAccount;
      await account.connect(await account.request('register', {username: 'best2_ui_' + suffix, password: 'Synthetic-Best2-materials-123', adult: true}));
      return account.createProfile('SyntheticBest2');
    }, suffix);
    await req(pupil, 'hub&profile=' + profile.id);
    const club = await req(pupil, 'club-create', {profile: profile.id, name: 'Synthetic Best2 reviewed material ' + suffix, consent: true});
    const draft = await req(pupil, 'class-program-save', {club: club.id, schoolYear: '2026/2027', title: 'Synthetic reviewed Nov14 worksheets', teacherLabel: 'Synthetic teacher', method: 'Only the supplied photographs', examGoal: '', units: units.map(id => ({id, status: 'active'})), expectedRevision: 0});
    const programme = draft.program || draft;
    await req(pupil, 'class-program-publish', {program: programme.id, expectedRevision: programme.editVersion, confirmed: true});
    await pupil.evaluate(() => wordylandClassProgram.refresh());
    const manifest = await req(pupil, 'class-program-state&profile=' + profile.id);
    assert.equal(manifest.mode, 'class');
    assert.equal(manifest.allowed.grammarCases.length, 28);
    const economyBefore = await pupil.evaluate(() => ({stats: structuredClone(stats), stars}));
    const seenCases = new Map(), wrongCases = new Set(), replayCases = new Set(), phases = new Set(), illustrated = new Set();
    for (const pack of grammarPacks) {
      await grammarMenu(pupil);
      assert.deepEqual((await pupil.locator('[data-grammar-pack]').evaluateAll(nodes => nodes.map(node => node.dataset.grammarPack))).sort(), grammarPacks.slice().sort());
      const expectedCount = pack === 'best2-this-these' ? 8 : 10;
      for (let round = 0; [...seenCases.values()].filter(row => row.startsWith(pack + '|')).length < expectedCount; round++) {
        assert(round < Math.ceil(expectedCount / 3) + 1, 'All teacher cases rotate without adding topics');
        const token = await grammarStart(pupil, pack);
        let owned = (await req(pupil, 'training-state&profile=' + profile.id + '&token=' + token + '&trainingSchema=3')).session;
        assert.equal(owned.trainingSchema, 3);
        while (!owned.done) {
          const q = owned.question, id = q.grammar.id;
          const matrix = [q.grammar.pack, q.grammar.noun, q.grammar.count].join('|');
          assert(expectedMatrix.includes(matrix), 'Only an independently transcribed source case is shown');
          await objectArt(pupil, q);
          illustrated.add(q.grammar.noun);
          phases.add(q.grammar.phase);
          assert.equal(owned.program.revision, manifest.expected.programRevision);
          if (q.mode !== 'grammar-model') seenCases.set(id, matrix);
          if (q.mode !== 'grammar-model' && !wrongCases.has(id)) {
            await grammarAnswer(pupil, q, true);
            assert(await pupil.locator('#grammarFeedback .grammarFeedbackMark').evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 48));
            assert((await pupil.locator('#grammarFeedback').innerText()).length > 12, 'Errors give useful guidance');
            const failed = (await req(pupil, 'training-state&profile=' + profile.id + '&token=' + token + '&trainingSchema=3')).session;
            assert.equal(failed.step, owned.step);
            assert.equal(failed.errors, 1);
            const body = writes.filter(row => row.page === pupil && row.action === 'training-answer').at(-1).body;
            assert.equal(body.trainingSchema, 3);
            assert.equal((await req(pupil, 'training-answer', body)).replayed, true);
            wrongCases.add(id);
            if (q.mode === 'grammar-build') while (await pupil.locator('[data-grammar-picked]').count()) await pupil.locator('#grammarUndo').click();
          }
          await grammarAnswer(pupil, q);
          if (q.mode !== 'grammar-model' && !replayCases.has(id)) {
            const body = writes.filter(row => row.page === pupil && row.action === 'training-answer').at(-1).body;
            const replayed = await req(pupil, 'training-answer', body);
            assert.equal(replayed.replayed, true);
            assert.equal(replayed.session.step, owned.step + 1);
            replayCases.add(id);
          }
          const next = (await req(pupil, 'training-state&profile=' + profile.id + '&token=' + token + '&trainingSchema=3')).session;
          await nextGrammar(pupil, next);
          owned = next;
        }
        await pupil.locator('#grammarAgain').click();
        await pupil.locator('#grammarMenu').waitFor();
      }
    }
    assert.equal(seenCases.size, 28);
    assert.deepEqual([...seenCases.values()].sort(), expectedMatrix);
    assert.deepEqual([...wrongCases].sort(), [...seenCases.keys()].sort());
    assert.deepEqual([...replayCases].sort(), [...seenCases.keys()].sort());
    for (const phase of ['demonstrative-choice', 'demonstrative-build', 'demonstrative-write', 'identify-build', 'identify-write', 'sentence']) assert(phases.has(phase), phase + ' is really playable');
    assert(['bookbag', 'boy', 'hand', 'tree'].every(noun => illustrated.has(noun)));
    assert.deepEqual(await pupil.evaluate(() => ({stats: structuredClone(stats), stars})), economyBefore);
    checkpoint('all 28 hand-checked source cases render and play in the assigned synthetic class, with wrong answers, correction, keyboard composition, idempotent replay and unchanged economy');

    // Switching the actual owned profile clears the old exercise rather than leaking its session.
    await grammarMenu(pupil);
    const pendingToken = await grammarStart(pupil, 'best2-this-these');
    const secondProfile = await pupil.evaluate(() => wordylandAccount.createProfile('SyntheticOther'));
    await req(pupil, 'hub&profile=' + secondProfile.id);
    await pupil.evaluate(() => wordylandClassProgram.refresh());
    await training(pupil);
    assert.equal(await pupil.locator('#grammarHub[data-token="' + pendingToken + '"]').count(), 0);
    assert.equal(await pupil.locator('[data-grammar-resume="' + pendingToken + '"]').count(), 0);
    const leaks = await pupil.evaluate(async () => {
      const urls = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(request.url);
      return urls.filter(url => /api\.php|profile=|token=|class-program/.test(url));
    });
    assert.deepEqual(leaks, [], 'No account, programme or child-session API response is stored in CacheStorage');
    checkpoint('profile switch removes the previous private exercise, and private API/account state never enters CacheStorage');

    assert.equal(external.some(row => row.method !== 'GET' || row.body), false, 'No material, answer or identity is transmitted off-origin');
    assert(external.every(row => /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//.test(row.url)), 'Only existing public font requests may be attempted; all are blocked by this fixture');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({status: 'PASS', checks, cases: seenCases.size, words: seenWords.size, viewports: [320, 390, 1360], baseline, syntheticOnly: true, audio: 'Synthetic/no-voice branches only; human pronunciation and real devices remain unverified'}, null, 2));
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
