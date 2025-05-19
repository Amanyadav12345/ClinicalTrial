require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// app.use(express.static('../frontend'));

const genAI = new GoogleGenerativeAI("AIzaSyCBeq0n40QiiCJ1nyATynYwpTasKm_rMPs");
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
console.log("Loaded API Key:", process.env.GEMINI_API_KEY);

// Historic context prompt
const contextPrompt = `
We are a biopharma firm with experience in numerous drug trials. 
Our goal is to help other companies optimize their clinical trial designs 
using our history and expertise.
`;

app.post('/submit-trial', async (req, res) => {
  const { disease, phase, region, endpoints, duration } = req.body;

  db.run(
    `INSERT INTO trials (disease, phase, region, endpoints, duration) VALUES (?, ?, ?, ?, ?)`,
    [disease, phase, region, endpoints, duration],
    async function (err) {
      if (err) return res.status(500).send("DB error");

      const userPrompt = `
      You are an expert clinical trial assistant.
      
      Based on the following parameters:
      - Disease: ${disease}
      - Phase: ${phase}
      - Region: ${region}
      - Endpoints: ${endpoints}
      - Duration: ${duration}
      
      Perform these tasks:
      
      1. Simulate trial outcomes for 3 design variations (low budget, standard, accelerated).
      2. Predict recruitment challenges and dropout risks based on trial phase and region.
      3. Recommend optimized endpoints using prior trial data and explain why.
      4. Auto-generate a clinical trial protocol draft.
      5. Include a visual timeline table (in HTML table format).
      6. Output everything in clean HTML using <h2>, <ul>, <table>, <p> etc., without <html> or <body> tags.
      7. Do not wrap the response in \`\`\`html\`\`\`.
      
      Ensure content is semantically structured and easy to extract from HTML.
      `;

      try {
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: contextPrompt + '\n' + userPrompt }]
            }
          ]
        });

        const response = result.response.text();
        res.json({ id: this.lastID, message: response });
      } catch (e) {
        console.error('Gemini API error:', e);
        res.status(500).send("AI generation failed");
      }
    }
  );
});
const path = require('path');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});