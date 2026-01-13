(() => {
  "use strict";

  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const safeStr = (v) => (v == null ? "" : String(v));
  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
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
      preloader: $("#preloader"),
      progressBar: $("#progressBar"),
      counter: $("#counter"),
    };

    window.config = {
      fallbackImage:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/404_blank.png",
      fallbackLink: "https://01110010-00110101.github.io./source/dino/",
      gifBase:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/GIF/",
      sheetUrl:
        "https://script.google.com/macros/s/AKfycbzw69RTChLXyis4xY9o5sUHtPU32zaMeKaR2iEliyWBsJFvVbTbMvbLNfsB4rO4gLLzTQ/exec",
      updateTrailerSrc: "",
      updateLink: "system/pages/version-log.html",
      quotesJson:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/json/quotes.json",
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

  function createAssetCards(data) {
    const { container } = dom || {};
    if (!container) return [];

    container.innerHTML = "";
    const imagePromises = [];
    const frag = document.createDocumentFragment();
    const sortMode = getSortMode();
    const isFav = (t) => window.favorites.has(safeStr(t).toLowerCase());

    let sorted = Array.isArray(data) ? [...data] : [];
    if (sortMode === "alphabetical") {
      sorted.sort((a, b) =>
        safeStr(a.title).localeCompare(safeStr(b.title), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }

    for (const asset of sorted) {
      const title = safeStr(asset.title).trim();
      const imageSrc = safeStr(asset.image) || config.fallbackImage;

      const card = document.createElement("div");
      card.className = "asset-card";
      card.dataset.page = asset.page || 1;
      card.dataset.filtered = "true";
      card.dataset.title = title.toLowerCase();

      const img = document.createElement("img");
      img.className = "asset-img";
      img.alt = title;

      const promise = new Promise((resolve) => {
        const tmp = new Image();
        tmp.onload = () => {
          img.src = imageSrc;
          resolve();
        };
        tmp.onerror = () => {
          img.src = config.fallbackImage;
          resolve();
        };
        tmp.src = imageSrc;
      });

      imagePromises.push(promise);
      card.appendChild(img);
      frag.appendChild(card);
    }

    container.appendChild(frag);
    return imagePromises;
  }

  function initLoadingScreen(total) {
    const { preloader, progressBar, counter } = dom;
    if (!preloader || !progressBar) return () => {};

    let loaded = 0;

    return () => {
      loaded++;
      const percent = Math.floor((loaded / total) * 100);
      progressBar.style.width = percent + "%";
      if (counter) counter.textContent = percent + "%";

      if (loaded >= total) {
        progressBar.style.width = "100%";
        if (counter) counter.textContent = "100%";
        setTimeout(() => preloader.classList.add("hidden"), 300);
      }
    };
  }

  async function loadAssets() {
    const res = await fetch(config.sheetUrl, { cache: "no-store" });
    const raw = await res.json();
    const data = raw.filter((i) =>
      Object.values(i).some((v) => safeStr(v).trim())
    );

    window.assetsData = data;

    const isFavPage = location.pathname.toLowerCase().includes("favorites.html");
    const filtered = isFavPage
      ? data.filter((a) =>
          window.favorites.has(safeStr(a.title).toLowerCase())
        )
      : data;

    const imagePromises = createAssetCards(filtered || []);
    const updateProgress = initLoadingScreen(imagePromises.length || 1);

    for (const p of imagePromises) {
      await p;
      updateProgress();
    }

    if (typeof renderPage === "function") renderPage();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initElements();
    initFavorites();
    initPaging();
    initPlaceholders();
    await initUpdatePopup();
    await loadAssets();
    if (typeof initQuotes === "function") await initQuotes();
  });
})();
