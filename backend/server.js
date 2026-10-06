const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const assessmentRoutes = require("./routes/assessmentRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "../frontend");

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(frontendPath));

// API Routes
app.use("/api/assessments", assessmentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/auth", authRoutes);

// Health Endpoint
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        service: "LearnIQ Backend Server",
        timestamp: new Date().toISOString()
    });
});

// Serve frontend SPA fallback
app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 LearnIQ AI Quiz Generator & Intelligence Platform`);
    console.log(`🌐 Web App running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
});
