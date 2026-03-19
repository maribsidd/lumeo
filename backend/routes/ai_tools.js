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
