const categories = ["全部", "生成式设计", "BIM / AEC", "工具", "案例", "研究"];

const state = {
  news: [],
  category: "全部",
  query: ""
};

const els = {
  todayDate: document.querySelector("#todayDate"),
  newsCount: document.querySelector("#newsCount"),
  lastUpdated: document.querySelector("#lastUpdated"),
  categoryTabs: document.querySelector("#categoryTabs"),
  searchInput: document.querySelector("#searchInput"),
  leadGrid: document.querySelector("#leadGrid"),
  newsList: document.querySelector("#newsList"),
  emptyState: document.querySelector("#emptyState"),
  refreshButton: document.querySelector("#refreshButton"),
  installButton: document.querySelector("#installButton")
};

let deferredInstallPrompt;

init();

async function init() {
  renderDate();
  renderTabs();
  bindEvents();
  await loadNews();
  registerServiceWorker();
}

function renderDate() {
  els.todayDate.textContent = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "full"
  }).format(new Date());
}

function renderTabs() {
  els.categoryTabs.innerHTML = categories
    .map(
      (category) => `
        <button class="tab" type="button" data-category="${category}" aria-selected="${category === state.category}">
          ${category}
        </button>
      `
    )
    .join("");
}

function bindEvents() {
  els.categoryTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-category]");
    if (!tab) return;
    state.category = tab.dataset.category;
    renderTabs();
    renderNews();
  });

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderNews();
  });

  els.refreshButton.addEventListener("click", loadNews);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });
}

async function loadNews() {
  els.refreshButton.disabled = true;
  els.refreshButton.textContent = "读取中";
  try {
    const response = await fetch(`data/news.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error("Unable to load news data.");
    const payload = await response.json();
    state.news = payload.items.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    els.lastUpdated.textContent = `更新于 ${formatDateTime(payload.updatedAt)}`;
    els.newsCount.textContent = state.news.length;
    renderNews();
  } catch (error) {
    els.lastUpdated.textContent = "暂时无法读取资讯";
    console.error(error);
  } finally {
    els.refreshButton.disabled = false;
    els.refreshButton.textContent = "刷新";
  }
}

function renderNews() {
  const filtered = state.news.filter((item) => {
    const inCategory = state.category === "全部" || item.category === state.category;
    const haystack = `${item.title} ${item.summary} ${item.source} ${item.tags.join(" ")}`.toLowerCase();
    return inCategory && (!state.query || haystack.includes(state.query));
  });

  const leads = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  els.leadGrid.innerHTML = leads.map(renderLeadCard).join("");
  els.newsList.innerHTML = rest.map(renderNewsItem).join("");
  els.emptyState.hidden = filtered.length > 0;
}

function renderLeadCard(item) {
  return `
    <a class="lead-card" href="${item.url}" target="_blank" rel="noopener noreferrer">
      <article>
        <div class="source-row">
          <span>${item.source}</span>
          <time datetime="${item.publishedAt}">${formatDate(item.publishedAt)}</time>
        </div>
        <div>
          <span class="tag">${item.category}</span>
          <h3>${item.title}</h3>
        </div>
        <p>${item.summary}</p>
      </article>
    </a>
  `;
}

function renderNewsItem(item) {
  return `
    <article class="news-item">
      <div class="source-row">
        <span>${item.source}</span>
        <time datetime="${item.publishedAt}">${formatDate(item.publishedAt)}</time>
      </div>
      <a href="${item.url}" target="_blank" rel="noopener noreferrer">
        <span class="tag">${item.category}</span>
        <h3>${item.title}</h3>
        <p>${item.summary}</p>
      </a>
      <a class="open-link" href="${item.url}" target="_blank" rel="noopener noreferrer">阅读</a>
    </article>
  `;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}
