/**
 * Curriculum & Classroom Concept Presets for LearnIQ
 */

const AVAILABLE_CLASSES = [5, 6, 7, 8, 9, 10, 11, 12];

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
    ],
    11: [
        { name: "Trigonometric Functions & Identities", mastery: 62, status: "Needs Practice" },
        { name: "Chemical Bonding & Molecular Structure", mastery: 56, status: "Critical Learning Gap" },
        { name: "Kinematics in 1D & 2D", mastery: 74, status: "Moderate" },
        { name: "Cell Cycle & Cell Division", mastery: 82, status: "Strong" }
    ],
    12: [
        { name: "Calculus: Limits & Derivatives", mastery: 58, status: "Critical Learning Gap" },
        { name: "Electrostatics & Current Electricity", mastery: 70, status: "Moderate" },
        { name: "Organic Chemistry: Functional Groups", mastery: 64, status: "Needs Practice" },
        { name: "Genetics & Molecular Basis of Inheritance", mastery: 85, status: "Strong" }
    ]
};

module.exports = {
    AVAILABLE_CLASSES,
    CLASS_CONCEPT_PRESETS
};
