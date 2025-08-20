const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const Ingredient = require("../models/Ingredient");
const path = require("path");
const fs = require("fs");

// Improved Python path detection
function getPythonPath() {
  // Try multiple possible Python paths
  const possiblePaths = [
    // Windows with .venv
    path.join(__dirname, "..", ".venv", "Scripts", "python.exe"),
    // Windows with venv
    path.join(__dirname, "..", "venv", "Scripts", "python.exe"),
    // Unix/Linux with .venv
    path.join(__dirname, "..", ".venv", "bin", "python"),
    // Unix/Linux with venv
    path.join(__dirname, "..", "venv", "bin", "python"),
    // System Python (Windows)
    "python.exe",
    // System Python (Unix/Linux/Mac)
    "python3",
    "python"
  ];

  for (const pythonPath of possiblePaths) {
    if (fs.existsSync(pythonPath) || !pythonPath.includes(path.sep)) {
      return pythonPath;
    }
  }

  // Default fallback
  return "python";
}

const pythonPath = getPythonPath();
const scriptPath = path.join(__dirname, "..", "assistant.py");

// Log paths only in development
if (process.env.NODE_ENV !== 'production') {
  console.log(`Using Python path: ${pythonPath}`);
  console.log(`Using script path: ${scriptPath}`);
}

// Note: Python assistant fetches inventory directly from DB; no need to load it here

router.post("/ask", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Pass the user text as a single argument to assistant.py
    // The Python script will fetch inventory live from DB itself, so no need to write inventory.json
    const python = spawn(pythonPath, [scriptPath, text], {
      env: { ...process.env, ASSISTANT_DEBUG: process.env.ASSISTANT_DEBUG || "0" }
    });

    let data = "";
    let errorOutput = "";

    python.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    python.stderr.on("data", (err) => {
      errorOutput += err.toString();
      console.error("Python stderr:", err.toString());
    });

    python.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      return res.status(500).json({
        error: "Failed to start Python process",
        details: err.message,
      });
    });

    python.on("close", (code) => {
      if (errorOutput) {
        // Log stderr but do not fail the request if exit code is 0
        console.warn("Python stderr:", errorOutput.trim());
      }
      if (code !== 0) {
        return res.status(500).json({
          error: "Python process failed",
          code,
          stderr: errorOutput.trim(),
        });
      }
      const reply = (data || "").trim();
      if (!reply) {
        return res.status(500).json({ error: "Empty reply from assistant" });
      }
      res.json({ reply });
    });
  } catch (err) {
    console.error("Assistant error:", err);
    res.status(500).json({
      error: "Assistant failed",
      details: err.message,
    });
  }
});

module.exports = router;