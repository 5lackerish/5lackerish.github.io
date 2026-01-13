/* ==========================================================
   WannaSmile | Unified JS Loader & UI Logic (FIXED)
   ========================================================== */
(() => {
  "use strict";

  /* ---------------------------
     Utilities
  --------------------------- */
  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const safeStr = (v) => (v == null ? "" : String(v));

  /* ---------------------------
     Preloader
  --------------------------- */
  const Preloader = (() => {
    let total = 1;
    let loaded = 0;
    let root, bar, counter;

    const init = () => {
      root = document.getElementById("preloader");
      bar = document.getElementById("progressBar");
      counter = document.getElementById("counter");
      update();
    };

    const setTotal = (n) => {
      total = Math.max(1, n);
      update();
    };

    const tick = () => {
      loaded++;
      update();
    };

    const update = () => {
      const pct = clamp(Math.round((loaded / total) * 100));
      if (bar) bar.style.width = pct + "%";
      if (counter) counter.textContent = pct + "%";
    };

    const finish = () => {
      if (!root) return;
      setTimeout(() => {
        root.classList.add("hidden");
        setTimeout(() => (root.style.display = "none"), 600);
      }, 300);
    };

    return { init, setTotal, tick, finish };
  })();

  /* ---------------------------
     Sort Mode
  --------------------------- */
  const getSortMode = () => localStorage.getItem("sortMode") || "sheet";

  document.addEventListener("sortModeChanged", () => {
    if (window.assetsData && typeof window.refreshCards === "function") {
      window.refreshCards();
    }
  });

  /* ---------------------------
     DOM & Config
  --------------------------- */
  function initElements() {
    const $ = (sel) => {
      try {
        if (!sel) return null;
        if (/^[A-Za-z0-9\-_]+$/.test(sel)) return document.getElementById(sel);
        return document.querySelector(sel);
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
    };

    window.config = {
      fallbackImage:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/404_blank.png",
      fallbackLink:
        "https://01110010-00110101.github.io./source/dino/",
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

  /* ---------------------------
     Favorites
  --------------------------- */
  function initFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      window.favorites = new Set(stored.map((s) => safeStr(s).toLowerCase()));
    } catch {
      window.favorites = new Set();
    }

    window.saveFavorites = () => {
      localStorage.setItem(
        "favorites",
        JSON.stringify([...window.favorites])
      );
    };

    window.refreshCards = () => {
      if (!window.assetsData) return [];
      const promises = createAssetCards(window.assetsData);
      if (typeof window.renderPage === "function") window.renderPage();
      if (typeof window.startPlaceholderCycle === "function")
        window.startPlaceholderCycle();
      return promises;
    };
  }

  /* ---------------------------
     Asset Cards
  --------------------------- */
  function createAssetCards(data) {
    const container = window.dom?.container;
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

    const badgeMap = {
      featured:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/featured-cover.png",
      new:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/new-cover.png",
      fixed:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/fixed-cover.png",
      fix:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/fixing.png",
    };

    for (const asset of sorted) {
      const title = safeStr(asset.title).trim();
      const author = safeStr(asset.author).trim();
      const imageSrc = safeStr(asset.image) || config.fallbackImage;
      const link = safeStr(asset.link) || config.fallbackLink;
      const pageNum = Number(asset.page) || 1;
      const status = safeStr(asset.status).toLowerCase();
      const statusField = safeStr(asset.type || asset.status || "").toLowerCase();

      const card = document.createElement("div");
      card.className = "asset-card";
      card.dataset.title = title.toLowerCase();
      card.dataset.author = author.toLowerCase();
      card.dataset.page = String(pageNum);
      card.dataset.filtered = "true";

      const a = document.createElement("a");
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "asset-link";

      const wrapper = document.createElement("div");
      wrapper.className = "asset-img-wrapper";

      const img = document.createElement("img");
      img.alt = title;
      img.loading = "eager";
      img.className = "asset-img";

      const imgPromise = new Promise((resolve) => {
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

      imagePromises.push(imgPromise);
      wrapper.appendChild(img);

      const addOverlay = (src, alt, cls, full = false) => {
        const o = document.createElement("img");
        o.src = src;
        o.alt = alt;
        o.className = `status-overlay ${cls}`;
        o.style.zIndex = full ? "10" : "5";
        wrapper.appendChild(o);
      };

      if (statusField === "featured")
        addOverlay(badgeMap.featured, "featured", "overlay-featured");
      if (statusField === "new")
        addOverlay(badgeMap.new, "new", "overlay-new");
      if (statusField === "fixed")
        addOverlay(badgeMap.fixed, "fixed", "overlay-fixed");
      if (["new", "updated"].includes(status))
        addOverlay(`${config.gifBase}${status}.gif`, status, `status-${status}`);
      if (status === "fix") {
        addOverlay(badgeMap.fix, "fix", "overlay-fix", true);
        card.classList.add("fix");
      }
      if (status === "soon") card.classList.add("soon");

      a.appendChild(wrapper);

      const titleEl = document.createElement("h3");
      titleEl.textContent = title || "Untitled";

      const authorEl = document.createElement("p");
      authorEl.textContent = author;

      const star = document.createElement("button");
      star.className = "favorite-star";
      star.textContent = isFav(title) ? "★" : "☆";
      star.onclick = (e) => {
        e.preventDefault();
        const key = title.toLowerCase();
        window.favorites.has(key)
          ? window.favorites.delete(key)
          : window.favorites.add(key);
        window.saveFavorites();
        star.textContent = window.favorites.has(key) ? "★" : "☆";
      };

      card.append(a, titleEl, authorEl, star);
      frag.appendChild(card);
    }

    container.appendChild(frag);
    return imagePromises;
  }

  /* ---------------------------
     Load Assets
  --------------------------- */
  async function loadAssets() {
    Preloader.setTotal(1);

    let raw = [];
    try {
      const res = await fetch(config.sheetUrl, { cache: "no-store" });
      raw = await res.json();
    } catch {
      raw = [];
    }

    Preloader.tick();

    const data = raw.filter((i) =>
      Object.values(i).some((v) => safeStr(v).trim())
    );

    window.assetsData = data;

    const isFavPage = location.pathname
      .toLowerCase()
      .includes("favorites.html");

    const filtered = isFavPage
      ? data.filter((a) =>
          window.favorites.has(safeStr(a.title).toLowerCase())
        )
      : data;

    const imagePromises = createAssetCards(filtered);
    Preloader.setTotal(imagePromises.length + 1);

    for (const p of imagePromises) {
      await p;
      Preloader.tick();
    }

    if (typeof window.renderPage === "function") window.renderPage();
    Preloader.tick();
  }

  /* ---------------------------
     Boot
  --------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    Preloader.init();
    initElements();
    initFavorites();

    if (typeof window.initPaging === "function") window.initPaging();
    if (typeof window.initPlaceholders === "function")
      window.initPlaceholders();
    if (typeof window.initUpdatePopup === "function")
      await window.initUpdatePopup();

    await loadAssets();

    if (typeof window.initQuotes === "function") await window.initQuotes();

    Preloader.finish();
    console.log("✅ WannaSmile Ready");
  });
})();
