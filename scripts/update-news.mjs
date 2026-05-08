import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const feeds = [
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=(AI%20OR%20%22artificial%20intelligence%22)%20architecture%20design%20when%3A14d&hl=en-US&gl=US&ceid=US%3Aen"
  },
  {
    name: "ArchDaily",
    url: "https://feeds.feedburner.com/Archdaily"
  },
  {
    name: "AEC Magazine",
    url: "https://aecmag.com/?format=feed&id=featured&type=rss"
  },
  {
    name: "Autodesk News",
    url: "https://adsknews.autodesk.com/en/feed/"
  }
];

const include = [
  "ai",
  "artificial intelligence",
  "generative",
  "machine learning",
  "architecture",
  "architect",
  "building",
  "bim",
  "aec",
  "design automation",
  "computational design",
  "digital twin"
];

const categories = [
  { name: "生成式设计", terms: ["generative", "computational", "parametric"] },
  { name: "BIM / AEC", terms: ["bim", "aec", "digital twin", "construction"] },
  { name: "工具", terms: ["tool", "software", "platform", "autodesk", "revit"] },
  { name: "案例", terms: ["project", "building", "studio", "firm"] }
];

const collected = [];

for (const feed of feeds) {
  try {
    const response = await fetch(feed.url, {
      headers: { "user-agent": "AI Architecture News PWA/1.0" }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const xml = await response.text();
    collected.push(...parseRss(xml, feed.name));
  } catch (error) {
    console.warn(`Skipped ${feed.name}: ${error.message}`);
  }
}

const seen = new Set();
const items = collected
  .filter(isRelevant)
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .filter((item) => {
    const key = normalize(item.url || item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, 36)
  .map((item) => ({
    id: createHash("sha1").update(item.url || item.title).digest("hex").slice(0, 12),
    title: item.title,
    summary: item.summary,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    category: detectCategory(item),
    tags: detectTags(item)
  }));

const payload = {
  updatedAt: new Date().toISOString(),
  items
};

await writeFile("data/news.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${items.length} news items.`);

function parseRss(xml, fallbackSource) {
  const entries = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return entries.map((entry) => {
    const item = entry[0];
    const title = clean(readTag(item, "title"));
    const summary = trimSummary(clean(readTag(item, "description") || readTag(item, "content:encoded")));
    const url = clean(readTag(item, "link")) || clean(readTag(item, "guid"));
    const publishedAt = toIso(readTag(item, "pubDate") || readTag(item, "dc:date"));
    const source = clean(readTag(item, "source")) || fallbackSource;
    return { title, summary, url, publishedAt, source };
  });
}

function readTag(source, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = source.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decode(match[1]) : "";
}

function decode(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(value) {
  return decode(value || "").trim();
}

function trimSummary(value) {
  if (!value) return "这条资讯与 AI、建筑设计或 AEC 工作流相关，建议打开原文查看完整背景。";
  return value.length > 142 ? `${value.slice(0, 140)}...` : value;
}

function toIso(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isRelevant(item) {
  const text = normalize(`${item.title} ${item.summary}`);
  const hasAi = ["ai", "artificial intelligence", "generative", "machine learning"].some((term) =>
    text.includes(term)
  );
  const hasArchitecture = ["architecture", "architect", "building", "bim", "aec", "construction", "design"].some(
    (term) => text.includes(term)
  );
  return hasAi && hasArchitecture && include.some((term) => text.includes(term));
}

function detectCategory(item) {
  const text = normalize(`${item.title} ${item.summary}`);
  return categories.find((category) => category.terms.some((term) => text.includes(term)))?.name || "研究";
}

function detectTags(item) {
  const text = normalize(`${item.title} ${item.summary}`);
  return include.filter((term) => text.includes(term)).slice(0, 4);
}

function normalize(value) {
  return String(value || "").toLowerCase();
}
