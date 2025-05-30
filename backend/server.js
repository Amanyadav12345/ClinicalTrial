require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database");
const path = require("path");
const { Parser } = require("json2csv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

const genAI = new GoogleGenerativeAI("AIzaSyCBeq0n40QiiCJ1nyATynYwpTasKm_rMPs");
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

console.log("Loaded API Key:", process.env.GEMINI_API_KEY);

// Historic context prompt
const contextPrompt = `
We are a biopharma firm with experience in numerous drug trials. 
Our goal is to help other companies optimize their clinical trial designs 
using our history and expertise.
`;

// 🔁 Submit trial + get AI recommendation + save response
app.post("/submit-trial", async (req, res) => {
  const { disease, phase, region, endpoints, duration } = req.body;

  try {
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

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: contextPrompt + "\n" + userPrompt }] }],
    });

    const response = result.response.text();

    db.run(
      `INSERT INTO trials (disease, phase, region, endpoints, duration, ai_output) VALUES (?, ?, ?, ?, ?, ?)`,
      [disease, phase, region, endpoints, duration, response],
      function (err) {
        if (err) return res.status(500).send("DB error");
        res.json({ id: this.lastID, message: response });
      }
    );
  } catch (e) {
    console.error("Gemini API error:", e);
    res.status(500).send("AI generation failed");
  }
});

// 🔍 Fetch single trial by ID
app.get("/history/:id", (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM trials WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Failed to fetch trial" });
    res.json(row);
  });
});

// 📜 Fetch all trials
app.get("/history", (req, res) => {
  db.all(`SELECT * FROM trials ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch history" });
    res.json(rows);
  });
});

// 📤 Export trials as CSV
app.get("/export", (req, res) => {
  db.all(`SELECT * FROM trials`, [], (err, rows) => {
    if (err) return res.status(500).send("Export failed");

    const fields = ["id", "disease", "phase", "region", "endpoints", "duration", "created_at"];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(rows);

    res.setHeader("Content-disposition", "attachment; filename=clinical_trials.csv");
    res.set("Content-Type", "text/csv");
    res.status(200).send(csv);
  });
});

// 🧠 Health Analysis AI (unchanged)
app.post("/analyze-health", async (req, res) => {
  const { name, heartRates, steps, sleep, stress } = req.body;

  const prompt = `
You are a digital health expert reviewing personal wearable data.
Give a brief, clear health insight report for this patient: ${name}.

Vital Signs:
- Average heart rate: ${average(heartRates)} bpm
- Total steps: ${sum(steps)} steps
- Average sleep: ${average(sleep)} hours
- Average stress score: ${average(stress)} / 10

Tasks:
1. Identify any risk or abnormality.
2. Suggest lifestyle improvements or warnings.
3. Be concise and avoid medical jargon.
4. Output clean HTML paragraphs only (no code blocks).
5. make pointers in response for better readability.
6. this analysis is seen by doctors not patients.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const response = result.response.text();
    res.json({ insight: response });
  } catch (error) {
    console.error("Health analysis failed:", error);
    res.status(500).json({ insight: "Failed to generate health summary." });
  }
});


const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/analyze-compliance-docs', upload.array('docs'), async (req, res) => {
  const fileSummaries = req.files.map(file => file.originalname).join(', ');

  // Call AI service or heuristic analysis
  const feedback = `Uploaded files (${fileSummaries}) were processed. 
  - Ensure validation docs include IQ/OQ/PQ stages.
  - Add audit trail samples with timestamps.
  - Include access control policy if missing.`;

  res.json({ feedback });
});


app.post("/optimize-production", async (req, res) => {
  const { reaction } = req.body;


  const prompt = `
You are an expert chemical engineer. Optimize this reaction: ${reactionInfo}

Details:
- Reactants: ${reactants || "Not provided"}
- Products: ${products || "Not provided"}
- Current Temp: ${temp || "Not specified"}
- Current Pressure: ${pressure || "Not specified"}
- Catalyst Used: ${catalyst || "Not provided"}
- Notes: ${notes || "None"}

Please:
1. Suggest optimal conditions (temperature, pressure, catalyst).
2. Minimize cost without reducing yield.
3. Flag safety issues or side reactions.
4. Add references if available.

Respond in clear HTML using <h2>, <ul>, <p>. No code blocks.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const output = result.response.text();
    res.json({ recommendation: output });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ recommendation: "❌ AI failed to generate a response." });
  }
});

// Utility helpers
function average(arr) {
  const nums = arr.map(Number).filter((n) => !isNaN(n));
  return nums.length
    ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
    : "N/A";
}
function sum(arr) {
  const nums = arr.map(Number).filter((n) => !isNaN(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
}

app.listen(4000, () => {
  console.log("Server running at http://localhost:4000");
});
