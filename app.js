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

  var LIMITS = { name: 128, bio: 180, ageMin: 18, ageMax: 120 };
  var SEND_DATA_MAX_BYTES = 4096; // Telegram's hard limit for sendData()

  var GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  var PREFERENCES = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'any', label: "Doesn't matter" }
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

  /* ------------------------------------------------------------------ DOM */

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    form: $('form'),
    name: $('name'),
    nameCounter: $('name-counter'),
    age: $('age'),
    bio: $('bio'),
    bioCounter: $('bio-counter'),
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
    city: { row: $('city-row'), value: $('city-value') }
  };

  /* ---------------------------------------------------------------- state */

  var state = {
    name: '',
    age: '',
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
  var COUNTRY_NAMES = Object.keys(LOCATIONS);

  /* ------------------------------------------------------------ validation */

  var validators = {
    name: function (v) {
      var value = String(v || '').trim();
      if (!value) return 'Enter your name.';
      if (value.length > LIMITS.name) return 'Name must be ' + LIMITS.name + ' characters or fewer.';
      return '';
    },
    age: function (v) {
      var raw = String(v == null ? '' : v).trim();
      if (!raw) return 'Enter your age.';
      if (!/^\d+$/.test(raw)) return 'Age must be a whole number.';
      var n = parseInt(raw, 10);
      if (n < LIMITS.ageMin) return 'You must be at least ' + LIMITS.ageMin + ' to use this bot.';
      if (n > LIMITS.ageMax) return 'Age must be ' + LIMITS.ageMax + ' or less.';
      return '';
    },
    gender: function (v) { return v ? '' : 'Choose your gender.'; },
    preference: function (v) { return v ? '' : 'Choose who you want to meet.'; },
    bio: function (v) {
      return String(v || '').length > LIMITS.bio
        ? 'Bio must be ' + LIMITS.bio + ' characters or fewer.'
        : '';
    },
    country: function (v) { return v ? '' : 'Choose your country.'; },
    city: function (v) { return v ? '' : 'Choose your city.'; },
    tos: function (v) { return v ? '' : 'Accept the Terms of Service and Privacy Policy to continue.'; }
  };

  var FIELD_ORDER = ['name', 'age', 'gender', 'preference', 'bio', 'country', 'city', 'tos'];

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
        tg.MainButton.enable();
        // Some clients do not dim a disabled button by themselves, so we also
        // restore the accent colour here.
        tgCall(function (t) {
          t.MainButton.setParams({
            color: t.themeParams.button_color || '#2ea6ff',
            text_color: t.themeParams.button_text_color || '#ffffff'
          });
        });
      } else {
        tg.MainButton.disable();
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

  function bindAge() {
    // Block the characters a number input otherwise accepts.
    els.age.addEventListener('keydown', function (e) {
      if (['e', 'E', '+', '-', '.', ','].indexOf(e.key) !== -1) e.preventDefault();
    });

    els.age.addEventListener('input', function () {
      var v = els.age.value.replace(/\D/g, '');
      if (v.length > 3) v = v.slice(0, 3); // 120 is the ceiling, 3 digits is enough
      if (v !== els.age.value) els.age.value = v;
      state.age = v;
      if (touched.age) renderError('age');
      updateSubmitState();
    });

    els.age.addEventListener('blur', function () {
      touched.age = true;
      refresh('age');
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
    items: [],
    selected: null,
    onSelect: null,
    lastFocused: null
  };

  /**
   * @param {Object} opts
   * @param {string} opts.title       Sheet heading.
   * @param {Array}  opts.items       [{ value, label, flag? }]
   * @param {*}      opts.selected    Currently selected value, or null.
   * @param {boolean} opts.searchable Show the search field.
   * @param {Function} opts.onSelect  Called with the chosen item.
   */
  function openSheet(opts) {
    sheet.items = opts.items;
    sheet.selected = opts.selected;
    sheet.onSelect = opts.onSelect;
    sheet.lastFocused = document.activeElement;
    sheet.open = true;

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
    var q = query.trim().toLowerCase();
    var visible = q
      ? sheet.items.filter(function (item) { return item.label.toLowerCase().indexOf(q) !== -1; })
      : sheet.items;

    els.sheetList.textContent = '';

    if (!visible.length) {
      var empty = document.createElement('p');
      empty.className = 'sheet__empty';
      empty.textContent = 'Nothing matches “' + query.trim() + '”.';
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
    return COUNTRY_NAMES.map(function (name) {
      return { value: name, label: name, flag: (LOCATIONS[name] || {}).flag };
    });
  }

  function cityItems(country) {
    var cities = (LOCATIONS[country] || {}).cities || [];
    return cities.map(function (city) { return { value: city, label: city }; });
  }

  /** Clear the city whenever the country changes, and lock/unlock the row. */
  function applyCountry(country, options) {
    var keepCity = options && options.keepCity;
    state.country = country;
    setPickerValue('country', country);

    if (!keepCity) {
      state.city = null;
      setPickerValue('city', null);
      touched.city = false;
    }

    var hasCountry = !!country;
    pickers.city.row.disabled = !hasCountry;
    els.locationFooter.textContent = hasCountry
      ? 'Cities shown are the ones we support in ' + country + '.'
      : 'Pick a country to see its cities.';

    renderError('city');
  }

  function bindLocationPickers() {
    pickers.country.row.addEventListener('click', function () {
      openSheet({
        title: 'Country',
        items: countryItems(),
        selected: state.country,
        searchable: COUNTRY_NAMES.length > 10,
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
      openSheet({
        title: state.country,
        items: cityItems(state.country),
        selected: state.city,
        searchable: cityItems(state.country).length > 10,
        onSelect: function (item) {
          state.city = item.value;
          setPickerValue('city', item.label);
          touched.city = true;
          refresh('city');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ prefill */

  /**
   * Prefill Name and Age from the query string (?name=…&age=…).
   * Prefilled values are validated exactly like typed ones: an out-of-range
   * ?age=5 lands in the field, shows its error immediately and keeps the
   * submit button disabled.
   */
  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);

    var qName = params.get('name');
    if (qName === null && tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      // Sensible default when the link carries no name.
      qName = tg.initDataUnsafe.user.first_name || '';
    }

    if (qName) {
      state.name = qName.slice(0, LIMITS.name);
      els.name.value = state.name;
      if (validators.name(state.name)) touched.name = true;
    }
    updateCounter(els.nameCounter, state.name.length, LIMITS.name);

    var qAge = params.get('age');
    if (qAge !== null && qAge !== '') {
      var digits = qAge.trim().replace(/\D/g, '').slice(0, 3);
      // Keep the raw-ish value so the user sees what the link tried to set.
      state.age = digits || qAge.trim();
      els.age.value = digits;
      if (validators.age(state.age)) touched.age = true;
    }

    // Optional extras: ?country=…&city=… follow the same rules.
    var qCountry = params.get('country');
    if (qCountry && Object.prototype.hasOwnProperty.call(LOCATIONS, qCountry)) {
      applyCountry(qCountry);
      var qCity = params.get('city');
      if (qCity && (LOCATIONS[qCountry].cities || []).indexOf(qCity) !== -1) {
        state.city = qCity;
        setPickerValue('city', qCity);
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
    var user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    if (!user) return;

    var fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    els.identityName.textContent = fullName || 'Telegram user';
    els.identityMeta.textContent = user.username ? '@' + user.username : 'ID ' + user.id;

    if (user.photo_url) {
      els.identityAvatar.style.backgroundImage = 'url("' + user.photo_url + '")';

      // Only offer the checkbox when there is actually a photo to use, and
      // default it to checked since that's the more useful starting point.
      telegramPhotoUrl = user.photo_url;
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
      age: parseInt(state.age, 10),
      gender: state.gender ? state.gender.value : null,
      preference: state.preference ? state.preference.value : null,
      bio: state.bio.trim(),
      country: state.country,
      city: state.city,

      // Optional: only true when a Telegram photo exists and the user kept
      // the checkbox on. The bot should still treat photo_url as a hint —
      // re-derive it from the verified init data if it needs to fetch it.
      use_telegram_photo: !!(telegramPhotoUrl && state.usePhoto),

      tos_accepted: !!state.tos,

      // Identity material for the bot:
      //  - user_id is a hint only (client-side, untrusted).
      //  - init_data is the raw, signed string the bot re-verifies with HMAC.
      user_id: (tg && tg.initDataUnsafe && tg.initDataUnsafe.user)
        ? tg.initDataUnsafe.user.id
        : null,
      init_data: tg ? (tg.initData || '') : ''
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

    tg.ready();
    tg.expand();

    // Match the client chrome to the list background.
    if (atLeast('6.1')) {
      tgCall(function (t) { t.setHeaderColor('secondary_bg_color'); });
      tgCall(function (t) { t.setBackgroundColor('secondary_bg_color'); });
    }
    if (atLeast('7.7')) {
      tgCall(function (t) { t.disableVerticalSwipes(); }); // avoid closing mid-scroll
    }

    if (tg.MainButton) {
      tg.MainButton.setText('Save profile');
      tg.MainButton.show();
      tg.onEvent('mainButtonClicked', submit);
    } else {
      els.fallbackSubmit.hidden = false;
    }

    // Re-apply anything colour-dependent when the user switches theme.
    tg.onEvent('themeChanged', function () { updateSubmitState(); });
  }

  function init() {
    setupTelegram();
    renderIdentity();

    bindName();
    bindAge();
    bindBio();
    bindUsePhoto();
    bindTos();
    bindExternalLinks();
    bindSheet();
    bindSimplePicker('gender', 'Gender', GENDERS);
    bindSimplePicker('preference', 'Preference', PREFERENCES);
    bindLocationPickers();

    prefillFromQuery();
    autoGrow(els.bio);
    renderAllErrors();
    updateSubmitState();

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
