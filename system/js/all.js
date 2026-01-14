/* ==========================================================
   WannaSmile | Unified JS Loader & UI Logic
   ========================================================== */
(() => {
  "use strict";

  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const safeStr = (v) => (v == null ? "" : String(v));
  const rafAsync = () => new Promise((r) => requestAnimationFrame(r));
  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const LOADING_BASE = "../system/images/loading/";
  const THEME_BASE = "../system/theme/";

  const LOADING_SCREENS = [
    "pg67.png",
    "vo8xmas.png",
    "v078xmasfixed.png",
    "retro01.png",
    "retro02.png"
  ];

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const getTheme = () =>
    document.body.getAttribute("theme") || "classic";

  const getLoadingBackground = () => {
    const theme = getTheme();
    const themed = `${THEME_BASE}${theme}/${theme}/loading/`;
    return {
      themed: themed + pickRandom(LOADING_SCREENS),
      fallback: LOADING_BASE + pickRandom(LOADING_SCREENS)
    };
  };

  const getSortMode = () => localStorage.getItem("sortMode") || "sheet";

  document.addEventListener("sortModeChanged", () => {
    if (window.assetsData && typeof window.refreshCards === "function") {
      window.refreshCards();
    }
  });

  function initElements() {
    const $ = (sel) => {
      try {
        if (!sel) return null;
        if (/^[A-Za-z0-9\-_]+$/.test(sel)) return document.getElementById(sel);
        return document.querySelector(sel) || null;
      } catch {
        return null;
      }
    };

    window.dom = {
      container: $("#container"),
      preloader: $("#preloader"),
      loaderImage: $("#loaderImage"),
      loadedImage: $("#loadedImage"),
      pageIndicator: $(".page-indicator") || $("#page-indicator"),
      searchInput: $("#searchInputHeader"),
      searchBtn: $("#searchBtnHeader"),
      updatePopup: $("#updatePopup"),
      updatePopupContent: $(".update-popup-content"),
      viewUpdateBtn: $("#viewUpdateBtn"),
      viewUpdateInfoBtn: $("#viewUpdateInfoBtn"),
      closeUpdateBtn: $("#closeUpdateBtn"),
      dontShowBtn: $("#dontShowBtn"),
      updateVideo: $("#updateVideo"),
    };

    window.config = {
      fallbackImage:
        "https://raw.githubusercontent.com/mcmattyobriore/mcmattyobriore.github.io/main/system/images/404_blank.png",
      fallbackLink: "https://mcmattyobriore.github.io./source/dino/",
      gifBase:
        "https://raw.githubusercontent.com/mcmattyobriore/mcmattyobriore.github.io/main/system/images/GIF/",
      sheetUrl:
        "https://script.google.com/macros/s/AKfycbzw69RTChLXyis4xY9o5sUHtPU32zaMeKaR2iEliyWBsJFvVbTbMvbLNfsB4rO4gLLzTQ/exec",
      updateTrailerSrc: "",
      updateLink: "system/pages/version-log.html",
      quotesJson:
        "https://raw.githubusercontent.com/mcmattyobriore/mcmattyobriore.github.io/main/system/json/quotes.json",
    };
  }

  function initFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      window.favorites = new Set(stored.map((s) => safeStr(s).toLowerCase()));
    } catch {
      window.favorites = new Set();
    }

    window.saveFavorites = () =>
      localStorage.setItem("favorites", JSON.stringify([...window.favorites]));

    window.refreshCards = () => {
      if (!window.assetsData || typeof createAssetCards !== "function") return [];
      const promises = createAssetCards(window.assetsData);
      if (typeof renderPage === "function") renderPage();
      if (typeof startPlaceholderCycle === "function") startPlaceholderCycle();
      return promises;
    };
  }

  function initPreloader() {
    const { preloader } = dom || {};
    if (!preloader) return;

    const theme = getTheme();
    const bg = getLoadingBackground();
    const gifLayer = document.getElementById("loader-gif");

    if (gifLayer) {
      const img = new Image();
      img.onload = () =>
        (gifLayer.style.backgroundImage = `url("${bg.themed}")`);
      img.onerror = () =>
        (gifLayer.style.backgroundImage = `url("${bg.fallback}")`);
      img.src = bg.themed;
      gifLayer.style.backgroundSize = "cover";
      gifLayer.style.backgroundPosition = "center";
      gifLayer.style.backgroundRepeat = "no-repeat";
    }

    preloader.style.display = "flex";
    preloader.style.opacity = "1";
    preloader.style.pointerEvents = "all";
    preloader.dataset.hidden = "false";

    let counter = preloader.querySelector("#counter");
    let bar = preloader.querySelector(".load-progress-bar");
    let fill = preloader.querySelector(".load-progress-fill");

    dom.loaderText = counter;
    dom.progressBarFill = fill;

    window.updateProgress = (p) => {
      const c = clamp(Math.round(p), 0, 100);
      counter.textContent = `${c}%`;
      fill.style.width = `${c}%`;
    };

    window.showLoading = (t) => {
      counter.textContent = t;
    };

    window.hidePreloader = () => {
      if (preloader.dataset.hidden === "true") return;
      preloader.dataset.hidden = "true";
      preloader.style.opacity = "0";
      preloader.style.pointerEvents = "none";
      setTimeout(() => (preloader.style.display = "none"), 500);
    };

    window.showLoadedState = async (d = 1000) => {
      await delay(d);
    };
  }

  async function loadAssets(retry = false) {
    try {
      showLoading("Loading assets...");
      let currentProgress = 0;

      const setProgress = (t) =>
        new Promise((r) => {
          const step = () => {
            currentProgress += (t - currentProgress) * 0.08;
            if (Math.abs(t - currentProgress) < 0.5) {
              currentProgress = t;
              updateProgress(currentProgress);
              r();
            } else {
              updateProgress(currentProgress);
              requestAnimationFrame(step);
            }
          };
          step();
        });

      await setProgress(5);

      const res = await fetch(config.sheetUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);

      const raw = await res.json();
      const data = raw.filter((i) =>
        Object.values(i).some((v) => safeStr(v).trim())
      );

      window.assetsData = data;
      await setProgress(20);

      const isFavPage = location.pathname.includes("favorites.html");
      const filtered = isFavPage
        ? data.filter((a) =>
            window.favorites.has(safeStr(a.title).toLowerCase())
          )
        : data;

      const promises = createAssetCards(filtered || []);
      await Promise.all(promises.map((p) => p.promise));

      await setProgress(90);
      renderPage?.();
      await setProgress(100);
      await delay(150);
      await showLoadedState(1000);
      hidePreloader();
    } catch (e) {
      if (!retry) return setTimeout(() => loadAssets(true), 1000);
      showLoading("⚠ Failed to load assets.");
      hidePreloader();
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      initElements();
      initFavorites();
      initPreloader();
      initPaging();
      initPlaceholders();
      await initUpdatePopup();
      await loadAssets();
      if (typeof initQuotes === "function") await initQuotes();
    } catch {
      showLoading("Initialization failed.");
      hidePreloader();
    }
  });
})();
