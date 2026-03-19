const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { pickStyle, STYLES } = require('./thumbnail');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OUT = path.join(__dirname, '..', 'outputs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function getDuration(fp) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(fp, (err, meta) => err ? reject(err) : resolve(meta.format.duration || 0));
  });
}

function cutClip(src, dest, start, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(src)
      .setStartTime(start).setDuration(duration)
      .outputOptions(['-c:v libx264','-c:a aac','-preset fast','-crf 28','-movflags faststart'])
      .output(dest)
      .on('end', resolve).on('error', reject).run();
  });
}

module.exports = function(upload) {
  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const srcPath = req.file.path;
    const jobId = Date.now();
    const settings = JSON.parse(req.body.settings || '{}');
    const { clipLen = 45, clipCount = 5, platform = 'Instagram Reels' } = settings;
    console.log(`\n[Lumeo] Job ${jobId} — ${req.file.originalname}`);

    try {
      // Duration
      let duration = 0;
      try { duration = await getDuration(srcPath); } catch(e) { duration = 300; }
      console.log(`[Lumeo] Duration: ${Math.round(duration)}s`);

      // Transcribe
      let transcript = '';
      console.log('[Lumeo] Transcribing with Groq Whisper...');
      try {
        const resp = await client.audio.transcriptions.create({
          file: fs.createReadStream(srcPath),
          model: 'whisper-large-v3-turbo',
          response_format: 'verbose_json',
        });
        transcript = resp.text || '';
        console.log(`[Lumeo] Transcript ready: ${transcript.substring(0,60)}...`);
      } catch(e) {
        console.error('[Lumeo] Transcription error:', e.message);
        transcript = `Video: ${req.file.originalname}. Duration: ${Math.round(duration)}s.`;
      }

      // Pick thumbnail style
      const overallStyle = pickStyle(transcript, req.file.originalname);
      console.log(`[Lumeo] Thumbnail style: ${STYLES[overallStyle].name}`);

      // AI clip analysis
      let clips = [];
      console.log('[Lumeo] AI analysing with LLaMA...');
      try {
        const aiResp = await client.chat.completions.create({
          model: 'llama-3.3-70b-versatile', max_tokens: 2048, temperature: 0.7,
          messages: [{ role: 'user', content:
            `You are a viral content strategist for ${platform}.\nVideo: "${req.file.originalname}"\nDuration: ${Math.round(duration)}s\nTranscript: "${transcript.substring(0,3000)}"\n\nFind ${clipCount} best viral moments. Return ONLY JSON array:\n[{"id":1,"title":"compelling hook title 6-10 words","start":integer_seconds,"caption":"ready-to-post caption 2-3 sentences plus CTA","hashtags":"#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6","hook":true,"score":75,"thumbnail_text":"3-5 word bold overlay text","emotion":"shock"}]\nstart must be 0 to ${Math.max(0,Math.round(duration-clipLen))}. Spread across video. No markdown.`
          }]
        });
        let text = aiResp.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
        const match = text.match(/\[[\s\S]*\]/); if(match) text=match[0];
        clips = JSON.parse(text);
        console.log(`[Lumeo] AI found ${clips.length} clips`);
      } catch(e) {
        console.error('[Lumeo] AI error:', e.message);
        const gap = Math.max(30, Math.floor((duration - clipLen) / clipCount));
        clips = Array.from({length:clipCount}, (_,i) => ({
          id:i+1, title:`Key moment ${i+1}`, start:i*gap,
          caption:`Must-see moment from this video. Watch till the end!`,
          hashtags:'#Shorts #ViralVideo #ContentCreator #FYP #Trending #MustWatch',
          hook:i===0, score:70+Math.floor(Math.random()*22),
          thumbnail_text:`Must Watch`, emotion:'curiosity'
        }));
      }

      // Cut clips + AI thumbnails
      const results = [];
      for (const clip of clips) {
        const start = Math.max(0, Math.min(parseInt(clip.start)||0, Math.floor(duration-clipLen)));
        const clipFile = `clip_${jobId}_${clip.id}.mp4`;
        const clipPath = path.join(OUT, clipFile);
        let clipUrl = null;

        try {
          await cutClip(srcPath, clipPath, start, parseInt(clipLen));
          if(fs.existsSync(clipPath)) { clipUrl = `/outputs/${clipFile}`; console.log(`[Lumeo] Clip ${clip.id} cut OK`); }
        } catch(e) { console.error(`[Lumeo] Clip ${clip.id} cut error:`, e.message); }

        results.push({...clip, start, end:start+parseInt(clipLen), clipUrl, thumbUrl:null, thumbnailStyle:STYLES[overallStyle].name, thumbnailStyleKey:overallStyle, thumbnail_text:clip.thumbnail_text||clip.title});
      }

      try { fs.unlinkSync(srcPath); } catch(e) {}
      console.log(`[Lumeo] Job ${jobId} complete — ${results.length} clips\n`);

      res.json({ jobId, videoName:req.file.originalname, duration:Math.round(duration), transcript:transcript.substring(0,800), overallStyle:STYLES[overallStyle].name, clips:results });

    } catch(err) {
      console.error('[Lumeo] Fatal:', err.message);
      try { fs.unlinkSync(srcPath); } catch(e) {}
      res.status(500).json({ error: err.message });
    }
  });
  return router;
};