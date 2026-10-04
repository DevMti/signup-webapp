/* ===========================================================================
   app.js — Telegram Mini App profile form.

   Responsibilities:
     1. Boot the Telegram WebApp SDK (ready/expand/theme) with a browser fallback.
     2. Prefill Name and Age from the URL query string and validate them.
     3. Validate every field live and drive the MainButton enabled state.
     4. Collect the payload and hand it to the bot via sendData(), then close.

   Everything here runs in the user's client, so nothing here is trusted:
   `initDataUnsafe` is used for display only and `initData` is forwarded raw so
   the bot can verify it. See bot_verify_example.py.
   =========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- config */

  // Replace these with your real URLs.
  var TERMS_URL = 'https://example.com/terms';
  var PRIVACY_URL = 'https://example.com/privacy';

  var BOT_NAME = 'botname';
  var BOT_USERNAME = 'username';
  var BOT_PROFILE_URL = 'https://cdn-icons-png.flaticon.com/512/9187/9187604.png';
  var BOT_ID = 412412342

  // No ageMin here on purpose: the web form accepts any plausible birthday
  // and leaves the 18+ check to the bot, which can act on it (ban, etc.)
  // instead of just refusing to submit. ageMax stays as a sanity bound on
  // the date picker so nobody can scroll to an implausible 140-year-old date.
  var LIMITS = { name: 128, bio: 180, ageMax: 120 };
  var SEND_DATA_MAX_BYTES = 4096; // Telegram's hard limit for sendData()

  // Shorthand for window.I18N.t — every user-facing string in this file
  // should go through this instead of a literal, so ?language=xx (see
  // i18n.js) actually changes what's shown. Values (not just labels) stay
  // untranslated on purpose: `state.gender.value` is what gets sent to the
  // bot in buildPayload() and must stay a stable machine value regardless
  // of display language.
  var i18n = window.I18N;
  function t(key, vars) { return i18n.t(key, vars); }

  var GENDERS = [
    { value: 'Male', label: t('gender.male') },
    { value: 'Female', label: t('gender.female') }
  ];

  var PREFERENCES = [
    { value: 'Male', label: t('preference.man') },
    { value: 'Female', label: t('preference.woman') },
    { value: 'doesn\'t matter', label: t('preference.noPreference') }
  ];

  /* ------------------------------------------------------- Telegram bridge */

  // May be null when the page is opened in a plain browser.
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

  /** Run a WebApp call that may not exist on older clients. */
  function tgCall(fn) {
    if (!tg) return null;
    try { return fn(tg); } catch (e) { return null; }
  }

  function atLeast(version) {
    return !!(tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(version));
  }

  function haptic(type, style) {
    tgCall(function (t) {
      if (!t.HapticFeedback) return;
      if (type === 'selection') t.HapticFeedback.selectionChanged();
      else if (type === 'notification') t.HapticFeedback.notificationOccurred(style || 'error');
      else t.HapticFeedback.impactOccurred(style || 'light');
    });
  }

  /* ---------------------------------------------------------- debug logging */

  // Visit the app with ?debug=1 to see informational logs on-device.
  // Actual errors always surface in the panel regardless of ?debug=1 —
  // Telegram's mobile WebView gives you no console, so this is the only way
  // to see what went wrong when something silently doesn't work there.
  var DEBUG = /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search);
  var debugPanel = null;
  var debugLog = null;

  /** '1' / 'true' / 'yes' (case-insensitive) count as on; anything else, including a missing param, is off. */
  function truthyParam(value) {
    if (!value) return false;
    var v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  // ?hideprofile=1 — skips the "use my Telegram photo" step.
  var HIDE_PROFILE = truthyParam(new URLSearchParams(window.location.search).get('hideprofile'));

  // ?hide_tos=1 — skips the ToS checkbox, for flows where the user has
  // already agreed to terms upstream (see applyHideTos()). Independent of
  // HIDE_PROFILE — pass either, both, or neither.
  var HIDE_TOS = truthyParam(new URLSearchParams(window.location.search).get('hide_tos'));

  function showDebugLine(message) {
    if (!debugPanel) {
      debugPanel = document.getElementById('debugPanel');
      debugLog = document.getElementById('debugLog');
    }
    if (!debugPanel || !debugLog) return;

    debugPanel.hidden = false;
    var line = document.createElement('div');
    line.className = 'debug-panel__line';
    line.textContent = new Date().toLocaleTimeString() + '  ' + message;
    debugLog.appendChild(line);
    debugLog.scrollTop = debugLog.scrollHeight;
  }

  /** Informational log — only visible on-screen with ?debug=1. */
  function logDebug(message) {
    console.log('[app] ' + message);
    if (DEBUG) showDebugLine(message);
  }

  /** Error log — always visible on-screen, ?debug=1 or not. */
  function logError(message) {
    console.error('[app] ' + message);
    showDebugLine('⚠ ' + message);
  }

  // Catch anything that slips past the safely() wrapper below (async errors,
  // errors in event handlers, syntax issues in a dynamically added script).
  window.addEventListener('error', function (e) {
    logError('Uncaught error: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')');
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason && e.reason.message ? e.reason.message : e.reason;
    logError('Unhandled promise rejection: ' + reason);
  });

  /* ------------------------------------------------------------------ DOM */

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    form: $('form'),
    name: $('name'),
    nameCounter: $('name-counter'),
    birthdayRow: $('birthday-row'),
    bio: $('bio'),
    bioCounter: $('bio-counter'),
    bioHintButton: $('bio-hint-button'),
    identity: $('identity'),
    identityName: $('identityName'),
    identityMeta: $('identityMeta'),
    identityAvatar: $('identityAvatar'),
    photoSection: $('photo-section'),
    usePhoto: $('usePhoto'),
    tos: $('tos'),
    fallbackSubmit: $('fallbackSubmit'),
    sheetRoot: $('sheetRoot'),
    sheet: $('sheet'),
    sheetBackdrop: $('sheetBackdrop'),
    sheetTitle: $('sheetTitle'),
    sheetList: $('sheetList'),
    sheetSearchWrap: $('sheetSearchWrap'),
    sheetSearch: $('sheetSearch'),
    mapCanvas: $('mapCanvas'),
    locationCoords: $('location-coords'),
    mapUseCurrent: $('mapUseCurrent')
  };

  // Picker rows: row button + value span, kept together for convenience.
  // (The location field isn't a row/sheet picker any more — it's the inline
  // map, handled separately by initLocationMap()/bindLocationGps().)
  var pickers = {
    gender: { row: $('gender-row'), value: $('gender-value') },
    preference: { row: $('preference-row'), value: $('preference-value') },
    birthday: { row: $('birthday-row'), value: $('birthday-value') }
  };

  /* ---------------------------------------------------------------- state */

  var state = {
    name: '',
    birthday: '',      // ISO date string, YYYY-MM-DD
    gender: null,      // { value, label }
    preference: null,  // { value, label }
    bio: '',
    location: null,    // { lat, lng, source: 'device'|'map' }
    usePhoto: false,   // optional — only meaningful when a Telegram photo exists
    tos: false
  };

  // Set once we know whether the Telegram user has a profile photo at all.
  var telegramPhotoUrl = null;

  // A field only shows its error once the user has interacted with it (or once
  // a bad prefilled value or a submit attempt has forced it open).
  var touched = {};

  // Cap on DOM nodes rendered for a matched search in the (still-used) simple
  // picker sheets — gender/preference/location-chooser are all tiny lists,
  // but this stays shared in case a future list grows.
  var MAX_RENDERED_OPTIONS = 150;

  /* -------------------------------------------------------------- date helpers */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Left-pad a string with '0' to `len` chars. Avoids String.padStart for
   *  older WebViews, consistent with the rest of this file. */
  function zeroPad(str, len) {
    var s = String(str);
    while (s.length < len) s = '0' + s;
    return s;
  }

  /** 'YYYY-MM-DD' for a Date, in local time (never UTC — avoids off-by-one). */
  function formatISODate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** Parse a strict 'YYYY-MM-DD' string as a local-time Date, or null. */
  function parseISODate(raw) {
    var s = String(raw || '').trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;

    var year = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var day = parseInt(m[3], 10);
    var d = new Date(year, month - 1, day);

    // Reject values like 2000-02-30 that Date() would otherwise roll over
    // into March.
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  }

  /** 'Choose', or a formatted date like '2 Dec 2000', for the picker row. */
  function formatBirthdayLabel(raw) {
    var d = parseISODate(raw);
    if (!d) return null;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Whole years between a birthday and today, or null if unparseable. */
  function calculateAge(raw) {
    var birth = parseISODate(raw);
    if (!birth) return null;

    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    var hadBirthdayThisYear =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hadBirthdayThisYear) age--;

    return age;
  }

  /* ------------------------------------------------------------ validation */

  var validators = {
    name: function (v) {
      var value = String(v || '').trim();
      if (!value) return t('errors.name.required');
      if (value.length > LIMITS.name) return t('errors.name.tooLong', { max: LIMITS.name });
      return '';
    },
    birthday: function (v) {
      var raw = String(v == null ? '' : v).trim();
      if (!raw) return t('errors.birthday.required');

      var birth = parseISODate(raw);
      if (!birth) return t('errors.birthday.invalid');
      if (birth.getTime() > Date.now()) return t('errors.birthday.future');

      var age = calculateAge(raw);
      if (age > LIMITS.ageMax) return t('errors.birthday.invalid');
      return '';
    },
    gender: function (v) { return v ? '' : t('errors.gender.required'); },
    preference: function (v) { return v ? '' : t('errors.preference.required'); },
    bio: function (v) {
      var value = String(v || '').trim();
      if (!value) return t('errors.bio.required');
      if (String(v || '').length > LIMITS.bio) return t('errors.bio.tooLong', { max: LIMITS.bio });
      return '';
    },
    location: function (v) {
      return (v && typeof v.lat === 'number' && typeof v.lng === 'number') ? '' : t('errors.location.required');
    },
    tos: function (v) { return v ? '' : t('errors.tos.required'); }
  };

  var FIELD_ORDER = ['name', 'birthday', 'gender', 'preference', 'bio', 'location', 'tos'];

  function errorFor(field) {
    return validators[field](state[field]);
  }

  function isFormValid() {
    return FIELD_ORDER.every(function (f) { return !errorFor(f); });
  }

  /** Paint (or clear) the inline error under a field. */
  function renderError(field) {
    var node = $(field + '-error');
    var wrapper = document.querySelector('.field[data-field="' + field + '"]');
    if (!node) return;

    var message = touched[field] ? errorFor(field) : '';
    if (message) {
      node.textContent = message;
      node.hidden = false;
      if (wrapper) wrapper.classList.add('is-invalid');
    } else {
      node.textContent = '';
      node.hidden = true;
      if (wrapper) wrapper.classList.remove('is-invalid');
    }
  }

  function renderAllErrors() {
    FIELD_ORDER.forEach(renderError);
  }

  /** Single entry point after any state change. */
  function refresh(field) {
    if (field) renderError(field);
    updateSubmitState();
  }

  /* -------------------------------------------------------- submit button */

  function updateSubmitState() {
    var valid = isFormValid();

    if (tg && tg.MainButton) {
      if (valid) {
        tgCall(function (t) { t.MainButton.enable(); });
        // Some clients do not dim a disabled button by themselves, so we also
        // restore the accent colour here.
        tgCall(function (t) {
          t.MainButton.setParams({
            color: t.themeParams.button_color || '#2ea6ff',
            text_color: t.themeParams.button_text_color || '#ffffff'
          });
        });
      } else {
        tgCall(function (t) { t.MainButton.disable(); });
        tgCall(function (t) {
          t.MainButton.setParams({
            color: t.themeParams.hint_color || '#8e8e93',
            text_color: t.themeParams.button_text_color || '#ffffff'
          });
        });
      }
    }

    els.fallbackSubmit.disabled = !valid;
  }

  /* ------------------------------------------------------------ text fields */

  function updateCounter(node, length, max) {
    node.textContent = length + '/' + max;
    node.classList.toggle('is-limit', length >= max);
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function bindName() {
    els.name.addEventListener('input', function () {
      // maxlength already blocks typing past the limit; slice covers paste on
      // clients that ignore maxlength for programmatic input.
      if (els.name.value.length > LIMITS.name) {
        els.name.value = els.name.value.slice(0, LIMITS.name);
      }
      state.name = els.name.value;
      updateCounter(els.nameCounter, state.name.length, LIMITS.name);
      if (touched.name) renderError('name');
      updateSubmitState();
    });

    els.name.addEventListener('blur', function () {
      touched.name = true;
      refresh('name');
    });
  }

  function bindBirthday() {
    // Reflect whatever state already holds (e.g. a bfcache restore or a
    // query-string prefill that ran before this binds) before the user
    // ever taps the row.
    setPickerValue('birthday', formatBirthdayLabel(state.birthday));

    els.birthdayRow.addEventListener('click', function () {
      openDateSheet();
    });
  }

  function bindBio() {
    els.bio.addEventListener('input', function () {
      if (els.bio.value.length > LIMITS.bio) {
        els.bio.value = els.bio.value.slice(0, LIMITS.bio);
      }
      state.bio = els.bio.value;
      updateCounter(els.bioCounter, state.bio.length, LIMITS.bio);
      autoGrow(els.bio);
      if (touched.bio) renderError('bio');
      updateSubmitState();
    });

    els.bio.addEventListener('blur', function () {
      touched.bio = true;
      refresh('bio');
    });
  }

  function bindBioHint() {
    if (!els.bioHintButton) return;

    els.bioHintButton.addEventListener('click', function () {
      haptic('selection');
      openInfoSheet(t('bio.tipsTitle'), t('bio.tips'));
    });
  }

  function bindUsePhoto() {
    els.usePhoto.addEventListener('change', function () {
      state.usePhoto = els.usePhoto.checked;
      haptic('selection');
    });
  }

  function bindTos() {
    els.tos.addEventListener('change', function () {
      state.tos = els.tos.checked;
      touched.tos = true;
      haptic('selection');
      refresh('tos');
    });
  }

  /**
   * ?hide_tos=1 hides the ToS checkbox and treats it as already accepted —
   * the assumption being that whatever upstream flow set hide_tos already
   * got the user's agreement. Runs after bindTos() so the checkbox's own
   * state/listeners are already in place; refresh('tos') re-validates
   * immediately so a hidden, unticked box can't block submit.
   */
  function applyHideTos() {
    if (!HIDE_TOS) return;

    var tosField = document.querySelector('.field[data-field="tos"]');
    var tosSection = tosField ? tosField.closest('.section') : null;
    if (tosSection) tosSection.hidden = true;

    state.tos = true;
    els.tos.checked = true;
    refresh('tos');
  }

  /* ---------------------------------------------------------- external links */

  /**
   * Fill #tos-label from the translation. The translation string carries
   * {termsLink}/{privacyLink} placeholders so each language can put the
   * links wherever its own word order needs them; the hrefs/text here are
   * the only untranslated bit, since they're config (TERMS_URL/PRIVACY_URL),
   * not display copy.
   */
  function renderTosLabel() {
    var label = $('tos-label');
    if (!label) return;

    var termsLink = '<a href="' + TERMS_URL + '" data-external-link>' + t('tos.terms') + '</a>';
    var privacyLink = '<a href="' + PRIVACY_URL + '" data-external-link>' + t('tos.privacy') + '</a>';

    label.innerHTML = t('tos.labelHtml', { termsLink: termsLink, privacyLink: privacyLink });
  }

  // Telegram must open links itself, otherwise the Mini App navigates away.
  function bindExternalLinks() {
    var links = document.querySelectorAll('[data-external-link]');

    Array.prototype.forEach.call(links, function (link) {
      var url = link.getAttribute('href');

      link.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();   // don't toggle the checkbox we sit inside
        if (tg && typeof tg.openLink === 'function') tg.openLink(url);
        else window.open(url, '_blank', 'noopener');
      });
    });
  }

  /* -------------------------------------------------------- bottom sheet picker */

  var sheet = {
    open: false,
    mode: 'picker',      // 'picker' (selectable options), 'info' (read-only tips), or 'date' (birthday wheel)
    items: [],
    selected: null,
    onSelect: null,
    lastFocused: null,
    loading: false,      // true while an async item list (cities) is loading
    error: null,         // { message, retry } when the async load failed
    previewLimit: null,  // cap on items shown before any search text (null = show all)
    tips: null            // string[] shown when mode === 'info'
  };

  /**
   * @param {Object} opts
   * @param {string} opts.title        Sheet heading.
   * @param {Array}  opts.items        [{ value, label, flag? }]. Pass [] and
   *                                    call setSheetLoading/setSheetItems for
   *                                    async lists (e.g. cities).
   * @param {*}      opts.selected     Currently selected value, or null.
   * @param {boolean} opts.searchable  Show the search field.
   * @param {number} [opts.previewLimit] Show only this many items until the
   *                                    user types a query. Omit to always
   *                                    show the full list (e.g. countries).
   * @param {Function} opts.onSelect   Called with the chosen item.
   */
  function openSheet(opts) {
    sheet.mode = 'picker';
    sheet.tips = null;
    sheet.items = opts.items;
    sheet.selected = opts.selected;
    sheet.onSelect = opts.onSelect;
    sheet.lastFocused = document.activeElement;
    sheet.open = true;
    sheet.loading = false;
    sheet.error = null;
    sheet.previewLimit = opts.previewLimit != null ? opts.previewLimit : null;

    els.sheetTitle.textContent = opts.title;
    els.sheetSearchWrap.hidden = !opts.searchable;
    els.sheetSearch.value = '';

    renderOptions('');

    els.sheetRoot.hidden = false;
    // Next frame so the transform transition actually runs.
    requestAnimationFrame(function () { els.sheetRoot.classList.add('is-open'); });

    document.body.style.overflow = 'hidden';

    // Let the hardware/Telegram back button close the sheet.
    tgCall(function (t) { if (t.BackButton) t.BackButton.show(); });

    var selectedNode = els.sheetList.querySelector('[aria-selected="true"]');
    (selectedNode || els.sheetList).focus({ preventScroll: true });
    if (selectedNode) selectedNode.scrollIntoView({ block: 'center' });
  }

  /**
   * Open the same bottom sheet used for pickers, but showing a static,
   * non-selectable list of text (e.g. bio-writing tips) with a single
   * "Got it" button instead of selectable options.
   */
  function openInfoSheet(title, tips) {
    sheet.mode = 'info';
    sheet.tips = tips;
    sheet.items = [];
    sheet.selected = null;
    sheet.onSelect = null;
    sheet.lastFocused = document.activeElement;
    sheet.open = true;
    sheet.loading = false;
    sheet.error = null;
    sheet.previewLimit = null;

    els.sheetTitle.textContent = title;
    els.sheetSearchWrap.hidden = true;
    els.sheetSearch.value = '';

    renderOptions('');

    els.sheetRoot.hidden = false;
    requestAnimationFrame(function () { els.sheetRoot.classList.add('is-open'); });

    document.body.style.overflow = 'hidden';
    tgCall(function (t) { if (t.BackButton) t.BackButton.show(); });

    els.sheetList.focus({ preventScroll: true });
  }

  /** Switch the open sheet into a loading spinner (used while cities fetch). */
  function setSheetLoading() {
    sheet.loading = true;
    sheet.error = null;
    renderOptions(els.sheetSearch.value);
  }

  /** Populate the open sheet once an async item list (cities) resolves. */
  function setSheetItems(items) {
    sheet.items = items;
    sheet.loading = false;
    sheet.error = null;
    els.sheetSearchWrap.hidden = items.length <= 10;
    renderOptions(els.sheetSearch.value);
  }

  /** Switch the open sheet into a retryable error state. */
  function setSheetError(message, retry) {
    sheet.loading = false;
    sheet.error = { message: message, retry: retry };
    renderOptions(els.sheetSearch.value);
  }

  function closeSheet() {
    if (!sheet.open) return;
    sheet.open = false;

    els.sheetRoot.classList.remove('is-open');
    document.body.style.overflow = '';
    tgCall(function (t) { if (t.BackButton) t.BackButton.hide(); });

    var hide = function () { els.sheetRoot.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) hide();
    else window.setTimeout(hide, 260);

    if (sheet.lastFocused && sheet.lastFocused.focus) {
      sheet.lastFocused.focus({ preventScroll: true });
    }
  }

  function renderOptions(query) {
    els.sheetList.textContent = '';

    if (sheet.mode === 'date') {
      renderDateWheel();
      return;
    }

    if (sheet.mode === 'info') {
      var info = document.createElement('div');
      info.className = 'sheet__info';

      var list = document.createElement('ul');
      list.className = 'sheet__tips';
      (sheet.tips || []).forEach(function (tip) {
        var li = document.createElement('li');
        li.textContent = tip;
        list.appendChild(li);
      });
      info.appendChild(list);

      var doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'sheet__retry';
      doneBtn.textContent = t('sheet.gotIt');
      doneBtn.addEventListener('click', closeSheet);
      info.appendChild(doneBtn);

      els.sheetList.appendChild(info);
      return;
    }

    if (sheet.loading) {
      var loading = document.createElement('div');
      loading.className = 'sheet__loading';
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      var loadingText = document.createElement('p');
      loadingText.textContent = t('sheet.loadingCities');
      loading.appendChild(spinner);
      loading.appendChild(loadingText);
      els.sheetList.appendChild(loading);
      return;
    }

    if (sheet.error) {
      var err = document.createElement('div');
      err.className = 'sheet__error';
      var errText = document.createElement('p');
      errText.textContent = sheet.error.message;
      err.appendChild(errText);
      if (sheet.error.retry) {
        var retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'sheet__retry';
        retryBtn.textContent = t('sheet.tryAgain');
        retryBtn.addEventListener('click', sheet.error.retry);
        err.appendChild(retryBtn);
      }
      els.sheetList.appendChild(err);
      return;
    }

    var q = query.trim().toLowerCase();
    var visible;
    var note = null;

    if (q) {
      visible = sheet.items.filter(function (item) { return item.label.toLowerCase().indexOf(q) !== -1; });
      if (visible.length > MAX_RENDERED_OPTIONS) {
        visible = visible.slice(0, MAX_RENDERED_OPTIONS);
        note = t('sheet.showingFirstMatches', { max: MAX_RENDERED_OPTIONS });
      }
    } else if (sheet.previewLimit != null && sheet.items.length > sheet.previewLimit) {
      // No search yet, and the full list is long: show a first taste of it
      // rather than nothing, and hint that typing narrows it down.
      visible = sheet.items.slice(0, sheet.previewLimit);
      note = t('sheet.showingPreview', { shown: sheet.previewLimit, total: sheet.items.length });
    } else {
      visible = sheet.items;
    }

    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'sheet__empty';
      empty.textContent = q ? t('sheet.noMatches', { query: query.trim() }) : t('sheet.nothingToShow');
      els.sheetList.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();

    visible.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(item.value === sheet.selected));

      if (item.flag) {
        var flag = document.createElement('span');
        flag.className = 'option__flag';
        flag.textContent = item.flag;
        btn.appendChild(flag);
      }

      var text = document.createElement('span');
      text.className = 'option__text';
      text.textContent = item.label;
      btn.appendChild(text);

      var tick = document.createElement('span');
      tick.className = 'option__tick';
      btn.appendChild(tick);

      btn.addEventListener('click', function () {
        haptic('selection');
        var handler = sheet.onSelect;
        closeSheet();
        if (handler) handler(item);
      });

      frag.appendChild(btn);
    });

    els.sheetList.appendChild(frag);

    if (note) {
      var noteEl = document.createElement('p');
      noteEl.className = 'sheet__truncated';
      noteEl.textContent = note;
      els.sheetList.appendChild(noteEl);
    }
  }

  function bindSheet() {
    els.sheetBackdrop.addEventListener('click', closeSheet);

    els.sheetSearch.addEventListener('input', function () {
      renderOptions(els.sheetSearch.value);
    });

    document.addEventListener('keydown', function (e) {
      if (!sheet.open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSheet();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var options = Array.prototype.slice.call(els.sheetList.querySelectorAll('.option'));
        if (!options.length) return;
        e.preventDefault();
        var index = options.indexOf(document.activeElement);
        var next = e.key === 'ArrowDown'
          ? (index + 1) % options.length
          : (index <= 0 ? options.length - 1 : index - 1);
        options[next].focus();
      }
    });

    // Keep focus inside the sheet while it is open.
    document.addEventListener('focusin', function (e) {
      if (sheet.open && !els.sheet.contains(e.target)) {
        els.sheetList.focus({ preventScroll: true });
      }
    });

    tgCall(function (t) {
      if (t.BackButton) t.onEvent('backButtonClicked', closeSheet);
    });
  }

  /* ------------------------------------------------------------- picker wiring */

  function setPickerValue(field, label) {
    var p = pickers[field];
    p.value.textContent = label || t('common.choose');
    p.value.classList.toggle('is-empty', !label);
  }

  // Common shorthands accepted from the URL for the preference picker,
  // mapped to the actual stored value (`t()` output changes with the
  // language, but the machine value never does — see the `i18n` note near
  // GENDERS/PREFERENCES above).
  var PREFERENCE_ALIASES = {
    'any': "doesn't matter",
    'everyone': "doesn't matter",
    'both': "doesn't matter",
    'no preference': "doesn't matter",
    'nopreference': "doesn't matter",
    'either': "doesn't matter",
    'man': 'Male',
    'men': 'Male',
    'woman': 'Female',
    'women': 'Female'
  };

  /**
   * Find an option from GENDERS/PREFERENCES matching a raw query-string
   * value, case-insensitively, against its stored value, its (possibly
   * translated) label, or — for `preference` — a short alias like "any".
   */
  function matchOption(options, raw, aliases) {
    if (!raw) return null;
    var q = raw.trim().toLowerCase();

    if (aliases && Object.prototype.hasOwnProperty.call(aliases, q)) {
      q = aliases[q].toLowerCase();
    }

    var found = options.find(function (o) { return o.value.toLowerCase() === q; });
    if (found) return found;

    found = options.find(function (o) { return o.label.toLowerCase() === q; });
    return found || null;
  }

  function bindSimplePicker(field, title, options) {
    pickers[field].row.addEventListener('click', function () {
      openSheet({
        title: title,
        items: options,
        selected: state[field] ? state[field].value : null,
        searchable: false,
        onSelect: function (item) {
          state[field] = { value: item.value, label: item.label };
          setPickerValue(field, item.label);
          touched[field] = true;
          refresh(field);
        }
      });
    });
  }

  /* --------------------------------------------------------- birthday wheel */

  // Must match --wheel-row-h / --wheel-rows in styles.css.
  var DATE_WHEEL_ROW_H = 42;

  // State for whichever date sheet is currently open; null otherwise.
  var dateWheel = null;

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

  function buildDayItems(count) {
    var items = [];
    for (var d = 1; d <= count; d++) items.push({ value: d, label: String(d) });
    return items;
  }

  function buildMonthItems() {
    var items = [];
    for (var m = 0; m < 12; m++) {
      items.push({ value: m, label: new Date(2000, m, 1).toLocaleDateString(undefined, { month: 'short' }) });
    }
    return items;
  }

  // Newest year first — most people scroll up from "around now" rather than
  // down from a century ago. LIMITS.ageMax is a plausibility cap, not an
  // age-gate: nothing here refuses a recent birthday.
  function buildYearItems() {
    var thisYear = new Date().getFullYear();
    var minYear = thisYear - LIMITS.ageMax;
    var items = [];
    for (var y = thisYear; y >= minYear; y--) items.push({ value: y, label: String(y) });
    return items;
  }

  /** Default scroll position for a never-set birthday: an arbitrary, plausible age. */
  function defaultBirthdayDate() {
    var d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  }

  function scrollWheelTo(col, idx, smooth) {
    col.scrollTo({ top: idx * DATE_WHEEL_ROW_H, behavior: smooth ? 'smooth' : 'auto' });
  }

  function highlightWheelCenter(col) {
    var idx = Math.round(col.scrollTop / DATE_WHEEL_ROW_H);
    var children = col.children;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.toggle('is-center', i === idx);
    }
  }

  function appendWheelItems(col, items) {
    var frag = document.createDocumentFragment();
    items.forEach(function (item, idx) {
      var el = document.createElement('div');
      el.className = 'wheel__item';
      el.textContent = item.label;
      el.addEventListener('click', function () {
        haptic('selection');
        scrollWheelTo(col, idx, true);
      });
      frag.appendChild(el);
    });
    col.appendChild(frag);
    col._items = items;
  }

  /**
   * One scroll-snapping wheel column. `onSettle` fires with the picked item
   * once scrolling stops (debounced — scroll-snap fires many scroll events
   * per gesture, we only care about where it ends up).
   */
  function createWheelColumn(ariaLabel, items, selectedIndex, onSettle) {
    var col = document.createElement('div');
    col.className = 'wheel__col';
    col.setAttribute('role', 'listbox');
    col.setAttribute('aria-label', ariaLabel);
    col.tabIndex = 0;

    appendWheelItems(col, items);

    var settleTimer = null;
    col.addEventListener('scroll', function () {
      highlightWheelCenter(col);
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        var idx = Math.round(col.scrollTop / DATE_WHEEL_ROW_H);
        idx = Math.max(0, Math.min(col._items.length - 1, idx));
        haptic('selection');
        if (onSettle) onSettle(col._items[idx]);
      }, 120);
    }, { passive: true });

    col.addEventListener('keydown', function (e) {
      var idx = Math.round(col.scrollTop / DATE_WHEEL_ROW_H);
      if (e.key === 'ArrowDown') { e.preventDefault(); scrollWheelTo(col, Math.min(col._items.length - 1, idx + 1), true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); scrollWheelTo(col, Math.max(0, idx - 1), true); }
    });

    // No transition on first paint — the wheel should open already parked
    // on the right value, not visibly animate into place.
    requestAnimationFrame(function () {
      col.scrollTop = Math.max(0, selectedIndex) * DATE_WHEEL_ROW_H;
      highlightWheelCenter(col);
    });

    return col;
  }

  /** Swap the day column's items in place (e.g. 31 -> 29 after Feb/leap-year changes). */
  function resetDayColumn(col, count, keepDay) {
    col.textContent = '';
    appendWheelItems(col, buildDayItems(count));
    var idx = Math.min(keepDay, count) - 1;
    col.scrollTop = idx * DATE_WHEEL_ROW_H;
    highlightWheelCenter(col);
  }

  function updateDateSheetSummary() {
    var el = document.getElementById('dateSheetSummary');
    if (!el || !dateWheel) return;
    var iso = formatISODate(new Date(dateWheel.year, dateWheel.month, dateWheel.day));
    el.textContent = formatBirthdayLabel(iso) || '';
  }

  /** Re-clamp the day when month/year changes land on a shorter month. */
  function syncDayToMonth() {
    var maxDay = daysInMonth(dateWheel.year, dateWheel.month);
    if (dateWheel.day > maxDay) dateWheel.day = maxDay;
    if (dateWheel.dayCol && dateWheel.dayCol._items.length !== maxDay) {
      resetDayColumn(dateWheel.dayCol, maxDay, dateWheel.day);
    }
  }

  function renderDateWheel() {
    var wrap = document.createElement('div');
    wrap.className = 'sheet__date';

    var wheels = document.createElement('div');
    wheels.className = 'sheet__date-wheels';

    var highlight = document.createElement('div');
    highlight.className = 'sheet__date-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    wheels.appendChild(highlight);

    var maxDay = daysInMonth(dateWheel.year, dateWheel.month);
    if (dateWheel.day > maxDay) dateWheel.day = maxDay;

    var dayCol = createWheelColumn(t('field.birthday.label') + ' \u2014 day', buildDayItems(maxDay), dateWheel.day - 1, function (item) {
      dateWheel.day = item.value;
      updateDateSheetSummary();
    });
    dayCol.classList.add('wheel__col--day');
    dateWheel.dayCol = dayCol;

    var monthItems = buildMonthItems();
    var monthCol = createWheelColumn(t('field.birthday.label') + ' \u2014 month', monthItems, dateWheel.month, function (item) {
      dateWheel.month = item.value;
      syncDayToMonth();
      updateDateSheetSummary();
    });
    monthCol.classList.add('wheel__col--month');

    var yearItems = buildYearItems();
    var yearIndex = yearItems.findIndex(function (it) { return it.value === dateWheel.year; });
    var yearCol = createWheelColumn(t('field.birthday.label') + ' \u2014 year', yearItems, yearIndex < 0 ? 0 : yearIndex, function (item) {
      dateWheel.year = item.value;
      syncDayToMonth();
      updateDateSheetSummary();
    });
    yearCol.classList.add('wheel__col--year');

    wheels.appendChild(dayCol);
    wheels.appendChild(monthCol);
    wheels.appendChild(yearCol);
    wrap.appendChild(wheels);

    var summary = document.createElement('p');
    summary.className = 'sheet__date-summary';
    summary.id = 'dateSheetSummary';
    wrap.appendChild(summary);

    var doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'sheet__retry sheet__date-done';
    doneBtn.textContent = t('sheet.done');
    doneBtn.addEventListener('click', function () {
      haptic('selection');
      var iso = formatISODate(new Date(dateWheel.year, dateWheel.month, dateWheel.day));
      state.birthday = iso;
      setPickerValue('birthday', formatBirthdayLabel(iso));
      touched.birthday = true;
      closeSheet();
      refresh('birthday');
    });
    wrap.appendChild(doneBtn);

    els.sheetList.appendChild(wrap);
    updateDateSheetSummary();
  }

  function openDateSheet() {
    sheet.mode = 'date';
    sheet.tips = null;
    sheet.items = [];
    sheet.onSelect = null;
    sheet.lastFocused = document.activeElement;
    sheet.open = true;
    sheet.loading = false;
    sheet.error = null;

    var initial = parseISODate(state.birthday) || defaultBirthdayDate();
    dateWheel = { year: initial.getFullYear(), month: initial.getMonth(), day: initial.getDate(), dayCol: null };

    els.sheetTitle.textContent = t('field.birthday.label');
    els.sheetSearchWrap.hidden = true;
    els.sheetSearch.value = '';

    renderOptions('');

    els.sheetRoot.hidden = false;
    requestAnimationFrame(function () { els.sheetRoot.classList.add('is-open'); });

    document.body.style.overflow = 'hidden';
    tgCall(function (t) { if (t.BackButton) t.BackButton.show(); });
  }

  /* --------------------------------------------------------------- location */

  // The map is part of the form from the start, so Leaflet is fetched right
  // away during init() rather than waiting for a tap — there's no picker to
  // defer it behind anymore.
  var LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
  var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';

  // Esri's "Canvas" gray basemap tiles: free, no API key and no account
  // needed, rendered from Esri/HERE/Garmin/OSM data. Not the plain osm.org
  // tile server directly, since its usage policy explicitly disallows this
  // kind of embedded, many-users app without prior arrangement. Note Esri's
  // tile path is z/y/x (y before x) unlike most XYZ servers, and there's no
  // subdomain sharding here. Max zoom tops out around 16. Swap in your own
  // tile provider/key here if you later need higher zoom or custom styling.
  var TILE_URL_LIGHT = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  var TILE_URL_DARK = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  // Esri ships the gray basemap as two stacked layers: the plain "Base"
  // above (just terrain/roads, no text) and this "Reference" layer with
  // city/town names, borders and other labels, meant to sit on top of it.
  // Without it the map looks empty. Same free, no-key service.
  var TILE_URL_LABELS_LIGHT = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
  var TILE_URL_LABELS_DARK = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
  var TILE_ATTRIBUTION = '&copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  var TILE_MAX_ZOOM = 16;

  var leafletPromise = null;
  var map = null;         // Leaflet map instance, created once
  var mapMarker = null;   // the single draggable pin

  function round6(n) { return Math.round(n * 1e6) / 1e6; }

  function loadLeaflet() {
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise(function (resolve, reject) {
      if (window.L) { resolve(window.L); return; }

      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);

      var script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = function () { resolve(window.L); };
      script.onerror = function () { reject(new Error('Failed to load Leaflet')); };
      document.head.appendChild(script);
    });

    return leafletPromise;
  }

  /** Telegram's own colour-scheme if available, else the browser's. */
  function colorScheme() {
    if (tg && tg.colorScheme) return tg.colorScheme;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  /**
   * Ask for the device's exact location. Prefers Telegram's own
   * LocationManager (Bot API 8.0+): it goes through the native permission
   * prompt and works inside the Telegram app on every platform. Falls back
   * to the browser Geolocation API when running outside Telegram or on an
   * older client. Resolves with { lat, lng }; rejects if denied/unavailable.
   */
  function requestDeviceLocation() {
    return new Promise(function (resolve, reject) {
      var lm = tg && tg.LocationManager;

      if (lm && typeof lm.init === 'function') {
        lm.init(function () {
          if (!lm.isLocationAvailable) { reject(new Error('unavailable')); return; }
          lm.getLocation(function (data) {
            if (!data) { reject(new Error('denied')); return; }
            resolve({ lat: data.latitude, lng: data.longitude });
          });
        });
        return;
      }

      if (!navigator.geolocation) { reject(new Error('unavailable')); return; }

      navigator.geolocation.getCurrentPosition(
        function (pos) { resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        function (err) { reject(err); },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }

  /** '40.4168, -3.7038' badge text; '' (→ "Choose") if nothing is set yet. */
  function formatLocationLabel(loc) {
    if (!loc) return '';
    return round6(loc.lat) + ', ' + round6(loc.lng);
  }

  /** Move (or create) the pin and pan the map to it, without touching state. */
  function placeMarker(L, lat, lng, pan) {
    if (mapMarker) {
      mapMarker.setLatLng([lat, lng]);
    } else {
      mapMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
      mapMarker.on('dragend', function () {
        var p = mapMarker.getLatLng();
        applyLocation({ lat: p.lat, lng: p.lng }, 'map');
      });
    }
    if (pan) map.panTo([lat, lng]);
  }

  /** Record a chosen location — from a map tap/drag, GPS, or the query string. */
  function applyLocation(loc, source) {
    state.location = loc ? { lat: loc.lat, lng: loc.lng, source: source } : null;

    els.locationCoords.textContent = formatLocationLabel(state.location) || t('common.choose');
    els.locationCoords.classList.toggle('is-empty', !state.location);

    touched.location = true;
    refresh('location');

    if (map && loc) placeMarker(window.L, loc.lat, loc.lng, true);
  }

  /** Build the map once, with a pin only if a starting point is already known. */
  function initLocationMap() {
    loadLeaflet().then(function (L) {
      // Read this now, not when initLocationMap() was called: prefillFromQuery()
      // (a possible ?lat=&lng=) runs synchronously right after this call, well
      // before this async callback fires, so state.location may already be set.
      var start = state.location;

      map = L.map(els.mapCanvas, { attributionControl: true }).setView(
        start ? [start.lat, start.lng] : [20, 0],
        start ? 13 : 2
      );

      var dark = colorScheme() === 'dark';

      L.tileLayer(dark ? TILE_URL_DARK : TILE_URL_LIGHT, {
        maxZoom: 18,
        maxNativeZoom: TILE_MAX_ZOOM, // tiles stop sharpening past here; Leaflet upscales further zoom
        attribution: TILE_ATTRIBUTION
      }).addTo(map);

      // Labels on top of the base layer (see TILE_URL_LABELS_* above).
      L.tileLayer(dark ? TILE_URL_LABELS_DARK : TILE_URL_LABELS_LIGHT, {
        maxZoom: 18,
        maxNativeZoom: TILE_MAX_ZOOM,
        pane: 'shadowPane' // sits above tilePane, below markerPane/popupPane — labels show, pin stays on top
      }).addTo(map);

      map.on('click', function (e) {
        haptic('selection');
        applyLocation({ lat: e.latlng.lat, lng: e.latlng.lng }, 'map');
      });

      if (start) placeMarker(L, start.lat, start.lng, false);

      // Leaflet mis-measures a map created while its container was still
      // being laid out (e.g. fonts/images above it still loading).
      window.setTimeout(function () { map.invalidateSize(); }, 50);
    }).catch(function (err) {
      logError('loadLeaflet failed: ' + (err && err.message ? err.message : err));
      showAlert(t('location.mapLoadError'));
    });
  }

  function bindLocationGps() {
    els.mapUseCurrent.setAttribute('aria-label', t('location.useCurrentLabel'));

    els.mapUseCurrent.addEventListener('click', function () {
      haptic('selection');
      requestDeviceLocation()
        .then(function (loc) { applyLocation(loc, 'device'); })
        .catch(function () { showAlert(t('location.permissionDenied')); });
    });
  }

  /* ------------------------------------------------------------------ prefill */

  /**
   * Prefill Name and Birthday from the query string
   * (?name=…&year=…&month=…&day=…). Prefilled values are validated exactly
   * like typed ones: an underage or malformed birthday lands in the field,
   * shows its error immediately and keeps the submit button disabled.
   */
  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);

    var qName = params.get('name');
    // if (qName === null && tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    //   // Sensible default when the link carries no name.
    //   qName = tg.initDataUnsafe.user.first_name || '';
    // }

    if (qName) {
      state.name = qName.slice(0, LIMITS.name);
      els.name.value = state.name;
      if (validators.name(state.name)) touched.name = true;
    }
    updateCounter(els.nameCounter, state.name.length, LIMITS.name);

    // ?year=2000&month=12&day=02 — all three must be present. Whatever comes
    // in is validated exactly like a value picked by hand: an underage or
    // malformed date lands in the field, shows its error immediately and
    // keeps the submit button disabled.
    var qYear = params.get('year');
    var qMonth = params.get('month');
    var qDay = params.get('day');
    if (qYear && qMonth && qDay) {
      var iso = zeroPad(qYear.trim(), 4) + '-' +
        zeroPad(qMonth.trim(), 2) + '-' +
        zeroPad(qDay.trim(), 2);

      state.birthday = iso;
      setPickerValue('birthday', formatBirthdayLabel(state.birthday));
      if (validators.birthday(state.birthday)) touched.birthday = true;
    }

    // ?gender=male&preference=any — matched case-insensitively against the
    // stored value, the current display label, or (for preference) a short
    // alias. An unrecognized value is silently ignored, same as a missing one.
    var qGender = params.get('gender');
    var genderMatch = matchOption(GENDERS, qGender);
    if (genderMatch) {
      state.gender = { value: genderMatch.value, label: genderMatch.label };
      setPickerValue('gender', genderMatch.label);
      if (validators.gender(state.gender)) touched.gender = true;
    }

    var qPreference = params.get('preference');
    var preferenceMatch = matchOption(PREFERENCES, qPreference, PREFERENCE_ALIASES);
    if (preferenceMatch) {
      state.preference = { value: preferenceMatch.value, label: preferenceMatch.label };
      setPickerValue('preference', preferenceMatch.label);
      if (validators.preference(state.preference)) touched.preference = true;
    }

    // Optional extras: ?lat=<number>&lng=<number> — a pre-set starting
    // location (e.g. carried over from a previous session). Treated exactly
    // like a value picked by hand: it's marked touched so an out-of-range
    // value's error shows immediately instead of being silently accepted.
    var qLat = parseFloat(params.get('lat'));
    var qLng = parseFloat(params.get('lng'));
    if (isFinite(qLat) && isFinite(qLng) && Math.abs(qLat) <= 90 && Math.abs(qLng) <= 180) {
      applyLocation({ lat: qLat, lng: qLng }, 'map');
    }

    var qBio = params.get('bio');
    if (qBio) {
      state.bio = qBio.slice(0, LIMITS.bio);
      if (validators.bio(state.bio)) touched.bio = true;
    }
    els.bio.value = state.bio;
    updateCounter(els.bioCounter, state.bio.length, LIMITS.bio);
  }

  /* ----------------------------------------------------------------- identity */

  /**
   * Show who the form is being filled in as, and offer their Telegram photo
   * as an optional profile picture. Display only — `initDataUnsafe` is
   * client-side data and can be forged; the bot decides identity from the
   * `web_app_data` message sender and the signed `initData` string.
   */
  function renderIdentity() {
    // var user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    // if (!user) return;

    var fullName = BOT_NAME;
    els.identityName.textContent = fullName;
    els.identityMeta.textContent = BOT_USERNAME ? '@' + BOT_USERNAME : 'ID ' + BOT_ID;

    if (BOT_PROFILE_URL) {
      els.identityAvatar.style.backgroundImage = 'url("' + BOT_PROFILE_URL + '")';

      // Only offer the checkbox when there is actually a photo to use, and
      // default it to checked since that's the more useful starting point.
      telegramPhotoUrl = BOT_PROFILE_URL;
      state.usePhoto = false;
      els.usePhoto.checked = false;

      // ?hideprofile=1 hides the checkbox section (e.g. for a bot flow that
      // never wants to offer the Telegram photo). It never forces the
      // checkbox on when the section would otherwise be shown.
      els.photoSection.hidden = HIDE_PROFILE;
    } else {
      var initials = (user.first_name || '?').charAt(0) + (user.last_name || '').charAt(0);
      els.identityAvatar.textContent = initials.toUpperCase();
    }

    els.identity.hidden = false;
  }

  /* ------------------------------------------------------------------- submit */

  function buildPayload() {
    return {
      name: state.name.trim(),
      age: calculateAge(state.birthday),
      birthday: state.birthday,
      gender: state.gender ? state.gender.value : null,
      preference: state.preference ? state.preference.value : null,
      bio: state.bio.trim(),

      // Coordinates only — reverse-geocoding (country/city/etc) is left to
      // the bot, which can look the point up however it needs to.
      location: state.location ? {
        lat: round6(state.location.lat),
        lng: round6(state.location.lng),
        source: state.location.source // 'device' (GPS/network) or 'map' (manually placed pin)
      } : null,

      // Optional: only true when a Telegram photo exists and the user kept
      // the checkbox on. The bot should still treat photo_url as a hint —
      // re-derive it from the verified init data if it needs to fetch it.
      use_telegram_photo: !!(telegramPhotoUrl && state.usePhoto),

      tos_accepted: !!state.tos,

      // Identity material for the bot:
      //  - user_id is a hint only (client-side, untrusted).
      //  - init_data is the raw, signed string the bot re-verifies with HMAC.
      // user_id: (tg && tg.initDataUnsafe && tg.initDataUnsafe.user)
      //   ? tg.initDataUnsafe.user.id
      //   : null,
      // init_data: tg ? (tg.initData || '') : ''
    };
  }

  /** Focus the first invalid field and reveal every pending error. */
  function focusFirstError() {
    FIELD_ORDER.forEach(function (f) { touched[f] = true; });
    renderAllErrors();

    var firstBad = FIELD_ORDER.find(function (f) { return !!errorFor(f); });
    if (!firstBad) return;

    var target = els[firstBad] || (pickers[firstBad] && pickers[firstBad].row);
    if (target && target.focus) target.focus();
    if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'smooth' });

    haptic('notification', 'error');
  }

  function submit() {
    if (!isFormValid()) {
      focusFirstError();
      updateSubmitState();
      return;
    }

    var payload = buildPayload();
    var json = JSON.stringify(payload);

    // sendData() rejects anything over 4096 bytes.
    if (new TextEncoder().encode(json).length > SEND_DATA_MAX_BYTES) {
      showAlert(t('alerts.tooLarge'));
      return;
    }

    if (tg && typeof tg.sendData === 'function') {
      try {
        haptic('notification', 'success');
        tg.sendData(json);   // delivered to the bot as a web_app_data message
        tg.close();          // most clients close on their own; harmless to repeat
      } catch (e) {
        // sendData only works for Mini Apps opened from a keyboard button.
        showAlert(t('alerts.sendFailed'));
      }
      return;
    }

    // Browser fallback: nothing to send to, so show what would have been sent.
    // console.log('Payload (not sent — Telegram.WebApp unavailable):', payload);
    // showAlert(t('alerts.notInTelegram'));
  }

  function showAlert(message) {
    if (tg && typeof tg.showAlert === 'function') tg.showAlert(message);
    else window.alert(message);
  }

  /* --------------------------------------------------------------- bootstrap */

  function setupTelegram() {
    if (!tg) {
      // Plain browser: show the in-page submit button instead of MainButton.
      els.fallbackSubmit.hidden = false;
      return;
    }

    tgCall(function (t) { t.ready(); });
    tgCall(function (t) { t.expand(); });

    // Match the client chrome to the list background.
    if (atLeast('6.1')) {
      tgCall(function (t) { t.setHeaderColor('secondary_bg_color'); });
      tgCall(function (t) { t.setBackgroundColor('secondary_bg_color'); });
    }
    if (atLeast('7.7')) {
      tgCall(function (t) { t.disableVerticalSwipes(); }); // avoid closing mid-scroll
    }

    if (tg.MainButton) {
      tgCall(function (tgInstance) { tgInstance.MainButton.setText(t('submit.buttonText')); });
      tgCall(function (t) { t.MainButton.show(); });
      tgCall(function (t) { t.onEvent('mainButtonClicked', submit); });
    } else {
      els.fallbackSubmit.hidden = false;
    }

    // Re-apply anything colour-dependent when the user switches theme.
    tgCall(function (t) { t.onEvent('themeChanged', function () { updateSubmitState(); }); });
  }

  /**
   * Run `fn` and swallow/log any error instead of letting it abort the rest
   * of init(). Without this, a single unsupported Telegram API call (or any
   * other exception) during setup would silently stop every bind*() call
   * that hadn't run yet — pickers wouldn't open, validation wouldn't wire
   * up, and since Telegram's mobile WebView has no visible console, it
   * would look like the app just "doesn't work" with no clue why.
   */
  function safely(label, fn) {
    try {
      fn();
    } catch (err) {
      var message = (err && err.message) ? err.message : String(err);
      logError(label + ' failed: ' + message);
    }
  }

  function init() {
    // Translate every static data-i18n[-placeholder|-html] node up front, and
    // build the ToS sentence's two links, before anything else touches text.
    safely('applyStaticTranslations', function () { i18n.applyStaticTranslations(); });
    safely('renderTosLabel', renderTosLabel);

    safely('setupTelegram', setupTelegram);
    safely('renderIdentity', renderIdentity);

    safely('bindName', bindName);
    safely('bindBirthday', bindBirthday);
    safely('bindBio', bindBio);
    safely('bindBioHint', bindBioHint);
    safely('bindUsePhoto', bindUsePhoto);
    safely('bindTos', bindTos);
    safely('applyHideTos', applyHideTos);
    safely('bindExternalLinks', bindExternalLinks);
    safely('bindSheet', bindSheet);
    safely('bindSimplePicker:gender', function () { bindSimplePicker('gender', t('sheet.genderTitle'), GENDERS); });
    safely('bindSimplePicker:preference', function () { bindSimplePicker('preference', t('sheet.preferenceTitle'), PREFERENCES); });
    safely('initLocationMap', initLocationMap);
    safely('bindLocationGps', bindLocationGps);

    safely('prefillFromQuery', prefillFromQuery);
    safely('autoGrow', function () { autoGrow(els.bio); });
    safely('renderAllErrors', renderAllErrors);
    safely('updateSubmitState', updateSubmitState);

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
