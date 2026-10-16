/*!
 * Formchat widget loader
 * Usage (paste before </body> on any website):
 *   <script src="https://YOUR-APP/widget.js" data-form="FORM_SLUG" async></script>
 * Optional attributes:
 *   data-position="left"   launcher on the bottom-left instead of bottom-right
 *   data-color="#e11d48"   override the launcher color (defaults to the form's color)
 *   data-open              open the chat automatically on page load
 * JavaScript API: window.Formchat.open(), .close(), .toggle()
 *
 * The chat itself runs inside an iframe (/embed/FORM_SLUG), so the host page's
 * CSS can't break it and it can't break the host page.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var slug = script.getAttribute("data-form");
  if (!slug) {
    console.warn("[Formchat] Missing data-form attribute on the widget script tag.");
    return;
  }

  // Guard against the snippet being pasted twice.
  window.__formchatLoaded = window.__formchatLoaded || {};
  if (window.__formchatLoaded[slug]) return;
  window.__formchatLoaded[slug] = true;

  var origin = new URL(script.src, location.href).origin;
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var colorOverride = script.getAttribute("data-color");
  var openOnLoad = script.hasAttribute("data-open");
  var Z = 2147483000;
  var MOBILE = "(max-width: 640px)";

  var CHAT_ICON =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var CLOSE_ICON =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function css(el, styles) {
    for (var k in styles) el.style.setProperty(k, styles[k]);
  }

  function readableText(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
    var rgb = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var l = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#ffffff" : "#18181b";
  }

  function mount() {
    var isOpen = false;
    var iframe = null;
    var mq = window.matchMedia(MOBILE);
    var prevOverflow = "";

    // Launcher button
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("data-formchat-launcher", slug);
    launcher.innerHTML = CHAT_ICON;
    var color = colorOverride || "#a96325";
    css(launcher, {
      position: "fixed",
      bottom: "20px",
      [side]: "20px",
      width: "60px",
      height: "60px",
      padding: "0",
      margin: "0",
      border: "0",
      "border-radius": "50%",
      background: color,
      color: readableText(color),
      cursor: "pointer",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      "box-shadow": "0 6px 20px rgba(0,0,0,.22)",
      "z-index": String(Z + 1),
      transition: "transform .2s ease, opacity .2s ease",
    });
    launcher.addEventListener("mouseenter", function () {
      launcher.style.transform = "scale(1.06)";
    });
    launcher.addEventListener("mouseleave", function () {
      launcher.style.transform = "scale(1)";
    });

    // Panel that holds the iframe
    var panel = document.createElement("div");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat");
    panel.setAttribute("data-formchat-panel", slug);

    function layout() {
      var mobile = mq.matches;
      css(panel, {
        position: "fixed",
        "z-index": String(Z),
        overflow: "hidden",
        background: "#ffffff",
        "box-shadow": mobile ? "none" : "0 12px 40px rgba(0,0,0,.25)",
        "border-radius": mobile ? "0" : "16px",
        top: mobile ? "0" : "auto",
        bottom: mobile ? "0" : "92px",
        left: mobile ? "0" : side === "left" ? "20px" : "auto",
        right: mobile ? "0" : side === "right" ? "20px" : "auto",
        width: mobile ? "100%" : "380px",
        height: mobile ? "100%" : "min(600px, calc(100vh - 120px))",
        transition: "opacity .2s ease, transform .2s ease",
        opacity: isOpen ? "1" : "0",
        transform: isOpen ? "translateY(0)" : "translateY(12px)",
        visibility: isOpen ? "visible" : "hidden",
        "pointer-events": isOpen ? "auto" : "none",
      });
      // On phones the chat is full screen with its own close button; hide the launcher.
      launcher.style.display = isOpen && mobile ? "none" : "flex";
      document.documentElement.style.overflow = isOpen && mobile ? "hidden" : prevOverflow;
    }

    function ensureIframe() {
      if (iframe) return;
      iframe = document.createElement("iframe");
      iframe.src = origin + "/embed/" + encodeURIComponent(slug);
      iframe.title = "Chat form";
      iframe.setAttribute("allow", "clipboard-write");
      css(iframe, { width: "100%", height: "100%", border: "0", display: "block" });
      panel.appendChild(iframe);
    }

    function open() {
      if (isOpen) return;
      prevOverflow = document.documentElement.style.overflow;
      ensureIframe(); // lazy: the host page stays fast until someone opens the chat
      isOpen = true;
      launcher.innerHTML = CLOSE_ICON;
      launcher.setAttribute("aria-label", "Close chat");
      launcher.setAttribute("aria-expanded", "true");
      layout();
      setTimeout(function () {
        if (iframe) iframe.focus();
      }, 50);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      launcher.innerHTML = CHAT_ICON;
      launcher.setAttribute("aria-label", "Open chat");
      launcher.setAttribute("aria-expanded", "false");
      layout();
      launcher.focus();
    }

    function toggle() {
      if (isOpen) close();
      else open();
    }

    launcher.addEventListener("click", toggle);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) close();
    });
    window.addEventListener("message", function (e) {
      if (e.origin !== origin || !iframe || e.source !== iframe.contentWindow) return;
      if (e.data && e.data.type === "formchat:close") close();
    });
    if (mq.addEventListener) mq.addEventListener("change", layout);

    layout();
    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    // Use the form's own color/title; hide the widget if the form isn't published.
    fetch(origin + "/api/forms/" + encodeURIComponent(slug) + "/config")
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (config) {
        if (!config) {
          console.warn("[Formchat] Form \"" + slug + "\" is not published — hiding the widget.");
          launcher.remove();
          panel.remove();
          return;
        }
        if (!colorOverride && config.primaryColor) {
          launcher.style.background = config.primaryColor;
          launcher.style.color = readableText(config.primaryColor);
        }
        if (config.title) launcher.title = config.title;
      })
      .catch(function () {
        /* offline or blocked: keep the default launcher */
      });

    window.Formchat = { open: open, close: close, toggle: toggle };
    if (openOnLoad) open();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
