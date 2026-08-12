/*!
 * NiCE Designer — site-wide access gate behavior
 * -------------------------------------------------------------
 * Pairs with the #nice-site-gate markup + site-gate.css present on
 * every page. Unlocking persists for the browser session (same
 * mechanism as the roadmap's own page-level gate), so visitors only
 * enter the code once per visit across the whole site.
 *
 * NOTE: this is a soft deterrent, not real security — the password
 * check runs client-side and is visible in this file's source.
 */
(function () {
  var SESSION_KEY = 'nice-site-access';
  var PASSWORD = 'niceux';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var gate = document.getElementById('nice-site-gate');
    if (!gate) return;

    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      gate.style.display = 'none';
      return;
    }

    var input = document.getElementById('nice-site-gate-input');
    var btn = document.getElementById('nice-site-gate-btn');
    var errEl = document.getElementById('nice-site-gate-error');

    function checkCode() {
      var val = input.value.trim().toLowerCase();
      if (val === PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        gate.classList.add('unlocked');
        setTimeout(function () { gate.style.display = 'none'; }, 420);
      } else {
        input.classList.add('error');
        errEl.textContent = 'Incorrect code. Contact Erick Mathews on Teams for access.';
        setTimeout(function () { input.classList.remove('error'); }, 400);
        input.value = '';
      }
    }

    btn.addEventListener('click', checkCode);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') checkCode();
    });
  });
})();
