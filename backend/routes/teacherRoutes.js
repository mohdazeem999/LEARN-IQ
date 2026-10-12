const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate, requireRole("teacher", "admin"));

// GET /api/teachers/classes
router.get("/classes", async (req, res) => {
    const classes = [5, 6, 7, 8, 9, 10, 11, 12].map(c => ({
        id: c,
        name: `Class ${c}`,
        section: "Section A",
        subject: "All Curriculum Subjects"
    }));
    res.json({ success: true, classes });
});

// GET /api/teachers/class-map
router.get("/class-map", async (req, res) => {
    const reqClass = req.query.classLevel || req.query.class || "10";
    const classNum = Number.parseInt(String(reqClass).replace(/\D/g, ""), 10) || 10;

    let conceptsData = null;
    let studentProfiles = [];

    if (supabase) {
        try {
            const { data } = await supabase.from('class_learning_maps')
                .select('*')
                .ilike('class_name', `%${classNum}%`);
            if (data && data.length > 0) {
                conceptsData = data.map(item => ({
                    name: item.concept_name,
                    mastery: item.mastery_percentage,
                    status: item.status
                }));
            }

            const { data: students } = await supabase.from('profiles')
                .select('name, xp, streak, class')
                .eq('role', 'student')
                .eq('class', classNum)
                .order('xp', { ascending: false });
            if (students) studentProfiles = students;
        } catch (err) {
            console.warn("Supabase fetch class map warning:", err.message);
        }
    }

    const CLASS_CONCEPT_PRESETS = {
        5: [
            { name: "Addition & Decimals", mastery: 85, status: "Strong" },
            { name: "Subtraction Word Problems", mastery: 62, status: "Needs Practice" },
            { name: "2D & 3D Shapes Identification", mastery: 90, status: "Strong" },
            { name: "Measurement & Units (cm, m, kg)", mastery: 55, status: "Critical Learning Gap" },
            { name: "Fraction Basics (Halves & Quarters)", mastery: 70, status: "Moderate" }
        ],
        6: [
            { name: "Fractions & Decimals Operations", mastery: 72, status: "Moderate" },
            { name: "Ratios & Proportions", mastery: 58, status: "Critical Learning Gap" },
            { name: "Basic Algebra Variables", mastery: 64, status: "Needs Practice" },
            { name: "Kinetic & Potential Energy", mastery: 80, status: "Strong" },
            { name: "English Active & Passive Voice", mastery: 76, status: "Moderate" }
        ],
        7: [
            { name: "Integers & Rational Numbers", mastery: 68, status: "Moderate" },
            { name: "Algebraic Sign Distributions", mastery: 52, status: "Critical Learning Gap" },
            { name: "Acids, Bases & Indicators", mastery: 78, status: "Strong" },
            { name: "Percentage & Simple Interest", mastery: 60, status: "Needs Practice" },
            { name: "Linear Angle Relationships", mastery: 82, status: "Strong" }
        ],
        8: [
            { name: "Linear Equations in 1 Variable", mastery: 54, status: "Critical Learning Gap" },
            { name: "Algebraic Factoring & Identities", mastery: 61, status: "Needs Practice" },
            { name: "Cell Structure & Organelles", mastery: 84, status: "Strong" },
            { name: "Force, Friction & Pressure", mastery: 73, status: "Moderate" },
            { name: "Exponents & Powers", mastery: 79, status: "Strong" }
        ],
        9: [
            { name: "Polynomials & Remainder Theorem", mastery: 58, status: "Critical Learning Gap" },
            { name: "Newton's Laws of Motion", mastery: 76, status: "Moderate" },
            { name: "Atoms, Molecules & Valency", mastery: 64, status: "Needs Practice" },
            { name: "Coordinate Geometry", mastery: 82, status: "Strong" },
            { name: "Plant & Animal Tissues", mastery: 88, status: "Strong" }
        ],
        10: [
            { name: "Quadratic Equations", mastery: 54, status: "Critical Learning Gap" },
            { name: "Chemical Reactions & Balancing", mastery: 68, status: "Moderate" },
            { name: "Light: Reflection & Lens Formula", mastery: 62, status: "Needs Practice" },
            { name: "Mendelian Heredity Genetics", mastery: 86, status: "Strong" },
            { name: "Arithmetic Progressions", mastery: 80, status: "Strong" }
        ]
    };

    const concepts = conceptsData || CLASS_CONCEPT_PRESETS[classNum] || CLASS_CONCEPT_PRESETS[10];
    const avgMastery = Math.round(concepts.reduce((acc, c) => acc + c.mastery, 0) / concepts.length);

    res.json({
        success: true,
        classNumber: classNum,
        className: `Class ${classNum} - Section A`,
        availableClasses: [5, 6, 7, 8, 9, 10, 11, 12],
        totalStudents: studentProfiles.length > 0 ? studentProfiles.length : 28,
        assessmentsCompleted: 14,
        averageMastery: avgMastery,
        concepts,
        studentsRequiringSupport: studentProfiles.length >= 2 ? studentProfiles.slice(-3).map(s => ({
            name: s.name,
            weakConcept: concepts.find(c => c.status.includes("Gap") || c.status.includes("Practice"))?.name || "Target Concept",
            score: `${Math.round(40 + Math.random() * 15)}%`
        })) : [
            { name: "Rohan V.", weakConcept: concepts[1]?.name || "Concept Review", score: "42%" },
            { name: "Sneha M.", weakConcept: concepts[3]?.name || "Practice Area", score: "48%" },
            { name: "Priya S.", weakConcept: concepts[0]?.name || "Core Subject", score: "52%" }
        ],
        topPerformers: studentProfiles.length >= 2 ? studentProfiles.slice(0, 3).map(s => ({
            name: s.name,
            score: `${Math.round(85 + Math.random() * 14)}%`,
            xp: s.xp || 1200
        })) : [
            { name: "Aisha K.", score: "96%", xp: 3920 },
            { name: "Rahul M.", score: "92%", xp: 3680 },
            { name: "Class Scholar", score: "88%", xp: 2480 }
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

// GET /api/teachers/gamification-overview
router.get("/gamification-overview", async (req, res) => {
    try {
        const gamificationService = require("../services/gamificationService");
        const overview = await gamificationService.getTeacherGamificationOverview();
        res.json({
            success: true,
            overview
        });
    } catch (err) {
        console.error("Teacher gamification overview error:", err.message);
        res.status(500).json({ success: false, message: "Unable to load gamification overview." });
    }
});

module.exports = router;
