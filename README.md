# Titus Study

Verse-by-verse commentary study of Titus with the complete KJV text, historical introduction, and word studies.

```bash
npm install
npm run dev
npm run deploy:check   # validate content, theology, humanization, types, lint, and build
```

Deploys to `https://titus.mybibleexplorer.com` through GitHub Pages on every push to `main` (see `.github/workflows/deploy-pages.yml`). One-time setup: create the GitHub repository, set Pages to "GitHub Actions", add the custom domain, and add a DNS CNAME record `titus` → `samirtharaj7-creator.github.io`.
