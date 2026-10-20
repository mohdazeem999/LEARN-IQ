const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

// Startup Environment Variable Validation
function validateEnvironment() {
    const required = ["SUPABASE_URL"];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ CRITICAL CONFIG ERROR: Missing required environment variable(s): ${missing.join(", ")}`);
    }
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ NOTICE: GEMINI_API_KEY is not defined. AI quiz generation will run on deterministic fallback templates.");
    }
    if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn("⚠️ NOTICE: Neither SUPABASE_SECRET_KEY nor SUPABASE_SERVICE_ROLE_KEY is defined.");
    }
}
validateEnvironment();

const assessmentRoutes = require("./routes/assessmentRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "../frontend");

app.set("trust proxy", 1);

// Security Headers with CSP allowing required CDNs (Google Fonts, Font Awesome, Chart.js)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:", "wss:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Restrict CORS to specified origins or localhost in dev
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [
        `http://localhost:${PORT}`,
        `http://127.0.0.1:${PORT}`,
        "http://localhost:3000"
    ];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }
        return callback(new Error("CORS request blocked: origin not allowed."));
    },
    credentials: true
}));

app.use(express.json());

// Rate Limiting on sensitive endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many authentication attempts. Please try again after 15 minutes." }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 quiz generation requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "AI generation rate limit exceeded. Please wait a minute before requesting another quiz." }
});

app.use("/api/auth", authLimiter);
app.use("/api/assessments/generate", aiLimiter);

// Serve static frontend files
app.use(express.static(frontendPath));

// API Routes
app.use("/api/assessments", assessmentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Health Endpoints
const healthHandler = (req, res) => {
    res.status(200).json({
        status: "ok",
        healthy: true,
        service: "LearnIQ Backend Server",
        timestamp: new Date().toISOString()
    });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// Serve frontend SPA fallback
app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err.message);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.message && err.message.includes("CORS") ? 403 : (err.status || 500);
    res.status(statusCode).json({
        success: false,
        message: err.message || "An unexpected internal server error occurred."
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`🚀 LearnIQ AI Quiz Generator & Intelligence Platform`);
    console.log(`🌐 Web App running at: http://0.0.0.0:${PORT}`);
    console.log(`=======================================================`);
});
