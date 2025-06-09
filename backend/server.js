require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./database");
const path = require("path");
const { Parser } = require("json2csv");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ dest: "uploads/" });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// AI setup
const genAI = new GoogleGenerativeAI("AIzaSyBEqlViHCSL9XR8tVZDuYDINRly_bgBd6Y");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

console.log("✅ Gemini API Key Loaded");

// === Helper functions ===
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

// === Clinical Trial Optimizer ===
const contextPrompt = `
We are a biopharma firm with experience in numerous drug trials. 
Our goal is to help other companies optimize their clinical trial designs 
using our history and expertise.
`;

app.post("/submit-trial", async (req, res) => {
  const { disease, phase, region, endpoints, duration } = req.body;

  const userPrompt = `
You are an expert clinical trial assistant.
Based on the following parameters:
- Disease: ${disease}
- Phase: ${phase}
- Region: ${region}
- Endpoints: ${endpoints}
- Duration: ${duration}

Add comment
Perform these tasks:
1. Simulate trial outcomes for 3 design variations (low budget, standard, accelerated).
2. Predict recruitment challenges and dropout risks based on trial phase and region.
3. Recommend optimized endpoints using prior trial data and explain why.
4. Auto-generate a clinical trial protocol draft.
5. Include a visual timeline table (in HTML table format).
6. Output everything in clean HTML using <h2>, <ul>, <table>, <p> etc., without <html> or <body> tags.
7. Do not wrap the response in \`\`\`html\`\`\`.
8.Ensure response is aligned with:Add commentMore actions ICH-GCP E6(R2) standards, ISO 14155:2020 quality framework, FDA 21 CFR Part 11 for electronic records and signatures,CDISC formats (SDTM for raw data, ADaM for analysis-ready)
`;

  try {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: contextPrompt + "\n" + userPrompt }] },
      ],
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

// === Trial History ===
app.get("/history/:id", (req, res) => {
  db.get(`SELECT * FROM trials WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "Failed to fetch trial" });
    res.json(row);
  });
});

app.get("/history", (req, res) => {
  db.all(`SELECT * FROM trials ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch history" });
    res.json(rows);
  });
});

// === CSV Export ===
app.get("/export", (req, res) => {
  db.all(`SELECT * FROM trials`, [], (err, rows) => {
    if (err) return res.status(500).send("Export failed");

    const fields = [
      "id",
      "disease",
      "phase",
      "region",
      "endpoints",
      "duration",
      "created_at",
    ];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(rows);

    res.setHeader(
      "Content-disposition",
      "attachment; filename=clinical_trials.csv"
    );
    res.set("Content-Type", "text/csv");
    res.status(200).send(csv);
  });
});

// === Chemistry Reaction Optimizer ===
app.post("/optimize-production", async (req, res) => {
  try {
    const {
      reaction,
      reactants = "Not provided",
      products = "Not provided",
      temp = "Not specified",
      pressure = "Not specified",
      catalyst = "Not provided",
      notes = "None",
    } = req.body;

    // Build the prompt for Gemini or your AI model
    const prompt = `
You are an expert chemical engineer. Optimize this reaction: ${reaction}

Details:
- Reactants: ${reactants}
- Products: ${products}
- Current Temp: ${temp}
- Current Pressure: ${pressure}
- Catalyst Used: ${catalyst}
- Notes: ${notes}

Please:
1. Suggest optimal conditions (temperature, pressure, catalyst).
2. Minimize cost without reducing yield.
3. Flag safety issues or side reactions.
4. Add references if available.

Respond in clear HTML using <h2>, <ul>, <p>. No code blocks.
`.trim();

    // Call the Gemini API (or whichever model you use)
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const recommendation = result.response.text();

    // Optional: mock molecular data (replace with real moleculeData if you have it)
    const moleculeData = `
MJ201100                      

  4  3  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0
    1.2094    0.0000    0.0000 C   0  0
    2.4189    0.0000    0.0000 O   0  0
   -0.6055    0.9370    0.0000 H   0  0
  1  2  1  0
  2  3  2  0
  1  4  1  0
M  END
`.trim();

    res.status(200).json({
      success: true,
      recommendation,
      moleculeData,
    });
  } catch (err) {
    console.error("AI optimization error:", err);

    const isQuotaExceeded = err.status === 429;

    res.status(isQuotaExceeded ? 429 : 500).json({
      success: false,
      recommendation: isQuotaExceeded
        ? "⚠️ Gemini API quota exceeded. Please try again later."
        : "❌ AI failed to generate a response.",
      moleculeData: "",
    });
  }
});

// === Health Analysis ===
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
5. Make pointers in response for better readability.
6. This analysis is seen by doctors, not patients.
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

// === Compliance Document Upload Feedback ===
app.post("/analyze-compliance-docs", upload.array("docs"), async (req, res) => {
  const fileSummaries = req.files.map((file) => file.originalname).join(", ");

  const feedback = `Uploaded files (${fileSummaries}) were processed. 
  - Ensure validation docs include IQ/OQ/PQ stages.
  - Add audit trail samples with timestamps.
  - Include access control policy if missing.`;

  res.json({ feedback });
});

// === Server Start ===
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
