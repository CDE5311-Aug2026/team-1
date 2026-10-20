/* IntentAI → EARTH ONLINE bridge (added by scripts/sync-earth-online.mjs; not part of the original page).
   ?card=<landmark key>  opens that landmark's intro card and flies closer (keys from the EARTH ONLINE dataset).
   ?at=<lat>,<lng>       places without a 3D landmark model: marks the point on the page's 2D big map and flies there.
   Read-only: it never writes storage and sends nothing anywhere. */
(function () {
  var q = new URLSearchParams(location.search);
  var card = q.get('card');
  var at = q.get('at');
  if (card && !/^[A-Za-z0-9_:\- ]{1,80}$/.test(card)) card = null;
  var point = null;
  if (at) {
    var p = at.split(',').map(Number);
    if (p.length === 2 && isFinite(p[0]) && isFinite(p[1]) && Math.abs(p[0] - 1.315) < 0.3 && Math.abs(p[1] - 103.845) < 0.3) point = p;
  }
  if (!card && !point) return;
  var LON0 = 103.845, LAT0 = 1.315, MX = 111290.5, MY = 110574.0;
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var C = window.SGCard;
    var ready = C && C.stats && C.stats().landmarks > 0;
    if (!ready && tries < 240) return;
    clearInterval(timer);
    if (!ready) return;
    try {
      if (card && C.open(card)) {
        setTimeout(function () {
          var b = Array.prototype.find.call(document.querySelectorAll('button'), function (el) { return /Fly closer/.test(el.textContent || ''); });
          if (b) b.click();
        }, 700);
        return;
      }
      if (point && window.SGNav) {
        var x = (point[1] - LON0) * MX, y = (point[0] - LAT0) * MY;
        window.SGNav.setDest(x, y, {});
        window.SGNav.open({});
        // "Fly here" in the big map's destination bar moves the 3D camera to the point.
        setTimeout(function () {
          var b = Array.prototype.find.call(document.querySelectorAll('button'), function (el) { return /Fly here/.test(el.textContent || ''); });
          if (b) b.click();
        }, 900);
      }
    } catch (e) { /* the 3D page keeps working without the focus */ }
  }, 500);
})();
