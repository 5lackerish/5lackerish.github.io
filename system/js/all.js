(() => {
  "use strict";

  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const safeStr = (v) => (v == null ? "" : String(v));

  const ready = () =>
    document.readyState === "loading"
      ? new Promise((r) =>
          document.addEventListener("DOMContentLoaded", r, { once: true })
        )
      : Promise.resolve();

  const $ = (sel) => {
    try {
      if (!sel) return null;
      if (/^[A-Za-z0-9\-_]+$/.test(sel)) return document.getElementById(sel);
      return document.querySelector(sel);
    } catch {
      return null;
    }
  };

  const dom = {};
  const state = {
    assetsData: [],
    assetsReady: false
  };

  const config = {
    fallbackImage:
      "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/404_blank.png",
    sheetUrl:
      "https://script.google.com/macros/s/AKfycbzw69RTChLXyis4xY9o5sUHtPU32zaMeKaR2iEliyWBsJFvVbTbMvbLNfsB4rO4gLLzTQ/exec"
  };

  function initElements() {
    dom.container = $("#container");
    dom.preloader = $("#preloader");
    dom.progressBar = $("#progressBar");
    dom.counter = $("#counter");
    dom.pageIndicator = $(".page-indicator") || $("#page-indicator");
  }

  function initFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      window.favorites = new Set(stored.map((s) => safeStr(s).toLowerCase()));
    } catch {
      window.favorites = new Set();
    }

    window.refreshCards = () => {
      if (!state.assetsReady || !dom.container) return [];
      createAssetCards(state.assetsData);
      if (typeof renderPage === "function") renderPage();
    };
  }

  function initLoader(total) {
    if (!dom.preloader || !dom.progressBar || !dom.counter) return () => {};
    let loaded = 0;

    return () => {
      loaded++;
      const percent = clamp(Math.floor((loaded / total) * 100));
      dom.progressBar.style.width = percent + "%";
      dom.counter.textContent = percent + "%";
      if (loaded >= total) {
        dom.progressBar.style.width = "100%";
        dom.counter.textContent = "100%";
        setTimeout(() => dom.preloader.classList.add("hidden"), 400);
      }
    };
  }

  function createAssetCards(data) {
    if (!dom.container) return [];
    dom.container.innerHTML = "";
    const frag = document.createDocumentFragment();
    const promises = [];

    for (const asset of data) {
      const img = document.createElement("img");
      img.className = "asset-img";
      img.alt = asset.title || "";

      const p = new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => {
          img.src = asset.image || config.fallbackImage;
          resolve();
        };
        probe.onerror = () => {
          img.src = config.fallbackImage;
          resolve();
        };
        probe.src = asset.image || config.fallbackImage;
      });

      promises.push(p);
      frag.appendChild(img);
    }

    dom.container.appendChild(frag);
    return promises;
  }

  async function loadAssets() {
    const res = await fetch(config.sheetUrl, { cache: "no-store" });
    const raw = await res.json();

    state.assetsData = raw.filter((i) =>
      Object.values(i).some((v) => safeStr(v).trim())
    );

    const imagePromises = createAssetCards(state.assetsData);

    if (imagePromises.length === 0) {
      if (dom.preloader) dom.preloader.classList.add("hidden");
      state.assetsReady = true;
      if (typeof renderPage === "function") renderPage();
      if (typeof goToPage === "function") goToPage(1);
      return;
    }

    const updateProgress = initLoader(imagePromises.length);

    for (const p of imagePromises) {
      await p;
      updateProgress();
    }

    state.assetsReady = true;

    if (typeof renderPage === "function") renderPage();
    if (typeof goToPage === "function") goToPage(1);
  }

  document.addEventListener("sortModeChanged", () => {
    if (state.assetsReady && typeof window.refreshCards === "function") {
      window.refreshCards();
    }
  });

  (async () => {
    await ready();
    initElements();
    initFavorites();
    if (typeof initPaging === "function") initPaging();
    if (typeof initPlaceholders === "function") initPlaceholders();
    if (typeof initUpdatePopup === "function") await initUpdatePopup();
    await loadAssets();
    if (typeof initQuotes === "function") await initQuotes();
  })();
})();
