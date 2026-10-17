/**
 * LearnIQ - Frontend Global State & Configuration
 */

export const API_BASE = "/api";

if (typeof window !== "undefined" && window.fetch) {
    const _origFetch = window.fetch;
    window.fetch = function (resource, options) {
        options = options || {};
        const url = typeof resource === "string" ? resource : resource?.url || "";
        if (url.startsWith("/api") || url.startsWith(API_BASE)) {
            if (!options.credentials) {
                options.credentials = "same-origin";
            }
        }
        return _origFetch.call(this, resource, options);
    };
}

export const state = {
    currentUser: null,
    currentQuiz: null,
    currentQuestionIdx: 0,
    userAnswers: {},
    quizTimerInterval: null,
    quizSecondsLeft: 300,
    quizTimerMode: "overall", // "overall" | "question"
    questionSecondsLeft: 45,
    questionTimerInterval: null,
    quizSubmissionInProgress: false,
    studentProfile: {
        xp: 0,
        streak: 0,
        rank: "-",
        name: "Student",
        classLevel: "Class 10",
        coins: 50,
        activeAvatar: "avatar_explorer",
        equipped: { frame: null, theme: null, title: null }
    },
    studentHistory: [],
    currentDailyChallenges: [],
    selectedChallengeTask: null,
    selectedChallengeOption: null,
    landingSelectedRole: "student",
    landingActiveTab: "login"
};

export const defaultQuiz = {
    title: "Linear Equations",
    subject: "Mathematics",
    classLevel: "Class 10",
    difficulty: "Medium",
    questions: [
        {
            id: 1,
            question: "Solve for x in the equation: 3x - 7 = 14",
            options: ["x = 7", "x = 5", "x = 9", "x = 3"],
            correctIndex: 0,
            concept: "One-variable Linear Equations",
            explanation: "Add 7 to both sides: 3x = 21. Then divide by 3: x = 7."
        },
        {
            id: 2,
            question: "If 2(x + 4) = 18, what is the value of x?",
            options: ["x = 5", "x = 7", "x = 9", "x = 4"],
            correctIndex: 0,
            concept: "Distributive Property",
            explanation: "Expand brackets: 2x + 8 = 18. Subtract 8: 2x = 10. Divide by 2: x = 5."
        },
        {
            id: 3,
            question: "A number increased by 12 equals 3 times the same number. What is the number?",
            options: ["6", "4", "8", "12"],
            correctIndex: 0,
            concept: "Word Problems into Equations",
            explanation: "Let the number be x. x + 12 = 3x => 2x = 12 => x = 6."
        },
        {
            id: 4,
            question: "What is the slope of the line represented by y = -4x + 9?",
            options: ["-4", "9", "4", "-9"],
            correctIndex: 0,
            concept: "Slope-Intercept Form",
            explanation: "In y = mx + c, m represents the slope. Here m = -4."
        },
        {
            id: 5,
            question: "Solve the system: x + y = 10 and x - y = 4",
            options: ["x = 7, y = 3", "x = 6, y = 4", "x = 8, y = 2", "x = 5, y = 5"],
            correctIndex: 0,
            concept: "Simultaneous Equations",
            explanation: "Adding equations: 2x = 14 => x = 7. Substitute into x + y = 10 => y = 3."
        }
    ]
};
