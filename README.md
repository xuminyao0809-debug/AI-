# AI 建筑设计资讯 PWA

一个每日更新的 PWA 看板，用于追踪 AI 与建筑设计、AEC、BIM、生成式设计相关资讯。

## 本地预览

```bash
node scripts/serve.mjs
```

打开 `http://localhost:4173`。

## 更新资讯

```bash
node scripts/update-news.mjs
```

## GitHub Pages

项目包含两个 GitHub Actions 工作流：

- `.github/workflows/deploy-pages.yml`：推送到 `main` 后自动部署网站。
- `.github/workflows/daily-news.yml`：每天自动抓取公开资讯源并提交更新。

第一次部署后，在仓库的 `Settings > Pages` 中确认来源选择为 `GitHub Actions`。
