const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ffmpeg = require('fluent-ffmpeg');

const OUT = path.join(__dirname, '..', 'outputs');

const STYLES = {
  spectacle: {
    name: 'Spectacle & Scale',
    keywords: ['challenge','win','million','extreme','insane','survive','beat','last','biggest','giant','money','viral'],
    bg: 'hyper-saturated epic cinematic background, dramatic lighting, massive scale environment, crowd or landscape',
    subject: 'hero person center frame, wide open eyes, open mouth shock expression, exaggerated emotion, arms spread wide',
    style: 'ultra-sharp foreground with cinematic depth of field blur background, 3D layer stacking, Hollywood blockbuster poster',
    colors: 'electric yellow, vivid red, bright orange, neon accents, high contrast',
    text_style: 'BOLD IMPACT font, massive size, bright yellow with thick black stroke outline',
  },
  authority: {
    name: 'Authority & Truth',
    keywords: ['secret','truth','interview','ceo','founder','business','strategy','success','revealed','insider','exclusive'],
    bg: 'high contrast dark studio background, chiaroscuro lighting, professional setup, clean dark backdrop',
    subject: 'close-up face with direct intense eye contact, skin texture enhanced, eyes bright and sharp, confident expression',
    style: 'cinematic portrait lighting, dramatic shadows, sharp facial details, broadcast journalism aesthetic',
    colors: 'deep charcoal, warm amber highlights, crisp white accents, single strong accent color',
    text_style: 'clean minimal 2-4 words maximum, high contrast white on dark, premium sans-serif',
  },
  transformation: {
    name: 'Transformation',
    keywords: ['before','after','transform','change','improve','growth','lost','gained','days','results','progress','glow up'],
    bg: 'split screen composition, left side muted desaturated problem state, right side bright vibrant solution state',
    subject: 'clear visual comparison between two states, arrow or divider between problem and solution',
    style: 'vignette darker filter on left before side, bright clean lighting on after right side, visual payoff',
    colors: 'muted greys and blues on left, vibrant greens and warm tones on right, strong contrast',
    text_style: 'bold action words, before and after labels, transformation arrow graphic',
  },
  curiosity: {
    name: 'Curiosity Gap',
    keywords: ['vs','versus','compare','cheap','expensive','best','worst','test','which','better','fake','real','exposed'],
    bg: 'neutral flat solid color background, clean minimal setup, spotlight focus on subjects',
    subject: 'two distinct objects or faces side by side with bold VS text or thick red arrow between them',
    style: 'ultra high saturation on main subjects, completely clean neutral background, pop art product photography',
    colors: 'vivid saturated subject colors, flat neutral background, bold red for VS or arrow element',
    text_style: 'VS in massive bold red or yellow, subject names in clean heavy sans-serif',
  },
  minimal: {
    name: 'Intellectual Minimal',
    keywords: ['how to','learn','productivity','book','read','study','focus','habit','routine','skill','tips','guide'],
    bg: 'massive negative space, warm light beige or off-white editorial magazine background, premium literary feel',
    subject: 'high quality candid natural photography, relaxed authentic pose, soft natural window lighting',
    style: 'editorial photography, literary magazine cover aesthetic, generous whitespace, premium intellectual feel',
    colors: 'warm beige cream, muted earth tones, single subtle accent color, no harsh contrasts',
    text_style: 'elegant serif or geometric sans-serif, editorial headline style, minimal text',
  },
  statistical: {
    name: 'Statistical Shock',
    keywords: ['percent','million','billion','data','analysis','facts','numbers','statistics','study','report','ranked','top'],
    bg: 'bold graphic dark background with data visualization elements, graphs or numbers as design elements',
    subject: 'single shocking statistic or number dominating 60% of frame, typographic hierarchy as hero',
    style: 'graphic design aesthetic, bold typography as main visual element, infographic energy',
    colors: 'green for growth, red for danger, yellow for urgency — chosen based on content sentiment',
    text_style: 'massive number or stat front and center, supporting text smaller below, strong numerical urgency',
  },
};

