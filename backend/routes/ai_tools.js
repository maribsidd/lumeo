const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// NOTEBOOK CHAT
router.post('/notebook', async (req, res) => {
  const { messages, context } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages required' });
  try {
    const resp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', max_tokens: 800,
      messages: [
        { role: 'system', content: `You are a video content analyst. Answer questions about this video specifically.\n\nContext:\n${context}\n\nBe specific, reference actual content, suggest improvements, extract insights.` },
        ...messages
      ]
    });
    res.json({ content: [{ type: 'text', text: resp.choices[0].message.content }] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// HOOK WRITER
router.post('/studio/hooks', async (req, res) => {
  const { topic, platform } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  try {
    const resp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', max_tokens: 1024, temperature: 0.9,
      messages: [{ role: 'user', content:
        `Write 5 viral opening hooks for a ${platform} video about: "${topic}"\n\nReturn ONLY JSON array (no markdown):\n[{"type":"Curiosity Gap","text":"hook"},{"type":"Shock/Surprise","text":"hook"},{"type":"Authority","text":"hook"},{"type":"Story","text":"hook"},{"type":"Statistical","text":"hook"}]\n\nRules: 1-2 sentences each, platform-native tone, makes viewer NEED to watch. Bold and specific. No generic openers.`
      }]
    });
    let text = resp.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    const match = text.match(/\[[\s\S]*\]/); if(match) text=match[0];
    res.json({ hooks: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// TITLE GENERATOR
router.post('/studio/titles', async (req, res) => {
  const { topic, style } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  try {
    const resp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', max_tokens: 1024, temperature: 0.85,
      messages: [{ role: 'user', content:
        `Generate 8 YouTube title options for: "${topic}"\nStyle: ${style}\n\nReturn ONLY JSON array (no markdown):\n[{"style":"Curiosity Gap","text":"title","score":85},...]\n\nRules: under 60 chars each, specific not vague, use proven formats (numbers, how I, why, the truth, brackets), score 0-100 predicted CTR. Make them genuinely compelling.`
      }]
    });
    let text = resp.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    const match = text.match(/\[[\s\S]*\]/); if(match) text=match[0];
    res.json({ titles: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// IMPROVE CAPTION (editor)
router.post('/improve', async (req, res) => {
  const { title, caption, platform } = req.body;
  if (!caption) return res.status(400).json({ error: 'caption required' });
  try {
    const resp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', max_tokens: 512, temperature: 0.8,
      messages: [{ role: 'user', content:
        `Improve this ${platform} clip for maximum engagement.\nTitle: "${title}"\nCaption: "${caption}"\nReturn ONLY JSON (no markdown): {"title":"improved title max 10 words","caption":"improved 2-3 sentence native tone caption","hashtags":"8 trending hashtags"}`
      }]
    });
    let text = resp.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    res.json(JSON.parse(text));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// THUMBNAIL PROMPT GENERATOR — returns AI prompt + Pollinations URL
// Frontend generates the thumbnail directly, no server timeout issue
router.post('/thumbnail/prompt', async (req, res) => {
  const { title, transcript, styleOverride } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const { pickStyle, STYLES } = require('./thumbnail');
  const styleKey = styleOverride || pickStyle(transcript || title, title);
  const style = STYLES[styleKey];

  const prompt = [
    `YouTube thumbnail ${style.name} style,`,
    `video about: "${title.substring(0,60)}",`,
    style.subject + ',',
    style.bg + ',',
    style.style + ',',
    `colors: ${style.colors},`,
    `photorealistic 4K cinematic NO TEXT no words no letters no watermarks`,
  ].join(' ');

  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&nologo=true&enhance=true&model=flux`;

  res.json({ url, styleKey, styleName: style.name, prompt, seed });
});

// CAPTION GENERATOR — for existing short clips
router.post('/studio/captions', async (req, res) => {
  const { description, platform, niche } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  try {
    const resp = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile', max_tokens: 1500, temperature: 0.85,
      messages: [{ role: 'user', content:
        `You are a viral content strategist. Generate captions for this short video clip.

Platform: ${platform}
Niche: ${niche}
Clip description: "${description}"

Return ONLY JSON (no markdown):
{
  "titles": [
    {"style":"Curiosity Gap","text":"title max 60 chars","score":88},
    {"style":"How-To","text":"title max 60 chars","score":82},
    {"style":"Emotional","text":"title max 60 chars","score":85},
    {"style":"Number","text":"title max 60 chars","score":80}
  ],
  "captions": [
    {"platform":"${platform}","text":"ready-to-post caption 2-3 sentences native tone strong hook CTA at end"},
    {"platform":"Instagram Story","text":"shorter punchier version for story"},
    {"platform":"Twitter/X","text":"under 280 chars punchy version"}
  ],
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8","#tag9","#tag10","#tag11","#tag12","#tag13","#tag14","#tag15","#tag16","#tag17","#tag18","#tag19","#tag20"]
}`
      }]
    });
    let text = resp.choices[0].message.content.trim().replace(/```json|```/g,'').trim();
    const match = text.match(/\{[\s\S]*\}/); if(match) text=match[0];
    res.json(JSON.parse(text));
  } catch (err) { res.status(500).json({ error: err.message }); }
});