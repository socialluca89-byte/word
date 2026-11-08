// Real localhost UI, disposable synthetic identities, no production or document upload.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {randomBytes} = require('crypto');
const {chromium} = require(process.env.WORDYLAND_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WORDYLAND_TEST_URL;
assert(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Disposable localhost only');
const origin = new URL(base).origin;
const catalog = JSON.parse(fs.readFileSync('dist/training.json', 'utf8')).grammarLessons;
const newPacks = ['toys-yes-no', 'whats-this', 'it-they-choice', 'it-they-write', 'is-this', 'short-answer-gap'];
const suffix = randomBytes(4).toString('hex');
const password = 'Class-program-browser-synthetic-123';
const captures = process.env.WORDYLAND_CLASS_PROGRAM_SCREENSHOTS;
if (captures) {
  assert(['/workspace/', '/tmp/'].some(root => path.resolve(captures).startsWith(root)));
  fs.mkdirSync(captures, {recursive: true});
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.WORDYLAND_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const contexts = [], errors = [], checks = [], external = [], writes = [];
  let releaseLate;
  const req = (page, action, data) => page.evaluate(({action, data}) => wordylandAccount.request(action, data), {action, data});
  async function fresh() {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', hasTouch: true});
    contexts.push(context);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api.php') {
        writes.push({page, action: new URL(request.url()).searchParams.get('action'), body: request.postDataJSON()});
      }
    });
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    await page.goto(base);
    await page.evaluate(() => wordylandAccount.ready);
    await page.waitForFunction(() => Boolean(window.wordylandClassProgram));
    return page;
  }
  async function adult(page, label) {
    const username = 'cp_ui_' + label + '_' + suffix;
    const profile = await page.evaluate(async ({username, password, label}) => {
      const account = wordylandAccount;
      await account.connect(await account.request('register', {username, password, adult: true}));
      return account.createProfile('Synthetic' + label);
    }, {username, password, label});
    await req(page, 'hub&profile=' + profile.id);
    return {...profile, username};
  }
  async function programme(page, {adult: showAdult = false} = {}) {
    await page.evaluate(() => wordylandClassProgram.open());
    await page.locator('#classProgramHub:not([hidden])').waitFor();
    await page.locator('#classProgramAdults').waitFor();
    if (showAdult) {
      if (!await page.locator('#classProgramAdults').evaluate(node => node.open)) await page.locator('#classProgramAdults>summary').click();
      await page.locator('#classProgramManagement').locator('form').first().waitFor({state: 'attached'});
    }
  }
  async function manage(page, club) {
    await programme(page, {adult: true});
    const selector = page.locator('#classProgramManageSelect');
    await selector.waitFor();
    if (Number(await selector.inputValue()) !== club) await selector.selectOption(String(club));
    await page.locator('#classProgramForm').waitFor();
  }
  async function submitDraft(page, club, units, title) {
    await manage(page, club);
    await page.locator('#classProgramTitle').fill(title);
    await page.locator('#classProgramYear').fill('2026/2027');
    await page.locator('#classProgramTeacher').fill('Synthetic worksheet teacher');
    await page.locator('#classProgramMethod').fill('Only the shared classroom worksheets');
    await page.locator('#classProgramExamGoal').fill('');
    for (const select of await page.locator('[data-program-unit]').all()) {
      const id = await select.getAttribute('data-program-unit');
      await select.selectOption(units[id] || '');
    }
    await page.locator('#classProgramSaveDraft').focus();
    await page.keyboard.press('Enter');
    await page.locator('#classProgramAdultStatus').getByText(/Bozza salvata/).waitFor();
  }
  async function publish(page) {
    await page.locator('#classProgramPublishReview').click();
    assert.equal(await page.locator('#classProgramPublishConfirm').isDisabled(), true);
    await page.locator('#classProgramPublishCancel').click();
    assert.equal(await page.locator('#classProgramPublishConfirm').count(), 0, 'Cancel does not publish');
    await page.locator('#classProgramPublishReview').click();
    await page.locator('#classProgramPublishChecked').check();
    const before = writes.filter(row => row.page === page && row.action === 'class-program-publish').length;
    await page.locator('#classProgramPublishConfirm').dblclick();
    await page.locator('#classProgramAdultStatus').getByText(/Programma pubblicato/).waitFor();
    assert.equal(writes.filter(row => row.page === page && row.action === 'class-program-publish').length, before + 1,
      'Publication submits once after explicit review');
  }
  async function training(page) {
    await page.evaluate(() => {location.hash = 'allenamento';});
    await page.locator('#trainingHub:not([hidden]) #trainingWords').waitFor();
  }
  async function confirmModel(page) {
    await page.locator('#grammarModelContinue').focus();
    await page.keyboard.press('Enter');
    await page.locator('#grammarFeedback[data-correct=true]').waitFor();
    await page.locator('#grammarNext').click();
    await page.locator('#grammarHub:not([data-phase=model])').waitFor();
  }
  async function toggleDetails(page, formSelector) {
    const details = page.locator(formSelector).locator('..');
    if (!await details.evaluate(node => node.open)) await details.locator(':scope>summary').click();
  }
  try {
    const manager = await fresh(), pupil = await fresh(), teacher = await fresh(), other = await fresh();
    const owner = await adult(manager, 'Owner'), student = await adult(pupil, 'Pupil'), staff = await adult(teacher, 'Teacher');
    await adult(other, 'Other');
    const club = await req(manager, 'club-create', {profile: owner.id, name: 'Synthetic worksheet class A', consent: true});
    const second = await req(manager, 'club-create', {profile: owner.id, name: 'Synthetic worksheet class B', consent: true});
    await req(pupil, 'club-join', {profile: student.id, code: club.code, consent: true});
    const historical = (await req(pupil, 'training-start', {profile: student.id, track: 'letters', block: 'ae'})).session;
    assert.equal(historical.program ?? null, null);
    await submitDraft(manager, club.id, Object.fromEntries(newPacks.map(id => [id, 'active'])), 'Reviewed five worksheets');
    let manifest = await req(pupil, 'class-program-state&profile=' + student.id);
    assert.equal(manifest.mode, 'blocked');
    await publish(manager);
    manifest = await req(pupil, 'class-program-state&profile=' + student.id);
    assert.equal(manifest.mode, 'class');
    assert.deepEqual(manifest.units.map(unit => unit.id).sort(), newPacks.slice().sort());
    assert.equal(manifest.allowed.grammarCases.length, 35);
    assert.equal(manifest.training.grammarLessons.packs.reduce((sum, pack) => sum + pack.cases.length, 0), 35);
    assert.equal(manifest.training.blocks.length, 0, 'Unassigned letter blocks do not become new lessons');
    const expected = manifest.expected;
    checks.push('adult draft/review/cancel/keyboard/publish once; exactly the 35 supplied cases are assigned');

    // The same real player menu is scoped, including answer alternatives.
    await pupil.evaluate(() => wordylandClassProgram.refresh());
    await programme(pupil);
    assert.equal(await pupil.locator('[data-assigned-unit]').count(), 6);
    assert.match(await pupil.locator('#classProgramCurrentTitle').textContent(), /Reviewed five worksheets/);
    await training(pupil);
    assert.equal(await pupil.locator('[data-training-block]').count(), 0);
    await pupil.locator('[data-training-resume="' + historical.token + '"]').click();
    await pupil.locator('.programContextNote').getByText(/programma originale/).waitFor();
    const resumed = (await req(pupil, 'training-state&profile=' + student.id + '&token=' + historical.token)).session;
    assert.equal(resumed.step, historical.step);
    assert.equal(resumed.token, historical.token);
    checks.push('old unbound plans remain explicitly resumable without introducing their topics into the active programme');

    const seen = new Set(), seenCases = new Set(), wrongCases = new Set(), replayCases = new Set(), gapMethods = new Set();
    async function compose(question, reverse = false) {
      const words = question.answer.split(' ');
      if (reverse) words.reverse();
      for (const text of words) {
        const index = await pupil.locator('[data-grammar-token]:not(:disabled)').evaluateAll((nodes, text) => nodes.find(node => node.textContent.trim() === text)?.dataset.grammarToken, text);
        assert.notEqual(index, undefined, 'A real available word tile exists');
        await pupil.locator('[data-grammar-token="' + index + '"]').click();
      }
      await pupil.locator('#grammarBuildCheck').click();
    }
    for (const pack of newPacks) {
      await pupil.evaluate(() => {location.hash = 'programma-classe';});
      await programme(pupil);
      await training(pupil);
      await pupil.locator('#openGrammarTraining').click();
      await pupil.locator('#grammarMenu').waitFor();
      assert.deepEqual((await pupil.locator('[data-grammar-pack]').evaluateAll(nodes => nodes.map(node => node.dataset.grammarPack))).sort(), newPacks.slice().sort());
      const expectedCases = catalog.packs.find(row => row.id === pack).cases.map(row => row.id);
      for (let round = 0; expectedCases.some(id => !seenCases.has(id)); round++) {
        assert(round < Math.ceil(expectedCases.length / 3) + 1, 'Reviewed cases rotate rather than silently repeating forever');
        await pupil.locator('[data-grammar-pack="' + pack + '"]').click();
        await pupil.locator('#grammarHub[data-pack="' + pack + '"]').waitFor();
        const token = await pupil.locator('#grammarHub').getAttribute('data-token');
        let session = (await req(pupil, 'training-state&profile=' + student.id + '&token=' + token)).session;
        while (!session.done) {
          const q = session.question, id = q.grammar.id;
          assert.equal(session.program.revision, expected.programRevision);
          assert.equal(q.grammar.pack, pack);
          assert(manifest.allowed.grammarCases.includes(id));
          assert.equal(await pupil.locator('#grammarObjects [data-grammar-object]').count(), q.grammar.count);
          seen.add(q.grammar.phase);
          if (q.mode !== 'grammar-model') seenCases.add(id);
          if (q.mode !== 'grammar-model' && !wrongCases.has(id)) {
            if (q.mode === 'grammar-choice') {
              const wrong = q.choices.find(value => value !== q.answer);
              assert.notEqual(wrong, undefined);
              await pupil.locator('[data-grammar-choice="' + wrong + '"]').click();
            } else if (q.mode === 'grammar-write') {
              await pupil.locator('#grammarInput').fill('synthetic wrong');
              await pupil.locator('#grammarInput').press('Enter');
            } else if (q.mode === 'grammar-build') await compose(q, true);
            else assert.fail('Unknown new worksheet mode');
            await pupil.locator('#grammarFeedback[data-correct=false]').waitFor();
            assert((await pupil.locator('#grammarFeedback').textContent()).trim().length > 3, 'An error explains what to try');
            const wrong = (await req(pupil, 'training-state&profile=' + student.id + '&token=' + token)).session;
            assert.equal(wrong.step, session.step);
            assert.equal(wrong.errors, 1);
            const retry = writes.filter(row => row.page === pupil && row.action === 'training-answer').at(-1).body;
            assert.equal((await req(pupil, 'training-answer', retry)).replayed, true, 'A repeated wrong request is idempotent');
            wrongCases.add(id);
            if (q.mode === 'grammar-build') {
              while (await pupil.locator('[data-grammar-picked]').count()) await pupil.locator('#grammarUndo').click();
            }
          }
          if (q.mode === 'grammar-model') {
            await pupil.locator('#grammarModelContinue').click();
          } else if (q.mode === 'grammar-choice') {
            const choice = pupil.locator('[data-grammar-choice="' + q.answer + '"]');
            if (q.grammar.phase === 'short-gap' && !gapMethods.has('drag')) {
              await choice.dragTo(pupil.locator('#grammarGapDrop'));
              gapMethods.add('drag');
            } else if (q.grammar.phase === 'short-gap' && !gapMethods.has('tap')) {
              await choice.tap();
              gapMethods.add('tap');
            } else {
              await choice.focus();
              await pupil.keyboard.press('Enter');
              if (q.grammar.phase === 'short-gap') gapMethods.add('keyboard');
            }
          } else if (q.mode === 'grammar-write') {
            await pupil.locator('#grammarInput').fill(q.answer);
            await pupil.locator('#grammarInput').press('Enter');
          } else if (q.mode === 'grammar-build') await compose(q);
          else assert.fail('Unknown new worksheet mode');
          await pupil.locator('#grammarFeedback[data-correct=true]').waitFor();
          if (q.mode !== 'grammar-model' && !replayCases.has(id)) {
            const retry = writes.filter(row => row.page === pupil && row.action === 'training-answer').at(-1).body;
            const repeated = await req(pupil, 'training-answer', retry);
            assert.equal(repeated.replayed, true);
            assert.equal(repeated.session.step, session.step + 1);
            replayCases.add(id);
          }
          const next = (await req(pupil, 'training-state&profile=' + student.id + '&token=' + token)).session;
          await pupil.locator('#grammarNext').click();
          if (next.done) await pupil.locator('#grammarAgain').waitFor();
          else await pupil.locator('#grammarHub[data-step="' + next.step + '"]').waitFor();
          session = next;
        }
        await pupil.locator('#grammarAgain').click();
        await pupil.locator('#grammarMenu').waitFor();
      }
    }
    assert(seen.has('short-answer') && seen.has('identify-build') && seen.has('prefix-choice') && seen.has('prefix-write') && seen.has('short-gap'));
    assert.equal(seenCases.size, 35);
    assert.deepEqual([...wrongCases].sort(), [...seenCases].sort());
    assert.deepEqual([...replayCases].sort(), [...seenCases].sort());
    assert.deepEqual([...gapMethods].sort(), ['drag', 'keyboard', 'tap']);
    const starts = writes.filter(row => row.page === pupil && row.action === 'training-start' && row.body.track === 'grammar');
    assert(starts.length >= newPacks.length);
    assert(starts.every(row => row.body.programClass === club.id && row.body.programRevision === expected.programRevision));
    checks.push('all 35 supplied cases render, explain errors, accept correction and idempotent replay; gap supports native drag/tap/keyboard');

    // A second configured class requires a deliberate choice, not first-row fallback.
    await submitDraft(manager, second.id, {'classroom-dictation': 'active'}, 'Other teacher approved dictation');
    await publish(manager);
    await req(pupil, 'club-join', {profile: student.id, code: second.code, consent: true});
    await pupil.evaluate(() => wordylandClassProgram.refresh());
    assert.equal(await pupil.evaluate(() => wordylandClassProgram.state().mode), 'selection-required');
    await programme(pupil);
    assert.match(await pupil.locator('#classProgramContent').textContent(), /Scegline una/);
    await pupil.locator('#classProgramSelect').selectOption(String(second.id));
    await pupil.locator('#classProgramCurrentTitle').getByText(/Other teacher approved/).waitFor();
    await training(pupil);
    assert.equal(await pupil.locator('#openGrammarTraining').count(), 0);
    assert(await pupil.locator('[data-training-pack]').count() > 0);
    await programme(pupil);
    await pupil.locator('#classProgramSelect').selectOption(String(club.id));
    await pupil.locator('#classProgramCurrentTitle').getByText(/Reviewed five worksheets/).waitFor();
    checks.push('multiple classes require explicit selection and switch only to their published lesson set');

    // A failed class lookup cannot silently open a public/global lesson set.
    await pupil.route('**/api.php?action=class-program-state*', route => route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Synthetic unavailable programme'})}));
    await pupil.evaluate(async () => {try {await wordylandClassProgram.refresh();} catch {}});
    await pupil.evaluate(() => wordylandClassProgram.open());
    await pupil.locator('#classProgramRetry').waitFor();
    assert.equal(await pupil.locator('[data-assigned-unit]').count(), 0);
    const beforeStarts = writes.filter(row => row.page === pupil && /-start$/.test(row.action)).length;
    await pupil.evaluate(() => {location.hash = 'allenamento';});
    await pupil.locator('#trainingHub:not([hidden])').waitFor();
    assert.equal(await pupil.locator('[data-training-block], [data-training-pack], #openGrammarTraining').count(), 0);
    assert.equal(writes.filter(row => row.page === pupil && /-start$/.test(row.action)).length, beforeStarts);
    await pupil.unroute('**/api.php?action=class-program-state*');
    await pupil.evaluate(() => wordylandClassProgram.open());
    await pupil.locator('#classProgramCurrentTitle').waitFor();
    checks.push('lookup errors clear private content and never launch or display global fallback lessons');

    // Teacher grants need explicit confirmation and acceptance by the named account.
    await manage(manager, club.id);
    await toggleDetails(manager, '#classProgramTeacherForm');
    await manager.locator('#classProgramTeacherUsername').fill(staff.username);
    await manager.locator('[name=programScope][value=progress-read]').check();
    const invitationPosts = writes.filter(row => row.page === manager && row.action === 'class-program-teacher-invite').length;
    await manager.locator('#classProgramInviteTeacher').click();
    assert.equal(writes.filter(row => row.page === manager && row.action === 'class-program-teacher-invite').length, invitationPosts);
    await manager.locator('#classProgramTeacherForm input[type=checkbox]:not([name])').check();
    await manager.locator('#classProgramInviteTeacher').click();
    await manager.locator('#classProgramInvitation input').waitFor();
    const invite = await manager.locator('#classProgramInvitation input').inputValue();
    assert(/^[a-f0-9]{48}$/.test(invite));
    assert.equal(await manager.evaluate(invite => location.href.includes(invite) || Object.values(localStorage).some(value => String(value).includes(invite)), invite), false);
    await programme(teacher, {adult: true});
    await toggleDetails(teacher, '#classProgramAcceptForm');
    await teacher.locator('#classProgramAcceptToken').fill(invite);
    await teacher.locator('#classProgramAcceptForm button').click();
    await teacher.locator('#classProgramTeacherAcceptConfirm').waitFor();
    assert.equal(await teacher.locator('#classProgramTeacherAcceptConfirm').isDisabled(), true);
    assert.match(await teacher.locator('#classProgramAcceptPreview').textContent(), /Synthetic worksheet class A/);
    assert.match(await teacher.locator('#classProgramAcceptPreview').textContent(), /Leggere i progressi condivisi/);
    assert.equal(await teacher.locator('#classProgramProgressPanel').count(), 0, 'Preview grants no access');
    await teacher.locator('#classProgramTeacherAcceptChecked').check();
    await teacher.locator('#classProgramTeacherAcceptConfirm').click();
    await teacher.locator('#classProgramAdultStatus').getByText(/Incarico accettato/).waitFor();
    assert.equal(await teacher.locator('#classProgramForm').count(), 0);
    await teacher.locator('#classProgramProgressPanel>summary').click();
    await teacher.locator('#classProgramLoadProgress').click();
    await teacher.locator('#classProgramProgress').getByText(/Progressi non condivisi/).first().waitFor();
    assert(!await teacher.locator('#classProgramProgress').textContent().then(text => /[1-9]\d* attività confermate/.test(text)));
    checks.push('named read-only teacher sees only consent-gated progress and no editor; no persistent invitation token');

    // Owning adult explicitly shares only their selected child/class.
    await programme(pupil, {adult: true});
    await toggleDetails(pupil, '#classProgramConsentForm');
    await pupil.locator('#classProgramConsentProfile').selectOption({value: String(student.id)});
    // The same profile may have multiple options; choose the exact class.
    await pupil.locator('#classProgramConsentProfile').evaluate((select, club) => {
      const option = [...select.options].find(option => Number(option.dataset.club) === club);
      if (!option) throw Error('Missing authorized profile/class consent');
      select.selectedIndex = option.index;
    }, club.id);
    await pupil.locator('#classProgramConsentAllowed').check();
    await pupil.locator('#classProgramConsentConfirm').check();
    await pupil.locator('#classProgramConsentForm button').click();
    await pupil.locator('#classProgramAdultStatus').getByText(/consentita/).waitFor();
    await teacher.locator('#classProgramLoadProgress').click();
    await teacher.locator('#classProgramProgress .programProgressItem').filter({hasText: 'SyntheticPupil'}).getByText(/attività confermate/).waitFor();
    const profileBefore = await teacher.evaluate(() => wordylandAccount.info().id);
    assert.equal(profileBefore, staff.id);
    await programme(other, {adult: true});
    assert.equal(await other.locator('#classProgramLoadProgress').count(), 0);
    assert(!await other.locator('#classProgramManagement').textContent().then(text => text.includes('SyntheticPupil')));
    checks.push('per-profile/class adult consent reveals new programme outcomes without granting the teacher a player profile');

    for (const width of [320, 390, 1360]) {
      await manager.setViewportSize({width, height: 900});
      await manage(manager, club.id);
      assert(await manager.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Programme editor fits ' + width);
      assert(await manager.locator('#classProgramForm button').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)), 'Touch targets ' + width);
      if (captures) await manager.screenshot({path: path.join(captures, 'class-program-editor-' + width + '.png')});
    }
    await manager.setViewportSize({width: 390, height: 844});
    await manage(manager, club.id);
    await manager.locator('[data-program-revoke]').first().evaluate(button => button.closest('details').open = true);
    const revoke = manager.locator('[data-program-revoke]').first();
    const staffId = await revoke.getAttribute('data-program-revoke');
    await revoke.click();
    await manager.locator('[data-program-revoke-cancel]').click();
    assert.equal(await manager.locator('[data-program-revoke-confirm]').count(), 0);
    await revoke.click();
    await manager.locator('[data-program-revoke-confirm="' + staffId + '"]').click();
    await manager.locator('#classProgramAdultStatus').getByText(/revocato/).waitFor();
    await teacher.locator('#classProgramLoadProgress').click();
    await teacher.locator('#classProgramProgress').getByText(/richiede un incarico/).waitFor();
    assert.equal(await teacher.locator('#classProgramProgress h4').count(), 0, 'Revocation clears previous private report');
    checks.push('320/390/desktop editor stays reachable; cancel/revoke is explicit and clears private reports immediately');

    // Externally held state cannot overwrite a later identity after logout.
    let reached;
    const seenLate = new Promise(resolve => reached = resolve), holdLate = new Promise(resolve => releaseLate = resolve);
    await pupil.route('**/api.php?action=class-program-state*', async route => {
      const response = await route.fetch();
      reached();
      await holdLate;
      await route.fulfill({response});
    });
    await pupil.evaluate(() => {window.heldProgramme = wordylandClassProgram.refresh().catch(() => null);});
    await seenLate;
    await pupil.locator('#headerLogout').click();
    await pupil.locator('#headerLogin').waitFor();
    releaseLate();
    await pupil.evaluate(() => window.heldProgramme);
    await programme(pupil);
    assert.equal(await pupil.locator('[data-assigned-unit]').count(), 0);
    assert(!await pupil.locator('#classProgramContent').textContent().then(text => text.includes('Reviewed five worksheets')));
    checks.push('a delayed programme response after logout cannot restore another identity’s private lesson context');
    assert.deepEqual(errors, []);
    const oldPublicFont = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=optional';
    assert(external.every(url => url === oldPublicFont), 'Only the existing fixed public font stylesheet may be requested off-origin; every request is aborted');
    console.log(JSON.stringify({status: 'passed', syntheticOnly: true, checks,
      limits: ['Synthetic speech-free browser checks; no real voices, teacher accounts or pupil data', 'Existing suites retain legacy games and rewards coverage']}));
  } finally {
    releaseLate?.();
    await browser.close();
  }
})().catch(error => {console.error(error); process.exit(1);});
