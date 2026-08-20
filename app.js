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

  var LIMITS = { name: 128, bio: 180, ageMin: 18, ageMax: 120 };
  var SEND_DATA_MAX_BYTES = 4096; // Telegram's hard limit for sendData()

  var GENDERS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' }
  ];

  var PREFERENCES = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'doesn\'t matter', label: "Doesn't matter" }
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
    birthday: $('birthday'),
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
    locationFooter: $('location-footer'),
    sheetRoot: $('sheetRoot'),
    sheet: $('sheet'),
    sheetBackdrop: $('sheetBackdrop'),
    sheetTitle: $('sheetTitle'),
    sheetList: $('sheetList'),
    sheetSearchWrap: $('sheetSearchWrap'),
    sheetSearch: $('sheetSearch')
  };

  // Picker rows: row button + value span, kept together for convenience.
  var pickers = {
    gender: { row: $('gender-row'), value: $('gender-value') },
    preference: { row: $('preference-row'), value: $('preference-value') },
    country: { row: $('country-row'), value: $('country-value') },
    city: { row: $('city-row'), value: $('city-value') },
    // No row/sheet here — the real <input type="date"> sits invisibly on
    // top of the row and handles the tap itself. This entry only exists so
    // setPickerValue() can drive the display span the same way it does for
    // every other field.
    birthday: { row: null, value: $('birthday-value') }
  };

  /* ---------------------------------------------------------------- state */

  var state = {
    name: '',
    birthday: '',      // ISO date string, YYYY-MM-DD
    gender: null,      // { value, label }
    preference: null,  // { value, label }
    bio: '',
    country: null,     // country name
    city: null,        // city name
    usePhoto: false,   // optional — only meaningful when a Telegram photo exists
    tos: false
  };

  // Set once we know whether the Telegram user has a profile photo at all.
  var telegramPhotoUrl = null;

  // A field only shows its error once the user has interacted with it (or once
  // a bad prefilled value or a submit attempt has forced it open).
  var touched = {};

  var LOCATIONS = window.LOCATIONS || {};

  // Countries sorted once, by display name, for consistent picker order.
  var COUNTRY_CODES = Object.keys(LOCATIONS).sort(function (a, b) {
    return LOCATIONS[a].name.localeCompare(LOCATIONS[b].name);
  });

  /* ------------------------------------------------------- city data (lazy) */

  // City lists are fetched on demand from cities/<CODE>.txt and cached for
  // the rest of the session, so a 400-city file only costs a request the
  // first time that country is actually picked — never on page load.
  var CITY_PREVIEW_LIMIT = 10;     // cities shown before the user types anything
  var MAX_RENDERED_OPTIONS = 150;  // cap DOM nodes even for a matched search

  var cityCache = {};   // code -> { status: 'loading'|'ready'|'error', cities?, promise? }
  var cityRequestId = 0; // guards against a stale fetch populating the wrong sheet

  /** Fetch (or reuse a cached/in-flight) city list for a country code. */
  function fetchCities(code) {
    var entry = cityCache[code];
    if (entry && entry.status === 'ready') return Promise.resolve(entry.cities);
    if (entry && entry.promise) return entry.promise;

    entry = cityCache[code] = { status: 'loading' };
    entry.promise = fetch('cities/' + encodeURIComponent(code) + '.txt')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var cities = text.split(/\r?\n/)
          .map(function (line) { return line.trim(); })
          .filter(Boolean);
        entry.status = 'ready';
        entry.cities = cities;
        delete entry.promise;
        return cities;
      })
      .catch(function (err) {
        delete cityCache[code]; // allow a future retry to fetch again
        // Surface the real cause in the console — the UI only shows a
        // generic message, but this is what actually failed (bad path,
        // opened via file://, 404, offline, etc).
        console.error('Failed to load cities for "' + code + '":', err);
        throw err;
      });

    return entry.promise;
  }

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
      if (!value) return 'Enter your name.';
      if (value.length > LIMITS.name) return 'Name must be ' + LIMITS.name + ' characters or fewer.';
      return '';
    },
    birthday: function (v) {
      var raw = String(v == null ? '' : v).trim();
      if (!raw) return 'Enter your birthday.';

      var birth = parseISODate(raw);
      if (!birth) return 'Enter a valid birthday.';
      if (birth.getTime() > Date.now()) return 'Birthday can’t be in the future.';

      var age = calculateAge(raw);
      if (age < LIMITS.ageMin) return 'You must be at least ' + LIMITS.ageMin + ' to use this bot.';
      if (age > LIMITS.ageMax) return 'Enter a valid birthday.';
      return '';
    },
    gender: function (v) { return v ? '' : 'Choose your gender.'; },
    preference: function (v) { return v ? '' : 'Choose who you want to meet.'; },
    bio: function (v) {
      var value = String(v || '').trim();
      if (!value) return 'Write a short bio.';
      if (String(v || '').length > LIMITS.bio) return 'Bio must be ' + LIMITS.bio + ' characters or fewer.';
      return '';
    },
    country: function (v) { return v ? '' : 'Choose your country.'; },
    city: function (v) { return v ? '' : 'Choose your city.'; },
    tos: function (v) { return v ? '' : 'Accept the Terms of Service and Privacy Policy to continue.'; }
  };

  var FIELD_ORDER = ['name', 'birthday', 'gender', 'preference', 'bio', 'country', 'city', 'tos'];

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

  /**
   * Constrain the native date picker to plausible birthdays: no later than
   * "LIMITS.ageMin years ago" (so picking today's date can never validate)
   * and no earlier than "LIMITS.ageMax years ago". This only affects the
   * browser/OS date-picker UI — the same range is enforced again in
   * validators.birthday regardless of what the picker allows.
   */
  function setupBirthdayLimits() {
    var today = new Date();
    var maxDate = new Date(today.getFullYear() - LIMITS.ageMin, today.getMonth(), today.getDate());
    els.birthday.max = formatISODate(maxDate);
  }

  function bindBirthday() {
    // Reflect whatever the input starts with (e.g. bfcache restore) before
    // the user ever touches it.
    setPickerValue('birthday', formatBirthdayLabel(els.birthday.value));

    els.birthday.addEventListener('input', function () {
      state.birthday = els.birthday.value;
      setPickerValue('birthday', formatBirthdayLabel(state.birthday));
      if (touched.birthday) renderError('birthday');
      updateSubmitState();
    });

    els.birthday.addEventListener('blur', function () {
      touched.birthday = true;
      refresh('birthday');
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

  var BIO_TIPS = [
    'Mention a hobby or interest you\u2019re genuinely excited about, not just that you "like" it.',
    'Add one specific, concrete detail \u2014 a favourite trip, a go-to weekend plan, a dish you always cook.',
    'Say what you\u2019re looking for, even in a few words.',
    'Keep it short. A couple of clear sentences beats a long paragraph.',
    'Skip generic lines like "I love to travel and laugh" \u2014 everyone writes that. Get specific instead.',
    'Let a bit of personality or humour come through \u2014 it\u2019s more memorable than a polished résumé.'
  ];

  function bindBioHint() {
    if (!els.bioHintButton) return;

    els.bioHintButton.addEventListener('click', function () {
      haptic('selection');
      openInfoSheet('Tips for a better bio', BIO_TIPS);
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

  /* ---------------------------------------------------------- external links */

  // Telegram must open links itself, otherwise the Mini App navigates away.
  function bindExternalLinks() {
    var map = { 'Terms of Service': TERMS_URL, 'Privacy Policy': PRIVACY_URL };
    var links = document.querySelectorAll('[data-external-link]');

    Array.prototype.forEach.call(links, function (link) {
      var url = map[link.textContent.trim()] || link.getAttribute('href');
      link.setAttribute('href', url);

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
    mode: 'picker',      // 'picker' (selectable options) or 'info' (read-only tips)
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
      doneBtn.textContent = 'Got it';
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
      loadingText.textContent = 'Loading cities…';
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
        retryBtn.textContent = 'Try again';
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
        note = 'Showing the first ' + MAX_RENDERED_OPTIONS + ' matches — refine your search to see more.';
      }
    } else if (sheet.previewLimit != null && sheet.items.length > sheet.previewLimit) {
      // No search yet, and the full list is long: show a first taste of it
      // rather than nothing, and hint that typing narrows it down.
      visible = sheet.items.slice(0, sheet.previewLimit);
      note = 'Showing ' + sheet.previewLimit + ' of ' + sheet.items.length + ' — type to search the rest.';
    } else {
      visible = sheet.items;
    }

    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'sheet__empty';
      empty.textContent = q ? 'Nothing matches “' + query.trim() + '”.' : 'Nothing to show yet.';
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
    p.value.textContent = label || 'Choose';
    p.value.classList.toggle('is-empty', !label);
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

  function countryItems() {
    return COUNTRY_CODES.map(function (code) {
      var c = LOCATIONS[code];
      return { value: code, label: c.name, flag: c.flag };
    });
  }

  /** Country display name for a stored code, or '' if none is selected. */
  function countryName(code) {
    return code && LOCATIONS[code] ? LOCATIONS[code].name : '';
  }

  /** Clear the city whenever the country changes, and lock/unlock the row. */
  function applyCountry(code, options) {
    var keepCity = options && options.keepCity;
    state.country = code; // stored as the ISO code; resolved to a name for display/payload
    setPickerValue('country', countryName(code));

    if (!keepCity) {
      state.city = null;
      setPickerValue('city', null);
      touched.city = false;
    }

    var hasCountry = !!code;
    pickers.city.row.disabled = !hasCountry;
    els.locationFooter.textContent = hasCountry
      ? 'Cities shown are the ones we support in ' + countryName(code) + '.'
      : 'Pick a country to see its cities.';

    renderError('city');
  }

  /** Turn a plain city-name array into sheet items. */
  function cityItemsFrom(cities) {
    return cities.map(function (city) { return { value: city, label: city }; });
  }

  /** Open the city sheet for `code`, fetching (or reusing cached) cities. */
  function openCitySheet(code) {
    var requestId = ++cityRequestId;

    openSheet({
      title: countryName(code),
      items: [],
      selected: state.city,
      searchable: true,
      previewLimit: CITY_PREVIEW_LIMIT,
      onSelect: function (item) {
        state.city = item.value;
        setPickerValue('city', item.label);
        touched.city = true;
        refresh('city');
      }
    });

    var cached = cityCache[code];
    if (cached && cached.status === 'ready') {
      setSheetItems(cityItemsFrom(cached.cities));
      return;
    }

    setSheetLoading();

    fetchCities(code)
      .then(function (cities) {
        if (requestId !== cityRequestId) return; // a newer request has superseded this one
        setSheetItems(cityItemsFrom(cities));
      })
      .catch(function () {
        if (requestId !== cityRequestId) return;
        setSheetError('Couldn’t load cities. Check your connection and try again.', function () {
          openCitySheet(code);
        });
      });
  }

  function bindLocationPickers() {
    pickers.country.row.addEventListener('click', function () {
      openSheet({
        title: 'Country',
        items: countryItems(),
        selected: state.country,
        searchable: COUNTRY_CODES.length > 10,
        onSelect: function (item) {
          var changed = item.value !== state.country;
          applyCountry(item.value, { keepCity: !changed });
          touched.country = true;
          refresh('country');
        }
      });
    });

    pickers.city.row.addEventListener('click', function () {
      if (!state.country) return;
      openCitySheet(state.country);
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
      // Only hand a syntactically valid date to the native input — an
      // invalid string would just be ignored by it and leave the field
      // blank, hiding the bad value from the user.
      els.birthday.value = parseISODate(iso) ? iso : '';
      setPickerValue('birthday', formatBirthdayLabel(els.birthday.value));
      if (validators.birthday(state.birthday)) touched.birthday = true;
    }

    // Optional extras: ?country=<CODE>&city=<name>. Country is matched
    // case-insensitively against ISO codes; city is validated against the
    // (lazily fetched) list for that country, since we don't have it upfront.
    var qCountry = params.get('country');
    var code = qCountry ? qCountry.trim().toUpperCase() : '';

    if (code && Object.prototype.hasOwnProperty.call(LOCATIONS, code)) {
      applyCountry(code);

      var qCity = params.get('city');
      if (qCity) {
        var wantedCity = qCity.trim();
        fetchCities(code)
          .then(function (cities) {
            // The country picker may have changed again before this resolves.
            if (state.country !== code) return;
            var match = cities.find(function (c) {
              return c.toLowerCase() === wantedCity.toLowerCase();
            });
            if (match) {
              state.city = match;
              setPickerValue('city', match);
            }
            touched.city = true;
            refresh('city');
          })
          .catch(function () {
            // City list failed to load; leave the field for manual selection.
          });
      }
    } else {
      applyCountry(null);
    }

    els.bio.value = '';
    updateCounter(els.bioCounter, 0, LIMITS.bio);
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
      state.usePhoto = true;
      els.usePhoto.checked = true;
      els.photoSection.hidden = false;
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

      // state.country holds the ISO code (picker value); resolve it to the
      // ASCII display name for the payload, same shape as before.
      country: countryName(state.country) || null,
      country_code: state.country,
      city: state.city,

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
      showAlert('This profile is too large to send. Shorten your bio and try again.');
      return;
    }

    if (tg && typeof tg.sendData === 'function') {
      try {
        haptic('notification', 'success');
        tg.sendData(json);   // delivered to the bot as a web_app_data message
        tg.close();          // most clients close on their own; harmless to repeat
      } catch (e) {
        // sendData only works for Mini Apps opened from a keyboard button.
        showAlert('Couldn’t send your profile. Open this form from the bot’s keyboard button and try again.');
      }
      return;
    }

    // Browser fallback: nothing to send to, so show what would have been sent.
    console.log('Payload (not sent — Telegram.WebApp unavailable):', payload);
    showAlert('Not running inside Telegram. The payload was logged to the console.');
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
      tgCall(function (t) { t.MainButton.setText('Save profile'); });
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
    safely('setupTelegram', setupTelegram);
    safely('renderIdentity', renderIdentity);

    safely('bindName', bindName);
    safely('setupBirthdayLimits', setupBirthdayLimits);
    safely('bindBirthday', bindBirthday);
    safely('bindBio', bindBio);
    safely('bindBioHint', bindBioHint);
    safely('bindUsePhoto', bindUsePhoto);
    safely('bindTos', bindTos);
    safely('bindExternalLinks', bindExternalLinks);
    safely('bindSheet', bindSheet);
    safely('bindSimplePicker:gender', function () { bindSimplePicker('gender', 'Gender', GENDERS); });
    safely('bindSimplePicker:preference', function () { bindSimplePicker('preference', 'Preference', PREFERENCES); });
    safely('bindLocationPickers', bindLocationPickers);

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
