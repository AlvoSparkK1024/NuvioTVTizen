window.__NUVIO_PLATFORM__ = "tizen";

var tvInput = window.tizen && window.tizen.tvinputdevice;
if (tvInput && typeof tvInput.registerKey === "function") {
  ["MediaPlay", "MediaPause", "MediaPlayPause", "MediaFastForward", "MediaRewind"].forEach(function registerKey(keyName) {
    try {
      tvInput.registerKey(keyName);
    } catch (_) {}
  });
}

function loadScript(src) {
  var script = document.createElement("script");
  script.src = src;
  script.defer = false;
  document.body.appendChild(script);
}

window.__NUVIO_TIZEN_BOOTSTRAP_APP__ = function bootstrapApp() {
  if (window.__NUVIO_TIZEN_APP_BOOTSTRAPPED__) return;
  window.__NUVIO_TIZEN_APP_BOOTSTRAPPED__ = true;
  loadScript("assets/libs/qrcode-generator.js");
  loadScript("app.bundle.js");
};

loadScript("nuvio.env.js");
