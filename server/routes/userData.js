
import express from "express";
import mongoose from "mongoose";

import History from "../models/History.js";
import SavedCode from "../models/SavedCode.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// =========================================
// HISTORY
// =========================================

// Get all history
router.get("/history", async (req, res) => {
  try {
    const history = await History.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("[USER DATA] Fetch history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch history.",
    });
  }
});

// Add history
router.post("/history", async (req, res) => {
  try {
    const { code, language, task, explanation } = req.body;

    if (!code || !language || !task || !explanation) {
      return res.status(400).json({
        success: false,
        message: "Code, language, task, and explanation are required.",
      });
    }

    const historyItem = await History.create({
      userId: req.userId,
      code,
      language,
      task,
      explanation,
    });

    res.status(201).json({
      success: true,
      history: historyItem,
    });
  } catch (error) {
    console.error("[USER DATA] Save history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save history.",
    });
  }
});

// Delete one history item
router.delete("/history/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid history ID.",
      });
    }

    const deletedItem = await History.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "History item not found.",
      });
    }

    res.json({
      success: true,
      message: "History item deleted.",
    });
  } catch (error) {
    console.error("[USER DATA] Delete history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete history item.",
    });
  }
});

// Clear all history
router.delete("/history", async (req, res) => {
  try {
    await History.deleteMany({
      userId: req.userId,
    });

    res.json({
      success: true,
      message: "History cleared.",
    });
  } catch (error) {
    console.error("[USER DATA] Clear history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to clear history.",
    });
  }
});

// =========================================
// SAVED CODE
// =========================================

// Get all saved code
router.get("/saved-code", async (req, res) => {
  try {
    const savedCode = await SavedCode.find({
      userId: req.userId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      savedCode,
    });
  } catch (error) {
    console.error("[USER DATA] Fetch saved code error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch saved code.",
    });
  }
});

// Save code with its AI analysis
router.post("/saved-code", async (req, res) => {
  try {
    const {
      title,
      code,
      language,
      task,
      explanation,
    } = req.body;

    if (!title || !code || !language) {
      return res.status(400).json({
        success: false,
        message: "Title, code, and language are required.",
      });
    }

    const savedItem = await SavedCode.create({
      userId: req.userId,
      title,
      code,
      language,
      task: task || "explain",
      explanation: explanation || "",
    });

    res.status(201).json({
      success: true,
      savedCode: savedItem,
    });
  } catch (error) {
    console.error("[USER DATA] Save code error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save code.",
    });
  }
});

// Delete one saved code item
router.delete("/saved-code/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid saved code ID.",
      });
    }

    const deletedItem = await SavedCode.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Saved code item not found.",
      });
    }

    res.json({
      success: true,
      message: "Saved code item deleted.",
    });
  } catch (error) {
    console.error("[USER DATA] Delete saved code error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete saved code item.",
    });
  }
});

// Clear all saved code
router.delete("/saved-code", async (req, res) => {
  try {
    await SavedCode.deleteMany({
      userId: req.userId,
    });

    res.json({
      success: true,
      message: "Saved code cleared.",
    });
  } catch (error) {
    console.error("[USER DATA] Clear saved code error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to clear saved code.",
    });
  }
});

export default router;
