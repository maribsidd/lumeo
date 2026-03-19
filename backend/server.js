const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use('/outputs', express.static(path.join(__dirname, 'outputs')));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const out = path.join(__dirname, 'outputs');
      require('fs').mkdirSync(out, { recursive: true });
      cb(null, out);
    },
    filename: (req, file, cb) => cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024 }
});

app.use('/api/process', require('./routes/process')(upload));
app.use('/api', require('./routes/ai_tools')); // handles /api/improve, /api/notebook, /api/studio/*

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'login.html')));

app.listen(PORT, () => {
  console.log(`\n  Lumeo backend running on http://localhost:${PORT}`);
  console.log(`  Routes: /api/process  /api/improve  /api/notebook  /api/studio/hooks  /api/studio/titles\n`);
});
