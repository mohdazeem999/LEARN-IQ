const express = require("express");
const router = express.Router();

// GET /api/teachers/class-map
router.get("/class-map", (req, res) => {
    res.json({
        success: true,
        className: "Class 10 - Section B",
        totalStudents: 32,
        assessmentsCompleted: 14,
        averageMastery: 74,
        concepts: [
            { name: "Fractions & Decimals", mastery: 88, status: "Strong" },
            { name: "Linear Equations in 1 Variable", mastery: 54, status: "Critical Learning Gap" },
            { name: "Algebraic Bracket Expansion", mastery: 61, status: "Needs Practice" },
            { name: "Geometry & Pythagorean Theorem", mastery: 82, status: "Strong" },
            { name: "Data Handling & Probability", mastery: 73, status: "Moderate" }
        ],
        studentsRequiringSupport: [
            { name: "Rohan V.", weakConcept: "Linear Equations", score: "42%" },
            { name: "Sneha M.", weakConcept: "Algebraic Expansion", score: "48%" },
            { name: "Priya S.", weakConcept: "Linear Equations", score: "50%" }
        ],
        topPerformers: [
            { name: "Aisha K.", score: "96%", xp: 3920 },
            { name: "Rahul M.", score: "92%", xp: 3680 },
            { name: "Alex (You)", score: "88%", xp: 2480 }
        ]
    });
});

// POST /api/teachers/intervention
router.post("/intervention", (req, res) => {
    const { concept = "Linear Equations", className = "Class 10-B" } = req.body;

    res.json({
        success: true,
        concept,
        className,
        aiInterventionPlan: {
            summary: `18 out of 32 students in ${className} stumbled on brackets expansion in Linear Equations.`,
            recommendedAction: "5-minute focused board review on distribution rule followed by 3 guided practice problems.",
            remedialQuiz: [
                "Solve 2(x + 3) = 14",
                "Expand 4(2x - 5)",
                "Identify error in: 3(x - 2) = 3x - 2"
            ]
        }
    });
});

module.exports = router;
