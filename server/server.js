
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

import authRoutes from "./routes/auth.js";
import userDataRoutes from "./routes/userData.js";

// =========================================
// CONFIGURATION
// =========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.join(__dirname, ".env")
});

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const MODEL = "gemini-3.1-flash-lite";

const REQUEST_TIMEOUT_MS = 30000;
const TOTAL_GEMINI_DEADLINE_MS = 40000;

app.use(cors());
app.use(express.json());

// =========================================
// API ROUTES
// =========================================

app.use("/api/auth", authRoutes);
app.use("/api/user-data", userDataRoutes);

// =========================================
// MONGODB CONNECTION
// =========================================

async function connectMongoDB() {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        console.error("[MONGODB ERROR] MONGODB_URI is missing.");
        return;
    }

    try {
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("[MONGODB] Connected successfully.");
        console.log(`[MONGODB] Database: ${mongoose.connection.name}`);

    } catch (error) {
        console.error("[MONGODB ERROR]", error.message);
        console.log("[MONGODB] Express server will continue running.");
    }
}

mongoose.connection.on("disconnected", () => {
    console.log("[MONGODB] Database disconnected.");
});

mongoose.connection.on("reconnected", () => {
    console.log("[MONGODB] Database reconnected.");
});

mongoose.connection.on("error", (error) => {
    console.error("[MONGODB ERROR]", error.message);
});

// =========================================
// GEMINI INITIALIZATION
// =========================================

const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
            timeout: REQUEST_TIMEOUT_MS,
            retryOptions: {
                attempts: 1
            }
        }
    })
    : null;

if (!apiKey) {
    console.error("[CONFIG ERROR] GEMINI_API_KEY is missing.");
}

// =========================================
// REQUEST LOGGING
// =========================================

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// =========================================
// ABORTABLE RETRY DELAY
// =========================================

function waitWithAbort(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            return reject(
                new Error("Gemini total request deadline exceeded.")
            );
        }

        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);

        const onAbort = () => {
            clearTimeout(timer);

            reject(
                new Error("Gemini total request deadline exceeded.")
            );
        };

        signal.addEventListener("abort", onAbort, {
            once: true
        });
    });
}

// =========================================
// HEALTH CHECK
// =========================================

app.get("/", (req, res) => {
    res.send("CodeLens Backend is Running!");
});

// =========================================
// AI CODE EXPLANATION
// =========================================

app.post("/api/explain", async (req, res) => {
    console.log("[CODELENS] Explain route reached.");

    const requestStartTime = Date.now();

    let geminiAbortController = null;
    let deadlineTimer = null;

    try {
        const { code, language, task = "Explain" } = req.body;

        // Validate code
        if (!code || typeof code !== "string" || !code.trim()) {
            return res.status(400).json({
                error: "Please provide some code."
            });
        }

        // Check API configuration
        if (!ai) {
            return res.status(500).json({
                error: "Gemini API key is missing. Check server/.env."
            });
        }

        console.log(`[CODELENS] Task: ${task}`);
        console.log(`[CODELENS] Language: ${language || "Not specified"}`);
        console.log(`[CODELENS] Code length: ${code.length} characters`);

        // Task instructions
        let taskInstruction = "";

        if (task === "Debug") {
            taskInstruction = `
Find possible errors, bugs, and logical issues in the code.
Explain why they occur and provide corrected code where needed.
If there are no obvious errors, explain that clearly.
`;
        } else if (task === "Concepts") {
            taskInstruction = `
Identify and explain the important programming concepts,
functions, methods, and syntax used in this code.
Use simple beginner-friendly examples.
`;
        } else {
            taskInstruction = `
Include:
1. What the code does.
2. A line-by-line explanation.
3. Important programming concepts used.
4. A simple example of its output.
`;
        }

        // Build prompt
        const prompt = `
You are CodeLens, a friendly programming tutor.

Analyze the following ${language || "programming"} code
in simple language for a beginner.

Task: ${task}

${taskInstruction}

Code:
${code}
`;

        console.log(`[CODELENS] Prompt length: ${prompt.length} characters`);

        // Start the overall Gemini deadline
        geminiAbortController = new AbortController();

        console.log(
            `[GEMINI] Total request deadline: ${TOTAL_GEMINI_DEADLINE_MS / 1000}s`
        );

        deadlineTimer = setTimeout(() => {
            console.log("[GEMINI] Total request deadline reached. Aborting.");

            geminiAbortController.abort();
        }, TOTAL_GEMINI_DEADLINE_MS);

        // Retry temporary 503 errors
        let response;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[GEMINI] Attempt ${attempt}/3`);

                const geminiStartTime = Date.now();

                response = await ai.models.generateContent({
                    model: MODEL,
                    contents: prompt,
                    config: {
                        abortSignal: geminiAbortController.signal
                    }
                });

                console.log(
                    `[GEMINI] Response time: ${Date.now() - geminiStartTime}ms`
                );

                break;

            } catch (error) {
                // Stop immediately if the overall deadline was reached
                if (geminiAbortController.signal.aborted) {
                    throw new Error(
                        "Gemini total request deadline exceeded."
                    );
                }

                const temporaryError =
                    error.status === 503 ||
                    error.code === 503 ||
                    /503|UNAVAILABLE/.test(error.message || "");

                if (!temporaryError || attempt === 3) {
                    throw error;
                }

                const delay = 2000 * Math.pow(2, attempt - 1);

                console.log(
                    `[GEMINI] Temporary error. Retrying in ${delay / 1000}s...`
                );

                await waitWithAbort(
                    delay,
                    geminiAbortController.signal
                );
            }
        }

        if (!response || !response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        console.log("[GEMINI] Response received successfully.");

        res.json({
            explanation: response.text
        });

    } catch (error) {
        const deadlineExceeded =
            geminiAbortController?.signal.aborted ||
            /deadline exceeded/i.test(error.message || "");

        const isTimeout =
            deadlineExceeded ||
            error.name === "AbortError" ||
            /timeout|timed out/i.test(error.message || "");

        console.error("[GEMINI ERROR]", error.message);

        res.status(isTimeout ? 504 : 500).json({
            error: isTimeout
                ? "Gemini took too long to respond. Please try again."
                : "Unable to explain code. Please try again.",
            details: error.message
        });

    } finally {
        // Clean up the deadline timer
        if (deadlineTimer) {
            clearTimeout(deadlineTimer);
        }

        console.log(
            `[CODELENS] Total request time: ${Date.now() - requestStartTime}ms`
        );

        console.log("--------------------------------");
    }
});

// =========================================
// START SERVER
// =========================================

// Start MongoDB connection independently
connectMongoDB();

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("--------------------------------");
    console.log("CodeLens Backend is Running!");
    console.log(`Listening on port ${PORT}`);
    console.log(`API Key Loaded: ${Boolean(apiKey)}`);
    console.log(`Gemini Model: ${MODEL}`);
    console.log(`Request Timeout: ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    console.log(`Total Gemini Deadline: ${TOTAL_GEMINI_DEADLINE_MS / 1000} seconds`);
    console.log("SDK Retry Attempts: 1");
    console.log("Manual Retry Attempts: 3 for 503 errors");
    console.log("--------------------------------");
});

server.on("error", (error) => {
    console.error("[SERVER ERROR]", error);
});

server.on("close", () => {
    console.log("[SERVER CLOSED]");
});

process.on("beforeExit", (code) => {
    console.log(`[PROCESS] Node is about to exit. Code: ${code}`);
});

process.on("exit", (code) => {
    console.log(`[PROCESS] Node exited. Code: ${code}`);
});
