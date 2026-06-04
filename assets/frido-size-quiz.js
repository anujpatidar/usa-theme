(function () {
  var BODY_CLASS = 'frido-size-quiz-open';
  var TOTAL_STEPS = 7;

  var BRANDS_POPULAR = [
    { id: 'nike', label: 'Nike', logo: '✓' },
    { id: 'adidas', label: 'Adidas', logo: '◆' },
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
    { id: 'tight', emoji: '😖', title: 'Too tight', desc: 'My toes feel cramped' },
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
    { id: 'extra_room', emoji: '😌', title: 'Extra space (barefoot feel)', desc: 'Maximum toe freedom' },
  ];

  var CONDITION_OPTIONS = [
    { id: 'bunions', title: 'Bunions', desc: 'Bony bump at big toe joint' },
    { id: 'neuropathy', title: 'Neuropathy', desc: 'Nerve pain or numbness' },
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
    { id: 'gym', emoji: '🏋️', title: 'Gym/Training', desc: 'Workouts and training' },
    { id: 'running', emoji: '🏃', title: 'Running', desc: 'Road or treadmill runs' },
  ];

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
    var proceed = qs('[data-frido-size-quiz-proceed]', modal);
    var body = qs('[data-frido-size-quiz-body]', modal);

    if (progress) renderProgress(progress, state.step);
    if (eta) eta.textContent = etaText(state.step);
    if (back) back.hidden = state.step <= 1;
    if (proceed) {
      proceed.hidden = state.step !== 6;
      proceed.disabled = state.footConditions.length === 0;
    }
    if (body) renderStep(body, state);
  }

  function buildPayload(state, config) {
    return {
      brand: brandLabel(state.brand),
      genderCategory: state.genderCategory,
      brandSize: state.brandSize,
      fitFeeling: state.fitFeeling,
      footWidth: state.footWidth,
      toeRoomPreference: state.toeRoomPreference,
      footConditions: state.footConditions.filter(function (c) {
        return c !== 'none';
      }),
      activity: state.activity,
      availableSizes: config.availableSizes || [],
      productTitle: config.productTitle || '',
    };
  }

  function renderResult(inner, data, state) {
    var size = data.displaySize || data.recommendedSize || '—';
    var confidence = data.confidence != null ? data.confidence : 87;
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

    inner.innerHTML =
      '<div class="fsq-result__badge"><span class="fsq-result__badge-icon" aria-hidden="true">🏅</span></div>' +
      '<h3 class="fsq-result__title">Your Perfect Fit Found!</h3>' +
      '<p class="fsq-result__sub">Based on your unique foot profile</p>' +
      '<div class="fsq-result__card">' +
      '<p class="fsq-result__label">We recommend</p>' +
      '<div class="fsq-result__size-row">' +
      '<span class="fsq-result__size">' +
      size +
      '</span>' +
      '<span class="fsq-result__eu">US Size</span>' +
      '</div>' +
      '<div class="fsq-result__confidence"><span aria-hidden="true">↗</span> ' +
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
      (data.reasoning
        ? '<p class="fsq-result__reasoning">' + data.reasoning + '</p>'
        : '') +
      '<button type="button" class="fsq-result__cta" data-fsq-select-size="' +
      (data.recommendedSize || size).replace(/"/g, '&quot;') +
      '">✓ Select Size ' +
      size +
      ' ›</button>';

    var cta = qs('[data-fsq-select-size]', inner);
    if (cta) {
      cta.addEventListener('click', function () {
        selectSizeOnPdp(cta.getAttribute('data-fsq-select-size'));
        closeModal(modal);
      });
    }
  }

  function selectSizeOnPdp(sizeLabel) {
    if (!sizeLabel) return;
    var pdp = document.querySelector('[data-frido-pdp]');
    if (!pdp) return;
    var sel = '[data-frido-option-value="' + sizeLabel.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]';
    var btn = pdp.querySelector(sel);
    if (btn) {
      btn.click();
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    if (inner) renderResult(inner, data, state);
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
            throw new Error(
              'Size service unavailable. Install the Size Quiz app proxy or try again later.'
            );
          }
          if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
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
        alert('We could not get a size recommendation. Please try again or pick a size manually.');
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

    qs('[data-frido-size-quiz-proceed]', modal).addEventListener('click', function () {
      if (ctx.state.step === 6 && ctx.state.footConditions.length) goNext(modal, ctx);
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