function pickStyle(transcript, title) {
  const text = (transcript + ' ' + title).toLowerCase();
  let best = 'minimal', bestScore = 0;
  for (const [key, style] of Object.entries(STYLES)) {
    const score = style.keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return best;
}

function buildPrompt(styleKey, title, transcript) {
  const s = STYLES[styleKey];
  return [
    `YouTube thumbnail, ${s.name} style,`,
    `video topic: "${title.substring(0,55)}",`,
    s.subject + ',',
    s.bg + ',',
    s.style + ',',
    `colors: ${s.colors},`,
    `photorealistic 4K, sharp, professional photography,`,
    `dramatic lighting, high contrast, visually striking composition,`,
    `NO TEXT no words no letters no watermarks no logos,`,
    `hyperdetailed ultra high resolution cinematic`,
  ].join(' ');
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const req = proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { file.close(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    });
    req.on('error', (e) => { try { fs.unlinkSync(destPath); } catch(_){} reject(e); });
    req.setTimeout(35000, () => { req.destroy(); reject(new Error('Image download timeout')); });
  });
}

function addTextOverlay(imgPath, outPath, title, styleKey) {
  const configs = {
    spectacle:      { color: 'yellow',  border: 'black', size: 50, y: 'h-155', stroke: 7 },
    authority:      { color: 'white',   border: 'black', size: 42, y: 'h-120', stroke: 3 },
    transformation: { color: 'white',   border: 'black', size: 44, y: 'h-130', stroke: 4 },
    curiosity:      { color: 'white',   border: 'red',   size: 46, y: 'h-140', stroke: 5 },
    minimal:        { color: 'black',   border: 'white', size: 36, y: 'h-100', stroke: 2 },
    statistical:    { color: 'yellow',  border: 'black', size: 54, y: 'h-165', stroke: 7 },
  };
  const tc = configs[styleKey] || configs.minimal;
  const short = title.length > 38 ? title.substring(0, 35) + '...' : title;
  const escaped = short.replace(/[':]/g, '').replace(/[[\]]/g, '');

  return new Promise((resolve) => {
    ffmpeg(imgPath)
      .videoFilters([
        `drawbox=x=0:y=ih-185:w=iw:h=185:color=black@0.52:t=fill`,
        `drawtext=text='${escaped}':fontsize=${tc.size}:fontcolor=${tc.color}:bordercolor=${tc.border}:borderw=${tc.stroke}:x=(w-text_w)/2:y=${tc.y}`,
      ])
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', () => {
        // Fallback: no text, just the AI image
        try { fs.copyFileSync(imgPath, outPath); } catch(_) {}
        resolve(outPath);
      })
      .run();
  });
}

async function generateThumbnail(jobId, clipId, title, transcript) {
  const styleKey = pickStyle(transcript, title);
  const prompt = buildPrompt(styleKey, title, transcript);
  const encoded = encodeURIComponent(prompt);
  const seed = (jobId + clipId * 7) % 99999;
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&seed=${seed}&nologo=true&enhance=true&model=flux`;

  const rawPath = path.join(OUT, `thumb_raw_${jobId}_${clipId}.jpg`);
  const finalPath = path.join(OUT, `thumb_${jobId}_${clipId}.jpg`);

  try {
    await downloadImage(imageUrl, rawPath);
    await addTextOverlay(rawPath, finalPath, title, styleKey);
    try { fs.unlinkSync(rawPath); } catch(_) {}
    return { thumbUrl: `/outputs/thumb_${jobId}_${clipId}.jpg`, styleUsed: STYLES[styleKey].name, styleKey };
  } catch (e) {
    console.error(`[Lumeo] Thumb ${clipId} error: ${e.message}`);
    if (fs.existsSync(rawPath)) {
      try { fs.copyFileSync(rawPath, finalPath); fs.unlinkSync(rawPath); } catch(_) {}
      return { thumbUrl: `/outputs/thumb_${jobId}_${clipId}.jpg`, styleUsed: STYLES[styleKey].name, styleKey };
    }
    return { thumbUrl: null, styleUsed: STYLES[styleKey].name, styleKey };
  }
}

module.exports = { generateThumbnail, pickStyle, STYLES };
