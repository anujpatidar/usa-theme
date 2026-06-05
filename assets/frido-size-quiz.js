(function () {
  var BODY_CLASS = 'frido-size-quiz-open';
  var TOTAL_STEPS = 7;

  var BRANDS_POPULAR = [
    {
      id: 'nike',
      label: 'Nike',
      logo:
        '<svg width="32" height="18" viewBox="0 0 32 18" fill="none" aria-hidden="true"><path d="M2 14.5C8 11 14 7.5 22 5.5C26 4.5 28.5 4 30 3.5C28 8 22 12 14 14.5C10 16 6 16.5 2 14.5Z" fill="#111"/></svg>',
    },
    {
      id: 'adidas',
      label: 'Adidas',
      logo:
        '<svg width="28" height="18" viewBox="0 0 28 18" fill="none" aria-hidden="true"><path d="M2 15L12 3L14 5L6 15H2Z" fill="#111"/><path d="M8 15L18 3L20 5L12 15H8Z" fill="#111"/><path d="M14 15L24 3L26 5L18 15H14Z" fill="#111"/></svg>',
    },
  ];

  var BRANDS_OTHER = [
    { id: 'new_balance', label: 'New Balance', logo: '🏃' },
    { id: 'skechers', label: 'Skechers', logo: '👣' },
    { id: 'vans', label: 'Vans', logo: '🛹' },
    { id: 'converse', label: 'Converse', logo: '⭐' },
    { id: 'puma', label: 'Puma', logo: '🐆' },
    { id: 'reebok', label: 'Reebok', logo: '💪' },
  ];

  var SIZES_WOMENS = [
    '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12',
  ];

  var SIZES_MENS = [
    '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14',
  ];

  var FIT_OPTIONS = [
    { id: 'tight', emoji: '😣', title: 'Too tight', desc: 'My toes feel cramped' },
    { id: 'perfect', emoji: '😊', title: 'Perfect', desc: 'Comfortable all day' },
    { id: 'loose', emoji: '😐', title: 'Too loose', desc: 'My foot slides around' },
  ];

  var WIDTH_OPTIONS = [
    { id: 'narrow', title: 'Narrow', desc: 'Slim feet, often need narrow sizes' },
    { id: 'normal', title: 'Normal', desc: 'Standard width, most shoes fit' },
    { id: 'wide', title: 'Wide', desc: 'Need extra room in toe box' },
    { id: 'very_wide', title: 'Very wide', desc: 'Often size up for width' },
  ];

  var TOE_OPTIONS = [
    { id: 'snug', emoji: '🤏', title: 'Snug fit', desc: 'Minimal space, like athletic shoes' },
    { id: 'natural', emoji: '😊', title: 'Natural fit', desc: 'Comfortable wiggle room' },
    { id: 'extra_space', emoji: '😫', title: 'Extra space (barefoot feel)', desc: 'Maximum toe freedom' },
  ];

  var CONDITION_OPTIONS = [
    { id: 'bunions', title: 'Bunions', desc: 'Bony bump at big toe joint' },
    { id: 'neuropathy', title: 'Neuropathy', desc: 'Any bump or drop toe joint' },
    { id: 'flat_feet', title: 'Flat feet', desc: 'Low or no arch' },
    { id: 'high_arches', title: 'High arches', desc: 'Pronounced arch' },
    { id: 'plantar_fasciitis', title: 'Plantar fasciitis', desc: 'Heel pain' },
    { id: 'none', title: 'None', desc: 'No specific conditions' },
  ];

  var ACTIVITY_OPTIONS = [
    { id: 'daily_walking', emoji: '🚶', title: 'Daily walking', desc: 'Everyday wear around town' },
    { id: 'work', emoji: '💼', title: 'Work (long hours standing)', desc: 'All day standing/walking' },
    { id: 'casual', emoji: '😎', title: 'Casual', desc: 'Parks and outdoor activities' },
    { id: 'hiking', emoji: '⛰️', title: 'Hiking', desc: 'Trails and outdoor terrain' },
    { id: 'exercise', emoji: '🏋️', title: 'Gym/Training', desc: 'Workouts and training' },
  ];

  var RIBBON_SVG =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 14.5h6l-.8 6.5-2.2-1.5-2.2 1.5-.8-6.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  var TREND_SVG =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 16l5-5 4 4 7-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7h5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var EU_WOMENS = {
    '5': '35',
    '5.5': '35.5',
    '6': '36',
    '6.5': '37',
    '7': '37.5',
    '7.5': '38',
    '8': '38.5',
    '8.5': '39',
    '9': '40',
    '9.5': '40.5',
    '10': '41',
    '10.5': '41.5',
    '11': '42',
    '11.5': '42.5',
    '12': '43',
  };

  var EU_MENS = {
    '7': '40',
    '7.5': '40.5',
    '8': '41',
    '8.5': '42',
    '9': '42.5',
    '9.5': '43',
    '10': '44',
    '10.5': '44.5',
    '11': '45',
    '11.5': '45.5',
    '12': '46',
    '12.5': '47',
    '13': '48',
    '13.5': '48.5',
    '14': '49',
  };

  function euSizeFor(gender, usNum) {
    var map = gender === 'mens' ? EU_MENS : EU_WOMENS;
    return map[usNum] || '';
  }

  function formatDisplaySize(raw, gender) {
    if (!raw) return '—';
    if (/^[MW]\s/i.test(raw)) return raw;
    var num = String(raw).replace(/[^\d.]/g, '');
    if (!num) return raw;
    var prefix = gender === 'mens' ? 'M' : 'W';
    return prefix + ' ' + num;
  }

  function extractUsNum(size) {
    var m = String(size).match(/(\d+(?:\.\d+)?)/);
    return m ? m[1] : '';
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function brandLabel(id) {
    var all = BRANDS_POPULAR.concat(BRANDS_OTHER);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i].label;
    }
    return id;
  }

  function parseConfig(modal) {
    var el = qs('[data-frido-size-quiz-config]', modal);
    if (!el) return {};
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return {};
    }
  }

  function createState(config) {
    return {
      step: 1,
      brand: '',
      genderCategory: config.defaultGender || 'womens',
      brandSize: '',
      fitFeeling: '',
      footWidth: '',
      toeRoomPreference: '',
      footConditions: [],
      activity: '',
      result: null,
      loading: false,
      error: null,
    };
  }

  function renderProgress(container, step) {
    var html = '';
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var cls = 'fsq-progress__item';
      if (i < step) cls += ' is-done';
      else if (i === step) cls += ' is-active';
      html +=
        '<div class="' +
        cls +
        '">' +
        '<span class="fsq-progress__dot">' +
        i +
        '</span>' +
        '<span class="fsq-progress__line" aria-hidden="true"></span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function etaText(step) {
    var sec = Math.max(10, (TOTAL_STEPS - step + 1) * 10);
    return 'Answer a few quick questions • Takes ' + sec + ' seconds';
  }

  function renderStep(body, state) {
    var brandName = brandLabel(state.brand);
    var html = '';

    switch (state.step) {
      case 1:
        html += '<h3 class="fsq-step__heading">What brand do you usually wear?</h3>';
        html += '<p class="fsq-step__sub">This helps us match your current fit perfectly</p>';
        html += '<p class="fsq-step__label">Most popular</p>';
        html += '<div class="fsq-brands-popular">';
        BRANDS_POPULAR.forEach(function (b) {
          html +=
            '<button type="button" class="fsq-brand-btn' +
            (state.brand === b.id ? ' is-selected' : '') +
            '" data-fsq-brand="' +
            b.id +
            '"><span>' +
            b.label +
            '</span><span class="fsq-brand-btn__logo" aria-hidden="true">' +
            b.logo +
            '</span></button>';
        });
        html += '</div><p class="fsq-step__label fsq-step__label--muted">Other brands</p>';
        html += '<div class="fsq-brands-other">';
        BRANDS_OTHER.forEach(function (b) {
          html +=
            '<button type="button" class="fsq-brand-btn fsq-brand-btn--small' +
            (state.brand === b.id ? ' is-selected' : '') +
            '" data-fsq-brand="' +
            b.id +
            '"><span class="fsq-brand-btn__logo" aria-hidden="true">' +
            b.logo +
            '</span><span>' +
            b.label +
            '</span></button>';
        });
        html += '</div>';
        break;

      case 2:
        html += '<h3 class="fsq-step__heading">What\'s your size in ' + brandName + '?</h3>';
        html +=
          '<p class="fsq-step__sub">Select your most common ' +
          (state.genderCategory === 'mens' ? "men's" : "women's") +
          ' size</p>';
        html += '<div class="fsq-gender-tabs" role="tablist">';
        html +=
          '<button type="button" class="fsq-gender-tab' +
          (state.genderCategory === 'mens' ? ' is-active' : '') +
          '" data-fsq-gender="mens" role="tab">Men\'s</button>';
        html +=
          '<button type="button" class="fsq-gender-tab' +
          (state.genderCategory === 'womens' ? ' is-active' : '') +
          '" data-fsq-gender="womens" role="tab">Women\'s</button>';
        html += '</div>';
        html += '<div class="fsq-size-grid">';
        (state.genderCategory === 'mens' ? SIZES_MENS : SIZES_WOMENS).forEach(function (sz) {
          html +=
            '<button type="button" class="fsq-size-btn' +
            (state.brandSize === sz ? ' is-selected' : '') +
            '" data-fsq-size="' +
            sz +
            '">' +
            sz +
            '</button>';
        });
        html += '</div>';
        break;

      case 3:
        html += '<h3 class="fsq-step__heading">How do your ' + brandName + ' shoes fit?</h3>';
        html += '<p class="fsq-step__sub">Think about how they feel after wearing them all day</p>';
        html += '<div class="fsq-cards">';
        FIT_OPTIONS.forEach(function (opt) {
          html +=
            '<button type="button" class="fsq-card' +
            (state.fitFeeling === opt.id ? ' is-selected' : '') +
            '" data-fsq-fit="' +
            opt.id +
            '"><span class="fsq-card__emoji" aria-hidden="true">' +
            opt.emoji +
            '</span><span class="fsq-card__text"><span class="fsq-card__title">' +
            opt.title +
            '</span><span class="fsq-card__desc">' +
            opt.desc +
            '</span></span></button>';
        });
        html += '</div>';
        break;

      case 4:
        html += '<h3 class="fsq-step__heading">How would you describe your foot width?</h3>';
        html += '<p class="fsq-step__sub">Choose the option that best matches your foot shape</p>';
        html +=
          '<div class="fsq-info-pill"><span aria-hidden="true">✨</span> Barefoot shoes have extra room for natural toe spread</div>';
        html += '<div class="fsq-grid-2">';
        WIDTH_OPTIONS.forEach(function (opt) {
          html +=
            '<button type="button" class="fsq-grid-card' +
            (state.footWidth === opt.id ? ' is-selected' : '') +
            '" data-fsq-width="' +
            opt.id +
            '"><span class="fsq-grid-card__title">' +
            opt.title +
            '</span><span class="fsq-grid-card__desc">' +
            opt.desc +
            '</span></button>';
        });
        html += '</div>';
        break;

      case 5:
        html += '<h3 class="fsq-step__heading">How much toe room do you prefer?</h3>';
        html += '<p class="fsq-step__sub">More space = more natural foot movement</p>';
        html += '<div class="fsq-cards">';
        TOE_OPTIONS.forEach(function (opt) {
          html +=
            '<button type="button" class="fsq-card' +
            (state.toeRoomPreference === opt.id ? ' is-selected' : '') +
            '" data-fsq-toe="' +
            opt.id +
            '"><span class="fsq-card__emoji" aria-hidden="true">' +
            opt.emoji +
            '</span><span class="fsq-card__text"><span class="fsq-card__title">' +
            opt.title +
            '</span><span class="fsq-card__desc">' +
            opt.desc +
            '</span></span></button>';
        });
        html += '</div>';
        break;

      case 6:
        html += '<h3 class="fsq-step__heading">Do you experience any of these?</h3>';
        html += '<p class="fsq-step__sub">Select all that apply — this helps us recommend the best fit</p>';
        html += '<div class="fsq-conditions">';
        CONDITION_OPTIONS.forEach(function (opt) {
          var selected = state.footConditions.indexOf(opt.id) !== -1;
          html +=
            '<button type="button" class="fsq-condition' +
            (selected ? ' is-selected' : '') +
            '" data-fsq-condition="' +
            opt.id +
            '"><span class="fsq-condition__check" aria-hidden="true">✓</span><span class="fsq-condition__title">' +
            opt.title +
            '</span><span class="fsq-condition__desc">' +
            opt.desc +
            '</span></button>';
        });
        html += '</div>';
        html +=
          '<button type="button" class="fsq-step__proceed" data-fsq-proceed' +
          (state.footConditions.length === 0 ? ' disabled' : '') +
          '>Proceed</button>';
        break;

      case 7:
        html += '<h3 class="fsq-step__heading">Where will you mostly wear these shoes?</h3>';
        html += '<p class="fsq-step__sub">Last question! This helps optimize your comfort</p>';
        html += '<div class="fsq-activity-grid">';
        ACTIVITY_OPTIONS.forEach(function (opt) {
          html +=
            '<button type="button" class="fsq-activity' +
            (state.activity === opt.id ? ' is-selected' : '') +
            '" data-fsq-activity="' +
            opt.id +
            '"><span class="fsq-activity__emoji" aria-hidden="true">' +
            opt.emoji +
            '</span><span class="fsq-activity__title">' +
            opt.title +
            '</span><span class="fsq-activity__desc">' +
            opt.desc +
            '</span></button>';
        });
        html += '</div>';
        break;
    }

    body.innerHTML = html;
  }

  function updateChrome(modal, state) {
    var progress = qs('[data-frido-size-quiz-progress]', modal);
    var eta = qs('[data-frido-size-quiz-eta]', modal);
    var back = qs('[data-frido-size-quiz-back]', modal);
    var body = qs('[data-frido-size-quiz-body]', modal);

    if (progress) renderProgress(progress, state.step);
    if (eta) eta.textContent = etaText(state.step);
    if (back) back.hidden = state.step <= 1;
    if (body) renderStep(body, state);
  }

  function buildPayload(state, config) {
    var conditions = state.footConditions.slice();
    if (!conditions.length) {
      conditions = ['none'];
    }

    var toe = state.toeRoomPreference;
    if (toe === 'extra_room') toe = 'extra_space';

    return {
      brand: brandLabel(state.brand),
      genderCategory: state.genderCategory,
      brandSize: state.brandSize,
      fitFeeling: state.fitFeeling,
      footWidth: state.footWidth,
      toeRoomPreference: toe,
      footConditions: conditions,
      activity: state.activity,
      availableSizes: config.availableSizes || [],
      productTitle: config.productTitle || '',
    };
  }

  function renderResult(inner, data, state, modal) {
    var displaySize = formatDisplaySize(data.displaySize || data.recommendedSize, state.genderCategory);
    var usNum = extractUsNum(data.recommendedSize || displaySize);
    var eu = euSizeFor(state.genderCategory, usNum);
    var confidence = data.confidence != null ? Math.round(data.confidence) : 87;
    var adjustments = data.adjustments || [];

    var reasonsHtml = '';
    adjustments.forEach(function (adj) {
      var label = adj.factor || 'Fit factor';
      var desc = adj.description || '';
      reasonsHtml +=
        '<p class="fsq-result__reason"><span class="fsq-result__check" aria-hidden="true">✓</span><span><strong>' +
        label +
        ':</strong> ' +
        desc +
        '</span></p>';
    });

    if (!reasonsHtml && data.reasoning) {
      reasonsHtml =
        '<p class="fsq-result__reason"><span class="fsq-result__check" aria-hidden="true">✓</span><span>' +
        data.reasoning +
        '</span></p>';
    }

    var selectSize = data.recommendedSize || usNum || displaySize;

    inner.innerHTML =
      '<div class="fsq-result__badge"><span class="fsq-result__badge-icon" aria-hidden="true">' +
      RIBBON_SVG +
      '</span></div>' +
      '<h3 class="fsq-result__title">Your Perfect Fit Found!</h3>' +
      '<p class="fsq-result__sub">Based on your unique foot profile</p>' +
      '<div class="fsq-result__card">' +
      '<p class="fsq-result__label">We recommend</p>' +
      '<div class="fsq-result__size-row">' +
      '<span class="fsq-result__size">' +
      displaySize +
      '</span>' +
      (eu
        ? '<span class="fsq-result__eu-wrap"><span class="fsq-result__eu">(EU ' +
          eu +
          ')</span><span class="fsq-result__us-label">US Size</span></span>'
        : '<span class="fsq-result__eu-wrap"><span class="fsq-result__us-label">US Size</span></span>') +
      '</div>' +
      '<div class="fsq-result__confidence">' +
      TREND_SVG +
      ' ' +
      confidence +
      '% match confidence</div>' +
      '<div class="fsq-result__reasons">' +
      reasonsHtml +
      '</div>' +
      '</div>' +
      '<div class="fsq-result__stats">' +
      '<div class="fsq-result__stat"><span class="fsq-result__stat-val">' +
      confidence +
      '%</span><span class="fsq-result__stat-label">Customers match this size</span></div>' +
      '<div class="fsq-result__stat"><span class="fsq-result__stat-val">4.8★</span><span class="fsq-result__stat-label">Size accuracy rating</span></div>' +
      '<div class="fsq-result__stat"><span class="fsq-result__stat-val">2.4M+</span><span class="fsq-result__stat-label">Perfect fits delivered</span></div>' +
      '</div>' +
      '<button type="button" class="fsq-result__cta" data-fsq-select-size="' +
      String(selectSize).replace(/"/g, '&quot;') +
      '">✓ Select Size ' +
      displaySize +
      ' ›</button>';

    var cta = qs('[data-fsq-select-size]', inner);
    if (cta) {
      cta.addEventListener('click', function () {
        selectSizeOnPdp(cta.getAttribute('data-fsq-select-size'), modal);
        closeModal(modal);
      });
    }
  }

  function getPdpRoot(modal) {
    var sectionId = modal && modal._fridoSizeQuizCtx && modal._fridoSizeQuizCtx.config
      ? modal._fridoSizeQuizCtx.config.sectionId
      : null;
    if (window.FridoPdp && typeof window.FridoPdp.findPdpRoot === 'function') {
      return window.FridoPdp.findPdpRoot(sectionId);
    }
    if (sectionId) {
      return (
        document.getElementById('FridoProduct-' + sectionId) ||
        document.querySelector('[data-frido-pdp][data-section="' + sectionId + '"]')
      );
    }
    return document.querySelector('[data-frido-pdp]');
  }

  function selectSizeOnPdp(sizeLabel, modal) {
    if (!sizeLabel) return false;
    var pdpRoot = getPdpRoot(modal);

    if (window.FridoPdp && typeof window.FridoPdp.selectSize === 'function') {
      if (window.FridoPdp.selectSize(sizeLabel, pdpRoot)) return true;

      var config = modal && modal._fridoSizeQuizCtx ? modal._fridoSizeQuizCtx.config : {};
      var available = config.availableSizes || [];
      for (var i = 0; i < available.length; i++) {
        if (sizeLabelMatches(sizeLabel, available[i])) {
          if (window.FridoPdp.selectSize(available[i], pdpRoot)) return true;
        }
      }
      return false;
    }

    if (!pdpRoot) return false;
    var wrap = pdpRoot.querySelector('.frido-pdp-sizes');
    if (!wrap) return false;

    var buttons = wrap.querySelectorAll('[data-frido-option-value]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var val = btn.getAttribute('data-frido-option-value');
      if (val === sizeLabel || sizeLabelMatches(sizeLabel, val)) {
        if (!btn.disabled) btn.click();
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
    }
    return false;
  }

  function sizeLabelMatches(target, candidate) {
    var a = String(target || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    var b = String(candidate || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    if (a === b) return true;
    var numA = a.match(/(\d+(?:\.\d+)?)/);
    var numB = b.match(/(\d+(?:\.\d+)?)/);
    if (!numA || !numB || numA[1] !== numB[1]) return false;
    var prefixA = a.replace(numA[1], '').replace(/[^WM]/g, '');
    var prefixB = b.replace(numB[1], '').replace(/[^WM]/g, '');
    if (!prefixA || !prefixB) return true;
    return prefixA.charAt(0) === prefixB.charAt(0);
  }

  function showQuizView(modal) {
    var quiz = qs('[data-frido-size-quiz-quiz]', modal);
    var result = qs('[data-frido-size-quiz-result]', modal);
    if (quiz) quiz.hidden = false;
    if (result) result.hidden = true;
  }

  function showResultView(modal, data, state) {
    var quiz = qs('[data-frido-size-quiz-quiz]', modal);
    var result = qs('[data-frido-size-quiz-result]', modal);
    var inner = qs('[data-frido-size-quiz-result-inner]', modal);
    if (quiz) quiz.hidden = true;
    if (result) result.hidden = false;
    if (inner) renderResult(inner, data, state, modal);
  }

  function setLoading(modal, on) {
    var el = qs('[data-frido-size-quiz-loading]', modal);
    if (!el) return;
    el.hidden = !on;
    el.classList.toggle('is-active', !!on);
    el.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function fetchRecommendation(modal, state, config) {
    var url = config.proxyPath || '/apps/frido-size-recommendation';

    setLoading(modal, true);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(buildPayload(state, config)),
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            if (text.indexOf('<!doctype') !== -1 || text.indexOf('<html') !== -1) {
              throw new Error(
                'Size Quiz app proxy is not connected. Install the Size Quiz app on this store and redeploy the backend proxy route.'
              );
            }
            throw new Error('Size service returned an invalid response.');
          }
          if (!res.ok) {
            throw new Error(json.error || json.message || 'Request failed (' + res.status + ')');
          }
          return json;
        });
      })
      .finally(function () {
        setLoading(modal, false);
      });
  }

  function goNext(modal, ctx) {
    if (ctx.state.step < TOTAL_STEPS) {
      ctx.state.step += 1;
      updateChrome(modal, ctx.state);
      return;
    }
    fetchRecommendation(modal, ctx.state, ctx.config)
      .then(function (data) {
        ctx.state.result = data;
        showResultView(modal, data, ctx.state);
      })
      .catch(function (err) {
        ctx.state.error = err.message;
        console.error('[FridoSizeQuiz]', err);
        alert(
          err.message ||
            'We could not get a size recommendation. Please try again or pick a size manually.'
        );
      });
  }

  function goBack(modal, ctx) {
    if (ctx.state.step <= 1) return;
    ctx.state.step -= 1;
    updateChrome(modal, ctx.state);
  }

  function bindModal(modal) {
    if (modal.dataset.fridoSizeQuizBound) return;
    modal.dataset.fridoSizeQuizBound = '1';

    var config = parseConfig(modal);
    var ctx = { config: config, state: createState(config) };

    modal._fridoSizeQuizCtx = ctx;

    qs('[data-frido-size-quiz-back]', modal).addEventListener('click', function () {
      goBack(modal, ctx);
    });

    qsa('[data-frido-size-quiz-close]', modal).forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeModal(modal);
      });
    });

    qs('[data-frido-size-quiz-body]', modal).addEventListener('click', function (e) {
      var brand = e.target.closest('[data-fsq-brand]');
      if (brand) {
        ctx.state.brand = brand.getAttribute('data-fsq-brand');
        goNext(modal, ctx);
        return;
      }

      var gender = e.target.closest('[data-fsq-gender]');
      if (gender) {
        ctx.state.genderCategory = gender.getAttribute('data-fsq-gender');
        ctx.state.brandSize = '';
        updateChrome(modal, ctx.state);
        return;
      }

      var size = e.target.closest('[data-fsq-size]');
      if (size) {
        ctx.state.brandSize = size.getAttribute('data-fsq-size');
        goNext(modal, ctx);
        return;
      }

      var fit = e.target.closest('[data-fsq-fit]');
      if (fit) {
        ctx.state.fitFeeling = fit.getAttribute('data-fsq-fit');
        goNext(modal, ctx);
        return;
      }

      var width = e.target.closest('[data-fsq-width]');
      if (width) {
        ctx.state.footWidth = width.getAttribute('data-fsq-width');
        goNext(modal, ctx);
        return;
      }

      var toe = e.target.closest('[data-fsq-toe]');
      if (toe) {
        ctx.state.toeRoomPreference = toe.getAttribute('data-fsq-toe');
        goNext(modal, ctx);
        return;
      }

      var condition = e.target.closest('[data-fsq-condition]');
      if (condition) {
        var id = condition.getAttribute('data-fsq-condition');
        if (id === 'none') {
          ctx.state.footConditions = ['none'];
        } else {
          ctx.state.footConditions = ctx.state.footConditions.filter(function (c) {
            return c !== 'none';
          });
          var idx = ctx.state.footConditions.indexOf(id);
          if (idx === -1) ctx.state.footConditions.push(id);
          else ctx.state.footConditions.splice(idx, 1);
        }
        updateChrome(modal, ctx.state);
        return;
      }

      var proceedBtn = e.target.closest('[data-fsq-proceed]');
      if (proceedBtn && !proceedBtn.disabled) {
        if (ctx.state.step === 6 && ctx.state.footConditions.length) goNext(modal, ctx);
        return;
      }

      var activity = e.target.closest('[data-fsq-activity]');
      if (activity) {
        ctx.state.activity = activity.getAttribute('data-fsq-activity');
        goNext(modal, ctx);
      }
    });

    updateChrome(modal, ctx.state);
  }

  function resetModal(modal) {
    setLoading(modal, false);
    var config = parseConfig(modal);
    var ctx = { config: config, state: createState(config) };
    modal._fridoSizeQuizCtx = ctx;
    showQuizView(modal);
    updateChrome(modal, ctx.state);
  }

  function openModal(modal) {
    if (!modal) return;
    bindModal(modal);
    resetModal(modal);

    function onOpened() {
      var panel = qs('.frido-size-quiz__panel', modal);
      if (panel) panel.focus();
    }

    if (window.FridoOverlay) {
      FridoOverlay.open(modal, { bodyClass: BODY_CLASS, onOpened: onOpened });
    } else {
      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.classList.add(BODY_CLASS);
      onOpened();
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    setLoading(modal, false);

    function onClosed() {
      resetModal(modal);
    }

    if (window.FridoOverlay) {
      FridoOverlay.close(modal, {
        bodyClass: BODY_CLASS,
        keepBodyClassIf: '.frido-size-quiz.is-open, .frido-size-quiz.is-closing',
        onClosed: onClosed,
      });
    } else {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('hidden', '');
      document.body.classList.remove(BODY_CLASS);
      onClosed();
    }
  }

  function findModalForButton(btn) {
    var sectionId = btn.getAttribute('data-frido-size-quiz-section');
    if (sectionId) return document.getElementById('frido-size-quiz-' + sectionId);
    return qs('[data-frido-size-quiz]');
  }

  function init() {
    qsa('[data-frido-size-quiz]').forEach(bindModal);
  }

  document.addEventListener('click', function (e) {
    var openBtn = e.target.closest('[data-frido-size-quiz-open]');
    if (openBtn) {
      e.preventDefault();
      var modal = findModalForButton(openBtn);
      openModal(modal);
      return;
    }

    var closeBtn = e.target.closest('[data-frido-size-quiz-close]');
    if (closeBtn) {
      var m = closeBtn.closest('[data-frido-size-quiz]');
      if (m) closeModal(m);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    qsa('.frido-size-quiz.is-open').forEach(closeModal);
  });

  window.FridoSizeQuiz = { open: openModal, close: closeModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();
