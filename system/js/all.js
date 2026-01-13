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
      preloader: $("#preloader"),
      progressBar: $("#progressBar"),
      counter: $("#counter"),
    };

    window.config = {
      fallbackImage:
        "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/404_blank.png",
      sheetUrl:
        "https://script.google.com/macros/s/AKfycbzw69RTChLXyis4xY9o5sUHtPU32zaMeKaR2iEliyWBsJFvVbTbMvbLNfsB4rO4gLLzTQ/exec",
    };
  }

  function initFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      window.favorites = new Set(stored.map((s) => safeStr(s).toLowerCase()));
    } catch {
      window.favorites = new Set();
    }

    window.refreshCards = () => {
      if (!window.assetsData) return [];
      const promises = createAssetCards(window.assetsData);
      if (typeof renderPage === "function") renderPage();
      return promises;
    };
  }

  function createAssetCards(data) {
    const { container } = dom || {};
    if (!container) return [];

    container.innerHTML = "";
    const imagePromises = [];
    const frag = document.createDocumentFragment();

    for (const asset of data) {
      const img = document.createElement("img");
      img.className = "asset-img";
      img.alt = asset.title || "";

      const p = new Promise((resolve) => {
        const tmp = new Image();
        tmp.onload = () => {
          img.src = asset.image || config.fallbackImage;
          resolve();
        };
        tmp.onerror = () => {
          img.src = config.fallbackImage;
          resolve();
        };
        tmp.src = asset.image || config.fallbackImage;
      });

      imagePromises.push(p);
      frag.appendChild(img);
    }

    container.appendChild(frag);
    return imagePromises;
  }

  function initLoadingScreen(total) {
    const { preloader, progressBar, counter } = dom;
    let loaded = 0;

    return () => {
      loaded++;
      const percent = Math.floor((loaded / total) * 100);
      progressBar.style.width = percent + "%";
      counter.textContent = percent + "%";

      if (loaded >= total) {
        progressBar.style.width = "100%";
        counter.textContent = "100%";
        setTimeout(() => preloader.classList.add("hidden"), 400);
      }
    };
  }

  async function loadingScrollAnimation() {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    for (let i = 0; i < 2; i++) {
      window.scrollTo({ top: maxScroll, behavior: "smooth" });
      await delay(600);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await delay(600);
    }
  }

  async function loadingPageCycle() {
    if (typeof nextPage !== "function" || typeof prevPage !== "function") return;
    for (let i = 1; i <= 10; i++) {
      nextPage();
      await delay(350);
    }
    for (let i = 10; i > 1; i--) {
      prevPage();
      await delay(200);
    }
  }

  function prerenderPages() {
    if (!("supports" in HTMLScriptElement)) return;

    const script = document.createElement("script");
    script.type = "speculationrules";
    script.textContent = JSON.stringify({
      prerender: [
        { source: "list", urls: ["index.html", "favorites.html", "discovery.html"] }
      ]
    });
    document.head.appendChild(script);
  }

  async function loadAssets() {
    let data = [];
    let imagePromises = [];
    let updateProgress;

    try {
      const res = await fetch(config.sheetUrl, { cache: "no-store" });
      const raw = await res.json();
      data = raw.filter((i) => Object.values(i).some((v) => safeStr(v).trim()));
      window.assetsData = data;

      imagePromises = createAssetCards(data || []);
      updateProgress = initLoadingScreen(imagePromises.length || 1);

      prerenderPages();
      loadingScrollAnimation();
      loadingPageCycle();

      for (const p of imagePromises) {
        await p;
        updateProgress();
      }

      if (typeof renderPage === "function") renderPage();
    } catch (e) {
      console.error("Asset loading failed:", e);
    } finally {
      if (updateProgress) {
        updateProgress();
      } else if (dom && dom.preloader) {
        dom.preloader.classList.add("hidden");
      }

      if (typeof goToPage === "function") {
        goToPage(1);
      } else if (typeof nextPage === "function" && typeof prevPage === "function") {
        while (currentPage && currentPage > 1) {
          prevPage();
        }
      }
    }
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
