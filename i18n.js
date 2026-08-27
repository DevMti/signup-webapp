/* ===========================================================================
   i18n.js — tiny translation layer for the sign-up Mini App.

   Usage
   -----
     <script src="i18n.js"></script>        <!-- before app.js -->

   Language selection (first match wins):
     1. ?language=xx in the page URL           e.g. ?language=es
     2. Telegram's language_code (if available, and running inside Telegram)
     3. The browser's language
     4. DEFAULT_LANG below

   Adding a language
   ------------------
   Copy the "en" block below, translate every value, and give it its own
   key (e.g. "es", "ru", "pt-BR"). You do NOT need to translate every key —
   any string missing from a language falls back to "en" automatically, so
   partial translations are safe to ship.

   Using it from app.js / index.html
   -----------------------------------
     window.I18N.t('errors.name.required')
     window.I18N.t('errors.bio.tooLong', { max: 180 })   // {max} -> 180
     window.I18N.applyStaticTranslations();              // fills data-i18n-* nodes
     window.I18N.lang                                    // 'en', 'es', ...
   =========================================================================== */

(function () {
  'use strict';

  var DEFAULT_LANG = 'en';

  /* ------------------------------------------------------------ dictionary */

  var TRANSLATIONS = {
    en: {
      meta: {
        title: 'Sign up'
      },

      section: {
        details: {
          header: 'Your details',
          footer: 'You must be 18 or older to use this bot.'
        },
        about: {
          header: 'About you'
        },
        bio: {
          header: 'Bio',
          footer: 'Anyone you match with can read this.'
        },
        location: {
          header: 'Location'
        },
        photo: {
          header: 'Photo',
          footer: 'Optional. You can turn this off and add a different photo later.'
        }
      },

      field: {
        name: { placeholder: 'Name' },
        birthday: { label: 'Birthday' },
        gender: { label: 'Gender' },
        preference: { label: 'Preference' },
        bio: { placeholder: 'A few words about you' },
        country: { label: 'Country' },
        city: { label: 'City' }
      },

      common: {
        choose: 'Choose',
        search: 'Search'
      },

      location: {
        footerDefault: 'Pick a country to see its cities.',
        footerWithCountry: 'Cities shown are the ones we support in {country}.'
      },

      photo: {
        useLabel: 'Use my Telegram profile picture for my profile'
      },

      tos: {
        // {termsLink} and {privacyLink} are replaced with the actual <a> tags
        // by app.js — keep both placeholders somewhere in your translation,
        // in whatever order reads naturally for the language.
        labelHtml: 'I accept the {termsLink} and the {privacyLink}.',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy'
      },

      bio: {
        hintButton: 'Tips',
        tipsTitle: 'Tips for a better bio',
        tips: [
          'Mention a hobby or interest you\u2019re genuinely excited about, not just that you "like" it.',
          'Add one specific, concrete detail \u2014 a favourite trip, a go-to weekend plan, a dish you always cook.',
          'Say what you\u2019re looking for, even in a few words.',
          'Keep it short. A couple of clear sentences beats a long paragraph.',
          'Skip generic lines like "I love to travel and laugh" \u2014 everyone writes that. Get specific instead.',
          'Let a bit of personality or humour come through \u2014 it\u2019s more memorable than a polished résumé.'
        ]
      },

      gender: {
        male: 'I\u2019m male',
        female: 'I\u2019m female'
      },

      preference: {
        man: 'Man',
        woman: 'Woman',
        noPreference: 'Doesn\u2019t matter'
      },

      sheet: {
        genderTitle: 'Gender',
        preferenceTitle: 'Preference',
        countryTitle: 'Country',
        loadingCities: 'Loading cities\u2026',
        tryAgain: 'Try again',
        gotIt: 'Got it',
        noMatches: 'Nothing matches \u201c{query}\u201d.',
        nothingToShow: 'Nothing to show yet.',
        showingFirstMatches: 'Showing the first {max} matches \u2014 refine your search to see more.',
        showingPreview: 'Showing {shown} of {total} \u2014 type to search the rest.',
        citiesLoadError: 'Couldn\u2019t load cities. Check your connection and try again.'
      },

      submit: {
        buttonText: 'Save profile'
      },

      alerts: {
        tooLarge: 'This profile is too large to send. Shorten your bio and try again.',
        sendFailed: 'Couldn\u2019t send your profile. Open this form from the bot\u2019s keyboard button and try again.',
        notInTelegram: 'Not running inside Telegram. The payload was logged to the console.'
      },

      errors: {
        name: {
          required: 'Enter your name.',
          tooLong: 'Name must be {max} characters or fewer.'
        },
        birthday: {
          required: 'Enter your birthday.',
          invalid: 'Enter a valid birthday.',
          future: 'Birthday can\u2019t be in the future.',
          tooYoung: 'You must be at least {min} to use this bot.'
        },
        gender: { required: 'Choose your gender.' },
        preference: { required: 'Choose who you want to meet.' },
        bio: {
          required: 'Write a short bio.',
          tooLong: 'Bio must be {max} characters or fewer.'
        },
        country: { required: 'Choose your country.' },
        city: { required: 'Choose your city.' },
        tos: { required: 'Accept the Terms of Service and Privacy Policy to continue.' }
      }
    }

    // Add more languages here, e.g.:
    // es: { meta: { title: 'Registrarse' }, ... }
  };

  /* -------------------------------------------------------------- lookup */

  /** Walk a dotted path ('errors.name.required') through a nested object. */
  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /** Replace {name} placeholders in a string with values from `vars`. */
  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match;
    });
  }

  /**
   * Look up `key` (dotted path) in the active language, falling back to
   * DEFAULT_LANG if missing there, and finally to the key itself so a typo
   * or missing translation is visible instead of throwing.
   */
  function t(key, vars) {
    var dict = TRANSLATIONS[I18N.lang] || {};
    var fallback = TRANSLATIONS[DEFAULT_LANG] || {};

    var value = getPath(dict, key);
    if (value === undefined) value = getPath(fallback, key);
    if (value === undefined) {
      console.warn('[i18n] Missing translation for key: ' + key);
      return key;
    }
    if (typeof value !== 'string') return value; // e.g. bio.tips array

    return interpolate(value, vars);
  }

  /* ---------------------------------------------------------- language pick */

  function detectLang() {
    // 1. Explicit query param wins over everything: ?language=es
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('language');
      if (q) return normalizeLang(q);
    } catch (e) { /* URLSearchParams unavailable — ignore */ }

    // 2. Telegram's own language_code, if the SDK is loaded and we're inside it.
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      var tgLang = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
      if (tgLang) return normalizeLang(tgLang);
    } catch (e) { /* ignore */ }

    // 3. Browser language.
    try {
      if (navigator.language) return normalizeLang(navigator.language);
    } catch (e) { /* ignore */ }

    return DEFAULT_LANG;
  }

  /** Resolve 'en-US' -> 'en' if we only ship 'en', but keep an exact match
   *  like 'pt-BR' if that specific dictionary exists. */
  function normalizeLang(raw) {
    var lang = String(raw || '').trim();
    if (TRANSLATIONS[lang]) return lang;

    var base = lang.split('-')[0].toLowerCase();
    if (TRANSLATIONS[base]) return base;

    return DEFAULT_LANG;
  }

  /* ------------------------------------------------------- static DOM fill */

  /**
   * Fill every element carrying a data-i18n-* attribute from the dictionary.
   * Supported attributes:
   *   data-i18n="key"              -> element.textContent
   *   data-i18n-placeholder="key"  -> element.placeholder
   *   data-i18n-html="key"         -> element.innerHTML (translation string
   *                                    only — never user input)
   * Call this once on DOMContentLoaded, after the DOM described in
   * index.html exists.
   */
  function applyStaticTranslations(root) {
    var scope = root || document;

    Array.prototype.forEach.call(scope.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });

    Array.prototype.forEach.call(scope.querySelectorAll('[data-i18n-placeholder]'), function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    Array.prototype.forEach.call(scope.querySelectorAll('[data-i18n-html]'), function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });

    document.documentElement.lang = I18N.lang;
    document.title = t('meta.title');
  }

  /* ------------------------------------------------------------------ API */

  var I18N = {
    lang: detectLang(),
    t: t,
    applyStaticTranslations: applyStaticTranslations,
    translations: TRANSLATIONS // exposed in case app.js needs raw access (e.g. bio.tips array)
  };

  window.I18N = I18N;
})();
