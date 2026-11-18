# Ibrahim Rifai: Portfolio

A bilingual (English and Arabic) portfolio. The page is static. Two small serverless routes power the
assistant chat and the job fit check, and they call Claude from the server, so your API key is never
exposed to visitors.

```
public/
  index.html        the whole page (HTML, CSS, JS in one file)
  favicon.svg
  robots.txt
api/
  chat.js           POST /api/chat  assistant answers from the résumé facts
  fit.js            POST /api/fit   job description in, honest match out
lib/
  resume.js         the résumé facts and rules sent to Claude (server side only)
  anthropic.js      small Messages API client, no SDK
  guard.js          origin check, rate limit, input cleaning
dev.mjs             local server (no Vercel CLI needed)
vercel.json         output folder, function timeout, security headers
.env.example        environment variables
```

No dependencies and no build step.

## Deploy to Vercel

You need an Anthropic API key from https://console.anthropic.com.

**Option A: from GitHub (recommended)**

1. Create a GitHub repository and push this folder to it.
2. In Vercel choose Add New > Project and import the repository.
3. Framework Preset: **Other**. Leave Build Command empty. Output Directory is read from `vercel.json`.
4. Under Environment Variables add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`).
5. Deploy. Later pushes to the main branch redeploy automatically.

**Option B: Vercel CLI**

```bash
npm i -g vercel
vercel            # first run links the project, answer the prompts
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

A custom domain needs no extra setting. The page and `/api` share the same host, and the origin check
allows the site's own host automatically.

## Run locally

```bash
cp .env.example .env      # then put your key in .env
npm run dev               # http://localhost:3000
```

Without a key the page still works. The assistant and the fit check show a "not available" message.
`dev.mjs` applies the same security headers as `vercel.json`, so a blocked script or font shows up in
the browser console before you deploy.

## What to know before going public

- **Cost.** Every question costs API usage billed to your key. Set a monthly spend limit in the Anthropic
  console. The default model is `claude-haiku-5-5`; change `ANTHROPIC_MODEL` if you prefer another one.
- **Abuse.** `lib/guard.js` limits each visitor to 20 chat messages and 6 fit checks per 10 minutes,
  rejects other origins, and caps message length. The counter lives in memory, so each warm function
  instance counts separately. It slows casual abuse but is not a hard limit. For a hard limit, add a
  rate-limiting rule in Vercel Firewall for `/api/*`.
- **Accuracy.** The assistant is told to answer only from the résumé facts and to say when it does not
  know. It can still be wrong, and the page tells visitors that.
- **Privacy.** Visitor questions and pasted job descriptions are sent to Anthropic to produce the answer.
  They are not stored by this project.

## Updating the content

- Page text, projects, skills and links: edit `public/index.html`. English and Arabic live side by side
  in `<span class="en">` and `<span class="ar">` pairs.
- Résumé facts used by the assistant: edit `RESUME_MD` in `lib/resume.js`. The download button uses a copy
  of the same text inside `public/index.html` (search for `var RESUME_MD`), so change both.
- Project demo links are Google Drive links taken from the résumé. KADSTAR has no demo link yet.

## Not included

- A social preview image. Add `public/og.png` (1200 x 630) and an `og:image` meta tag in `index.html`.
- Analytics. Enable Vercel Web Analytics from the dashboard if you want it.
