# Lumeo

> AI-powered video content automation platform.  
> Upload any long-form video — get viral short clips, captions, and hashtags instantly.

---

## What It Does

**Upload** a video or paste a URL → **Transcribe** with Groq Whisper → **Analyse** with LLaMA 3.3 70B → **Generate** ready-to-post short clips with captions and hashtags. Zero manual editing.

---

## Features

- **AI Transcription** — Groq whisper-large-v3-turbo, fastest transcription available
- **Clip Generator** — LLaMA 3.3 70B finds hooks, insights, and high-engagement moments
- **Platform Targeting** — optimised captions for Instagram Reels, YouTube Shorts, TikTok, LinkedIn
- **Caption Editor** — edit titles, captions, hashtags with one-click AI improvement
- **Platform Preview** — see exactly how clips will look before exporting

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML · CSS · Vanilla JS |
| Backend | Node.js · Express · Multer |
| Transcription | Groq Whisper (whisper-large-v3-turbo) |
| Clip Analysis | Groq LLaMA (llama-3.3-70b-versatile) |
| Deployment | GitHub Pages + Render |

---

## Structure

```
lumeo/
├── login.html        Onboarding
├── index.html        Dashboard
├── upload.html       Video upload + processing
├── clips.html        Generated clips viewer
├── editor.html       Caption editor
├── nav.js            Shared auth + profile dropdown
├── favicon.svg
├── start.bat         One-click Windows startup
└── backend/
    ├── server.js
    ├── package.json
    ├── .env.example
    └── routes/
        ├── transcribe.js   Groq Whisper
        ├── generate.js     LLaMA clip generation
        └── improve.js      AI caption improvement
```

---

## Local Setup

```bash
git clone https://github.com/maribsidd/lumeo.git
cd lumeo/backend
cp .env.example .env
# Add your GROQ_API_KEY to .env
npm install
node server.js
```

Open `login.html` with Live Server. Backend on `http://localhost:3001`.

Or double-click `start.bat` on Windows.

---

## Environment Variables

```
GROQ_API_KEY=your_groq_key_here
PORT=3001
```

Free key at [console.groq.com](https://console.groq.com).

---

*Built by Marib — github.com/maribsidd*
