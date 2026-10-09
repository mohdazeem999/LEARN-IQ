const test = require("node:test");
const assert = require("node:assert/strict");
const {
    analyzeQuizSubmission,
    generateQuestionFeedback,
    buildFeedbackPrompt
} = require("../services/aiService");

process.env.GEMINI_API_KEY = "test-key";

function feedbackResponse(overrides = {}) {
    return {
        errorCategory: "Conceptual Error",
        explanation: "The key idea is explained using the details in this question.",
        stepByStepSolution: ["Identify the relevant rule.", "Apply it to the given values."],
        whySelectedAnswerDoesNotWork: "The selected option does not meet the stated condition.",
        practicalTip: "Check the question requirement before selecting an answer.",
        practiceActivity: "Try a new question about this concept and explain each step.",
        classificationConfidence: 0.92,
        ...overrides
    };
}

function question(subject, id, questionText, correctIndex = 1) {
    return {
        id,
        subject,
        question: questionText,
        options: ["Student choice", "Correct answer", "Another option"],
        correctIndex,
        concept: `${subject} concept`,
        explanation: "Verified answer-key explanation."
    };
}

test("uses subject-specific guidance for Mathematics, Science, English, Social Studies, and Computer Science", async () => {
    const subjects = [
        ["Mathematics", "Calculate 3 x 4.", "Calculation Error", /step-by-step solution/i],
        ["Science", "Why does ice melt?", "Conceptual Error", /misconception|concept-based practice/i],
        ["English", "Choose the correct verb form.", "Misinterpretation", /grammar/i],
        ["Social Studies", "What caused this historical event?", "Conceptual Error", /historical event/i],
        ["Computer Science", "Why does this loop stop?", "Calculation Error", /algorithm/i]
    ];
    const quiz = {
        subject: "Mixed subjects",
        classLevel: "Class 8",
        difficulty: "Medium",
        questions: subjects.map(([subject, text], index) => question(subject, index + 1, text))
    };
    quiz.questions[1].importance = "high";
    const prompts = [];
    const analysis = await analyzeQuizSubmission(quiz, {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }, context => generateQuestionFeedback(context, async prompt => {
        prompts.push(prompt);
        return feedbackResponse({
            errorCategory: subjects.find(([subject]) => subject === context.subject)[2],
            correctAnswer: "AI must not replace the answer key",
            isCorrect: true
        });
    }));

    assert.equal(analysis.correctCount, 0);
    assert.equal(analysis.scorePercentage, 0);
    assert.equal(analysis.feedback.length, subjects.length);
    subjects.forEach(([subject, text, , guidance], index) => {
        assert.match(prompts[index], guidance);
        assert.match(prompts[index], new RegExp(subject, "i"));
        assert.match(analysis.feedback[index].question, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.equal(analysis.feedback[index].correctAnswer, "Correct answer");
        assert.equal(analysis.feedback[index].selectedAnswer, "Student choice");
        assert.equal(analysis.feedback[index].isCorrect, false);
    });
    assert.equal(analysis.feedback[0].stepByStepSolution.length, 2);
    assert.equal(analysis.mistakeCategories["Calculation Error"], 2);
    assert.equal(analysis.mistakeCategories["Conceptual Error"], 2);
    assert.equal(analysis.mistakeCategories.Misinterpretation, 1);
    assert.equal(analysis.improvementPlan.needsRevision[0].importance, "high");
});

test("does not call AI for a correct answer or unanswered question", async () => {
    let calls = 0;
    const provider = async () => {
        calls++;
        return feedbackResponse();
    };
    const quiz = {
        subject: "Science",
        questions: [question("Science", 1, "Which answer is correct?")]
    };
    const analysis = await analyzeQuizSubmission(quiz, { 1: 1 }, context =>
        generateQuestionFeedback(context, provider)
    );
    const unanswered = await analyzeQuizSubmission(quiz, {}, context =>
        generateQuestionFeedback(context, provider)
    );

    assert.equal(calls, 0);
    assert.equal(analysis.correctCount, 1);
    assert.equal(analysis.scorePercentage, 100);
    assert.equal(analysis.feedback[0].isCorrect, true);
    assert.equal(unanswered.correctCount, 0);
    assert.equal(unanswered.unansweredCount, 1);
    assert.equal(unanswered.feedback[0].errorCategory, null);
    assert.equal(unanswered.mistakeCategories.Unanswered, 1);
    assert.deepEqual(unanswered.improvementPlan.needsRevision, []);
    assert.equal(unanswered.improvementPlan.unansweredTopics[0].questions, 1);
});

test("uses the uncertain category when the evidence does not support classification", async () => {
    const context = {
        subject: "Mathematics",
        question: "What is the answer?",
        topic: "Arithmetic",
        options: ["4", "5"],
        selectedIndex: 0,
        correctIndex: 1
    };
    const feedback = await generateQuestionFeedback(context, async () =>
        feedbackResponse({ errorCategory: "Calculation Error", classificationConfidence: 0.45 })
    );

    assert.equal(feedback.errorCategory, "Mistake type not confidently identified.");
    assert.equal(feedback.classificationConfidence, null);
    assert.equal(feedback.correctAnswer, "5");
});

test("falls back cleanly on invalid AI output and provider timeouts without changing scoring", async () => {
    const quiz = {
        subject: "English",
        questions: [question("English", 1, "Choose the correct word.")]
    };
    const invalid = await generateQuestionFeedback({
        subject: "English",
        question: quiz.questions[0].question,
        options: quiz.questions[0].options,
        selectedIndex: 0,
        correctIndex: 1,
        explanation: quiz.questions[0].explanation
    }, async () => ({ explanation: 42 }));
    const timedOut = await generateQuestionFeedback({
        subject: "English",
        question: quiz.questions[0].question,
        options: quiz.questions[0].options,
        selectedIndex: 0,
        correctIndex: 1,
        explanation: quiz.questions[0].explanation
    }, async () => {
        throw new Error("request timed out");
    });
    const analysis = await analyzeQuizSubmission(quiz, { 1: 0 }, async context =>
        generateQuestionFeedback(context, async () => null)
    );

    for (const fallback of [invalid, timedOut]) {
        assert.equal(fallback.status, "unavailable");
        assert.equal(fallback.retryAvailable, true);
        assert.equal(fallback.correctAnswer, "Correct answer");
        assert.match(fallback.explanation, /Verified answer-key explanation/);
    }
    assert.equal(analysis.correctCount, 0);
    assert.equal(analysis.scorePercentage, 0);
    assert.equal(analysis.feedback[0].retryAvailable, true);
});

test("does not infer mastery or a long-term weakness from one question", async () => {
    const quiz = {
        subject: "Computer Science",
        questions: [question("Computer Science", 1, "What does this algorithm do?")]
    };
    const analysis = await analyzeQuizSubmission(quiz, { 1: 0 }, async context =>
        generateQuestionFeedback(context, async () => feedbackResponse())
    );

    assert.deepEqual(analysis.strongConcepts, []);
    assert.deepEqual(analysis.weakConcepts, []);
    assert.match(analysis.improvementPlan.needsRevision[0].evidence, /One question/);
    assert.match(analysis.improvementPlan.evidenceNote, /not proof of mastery/);
});

test("supports configured subjects beyond the built-in subject strategies", () => {
    assert.match(buildFeedbackPrompt({
        subject: "Art",
        questionType: "visual analysis",
        question: "What is the effect of this colour choice?",
        options: ["A", "B"],
        selectedIndex: 0,
        correctIndex: 1
    }), /OTHER SUBJECT/i);
    assert.match(buildFeedbackPrompt({
        subject: "Civics",
        question: "What is a civic duty?",
        options: ["A", "B"],
        selectedIndex: 0,
        correctIndex: 1
    }), /SOCIAL STUDIES/i);
});
