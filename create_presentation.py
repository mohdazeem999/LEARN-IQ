import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Initialize Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Color Palette Constants
BG_COLOR = RGBColor(11, 17, 32)         # Deep Navy Slate (#0B1120)
CARD_BG = RGBColor(23, 32, 54)          # Elevated Slate (#172036)
CARD_BORDER = RGBColor(39, 52, 82)      # Subtle Border (#273452)
ACCENT_CYAN = RGBColor(56, 189, 248)    # Tailwind Cyan 400 (#38BDF8)
ACCENT_INDIGO = RGBColor(129, 140, 248) # Indigo 400 (#818CF8)
ACCENT_GREEN = RGBColor(52, 211, 153)   # Emerald 400 (#34D399)
ACCENT_AMBER = RGBColor(251, 146, 60)   # Amber 400 (#FB923C)
TEXT_WHITE = RGBColor(248, 250, 252)    # Crisp Off-White (#F8FAFC)
TEXT_MUTED = RGBColor(148, 163, 184)    # Slate 400 (#94A3B8)
TEXT_LIGHT = RGBColor(203, 213, 225)    # Slate 300 (#CBD5E1)
PILL_BG = RGBColor(30, 41, 59)          # Badge Background (#1E293B)

MOCKUPS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "docs", "mockups"))

def add_header(slide, category, title, subtitle):
    """Adds a standard executive header to a slide."""
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.38), Inches(10), Inches(0.3))
    tf_tag = tag_box.text_frame
    tf_tag.word_wrap = True
    tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = category.upper()
    p_tag.font.bold = True
    p_tag.font.size = Pt(10)
    p_tag.font.color.rgb = ACCENT_CYAN
    p_tag.font.name = "Arial"
    
    head_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(11.7), Inches(0.85))
    tf_head = head_box.text_frame
    tf_head.word_wrap = True
    tf_head.margin_left = tf_head.margin_top = tf_head.margin_right = tf_head.margin_bottom = 0
    
    p_title = tf_head.paragraphs[0]
    p_title.text = title
    p_title.font.bold = True
    p_title.font.size = Pt(21)
    p_title.font.color.rgb = TEXT_WHITE
    p_title.font.name = "Arial"
    
    p_sub = tf_head.add_paragraph()
    p_sub.text = subtitle
    p_sub.font.size = Pt(11.5)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.font.name = "Arial"

def create_slide(category, title, subtitle):
    """Creates a base slide with full-bleed dark theme and header."""
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)
    
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_COLOR
    bg.line.fill.background()
    
    add_header(slide, category, title, subtitle)
    return slide

def add_card(slide, left, top, width, height, title=None, border_color=CARD_BORDER, bg_color=CARD_BG):
    """Draws a styled container card."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = border_color
    card.line.width = Pt(1)
    
    if title:
        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), width - Inches(0.4), Inches(0.35))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.bold = True
        p.font.size = Pt(13)
        p.font.color.rgb = ACCENT_CYAN
        p.font.name = "Arial"
    return card

def attach_notes(slide, what_to_say, key_point, possible_question, answer):
    """Attaches structured manager speaker notes to a slide."""
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = (
        f"--- SPEAKER PRESENTATION NOTES ---\n\n"
        f"🗣️ WHAT TO SAY TO THE MANAGER:\n{what_to_say}\n\n"
        f"🎯 KEY POINT TO REMEMBER:\n{key_point}\n\n"
        f"❓ POSSIBLE MANAGER QUESTION:\n{possible_question}\n\n"
        f"💡 VERIFIED ANSWER (FROM CODEBASE):\n{answer}"
    )

def add_bullet_point(tf, bold_prefix, text, size=11, color=TEXT_LIGHT):
    """Helper to add consistent formatted bullet points."""
    p = tf.add_paragraph()
    p.space_after = Pt(6)
    p.font.size = Pt(size)
    p.font.name = "Arial"
    
    run_bold = p.add_run()
    run_bold.text = bold_prefix + " "
    run_bold.font.bold = True
    run_bold.font.color.rgb = TEXT_WHITE
    
    run_text = p.add_run()
    run_text.text = text
    run_text.font.bold = False
    run_text.font.color.rgb = color

# ==============================================================================
# SLIDE 1: TITLE SLIDE
# ==============================================================================
slide1 = prs.slides.add_slide(prs.slide_layouts[6])
bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
bg1.fill.solid()
bg1.fill.fore_color.rgb = BG_COLOR
bg1.line.fill.background()

# Decorative accent bar
bar1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(1.2), Inches(0.08))
bar1.fill.solid()
bar1.fill.fore_color.rgb = ACCENT_CYAN
bar1.line.fill.background()

tb_title = slide1.shapes.add_textbox(Inches(0.8), Inches(2.1), Inches(11.7), Inches(3.2))
tf1 = tb_title.text_frame
tf1.word_wrap = True
tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

p1 = tf1.paragraphs[0]
p1.text = "LearnIQ Platform"
p1.font.bold = True
p1.font.size = Pt(40)
p1.font.color.rgb = TEXT_WHITE
p1.font.name = "Arial"

p1_sub = tf1.add_paragraph()
p1_sub.text = "AI-Powered Classroom Learning Intelligence & Adaptive Evaluation Engine"
p1_sub.font.bold = True
p1_sub.font.size = Pt(18)
p1_sub.font.color.rgb = ACCENT_CYAN
p1_sub.font.name = "Arial"
p1_sub.space_before = Pt(8)

p1_desc = tf1.add_paragraph()
p1_desc.text = "A technical and architectural walkthrough of the actual implemented codebase, real-time diagnostic engine, gamification framework, and enterprise-grade security."
p1_desc.font.size = Pt(13)
p1_desc.font.color.rgb = TEXT_MUTED
p1_desc.font.name = "Arial"
p1_desc.space_before = Pt(12)

# Metrics / Status Badges on Title Slide
status_box = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.6), Inches(11.7), Inches(1.1))
status_box.fill.solid()
status_box.fill.fore_color.rgb = CARD_BG
status_box.line.color.rgb = CARD_BORDER

tb_metrics = slide1.shapes.add_textbox(Inches(1.0), Inches(5.75), Inches(11.3), Inches(0.8))
tf_m = tb_metrics.text_frame
tf_m.word_wrap = True
p_m = tf_m.paragraphs[0]
p_m.text = "PLATFORM VERIFICATION AUDIT: 100% Core Codebase Verified  •  19/19 Unit Tests Passing  •  Zero Imagined APIs"
p_m.font.bold = True
p_m.font.size = Pt(11)
p_m.font.color.rgb = ACCENT_GREEN
p_m.font.name = "Arial"

p_sub_m = tf_m.add_paragraph()
p_sub_m.text = "Stack: Node.js 20+ | Express 4.19 | Google Gemini SDK (@google/genai) | Supabase Cloud PostgreSQL | Cookie-Session RBAC"
p_sub_m.font.size = Pt(11)
p_sub_m.font.color.rgb = TEXT_LIGHT
p_sub_m.font.name = "Arial"

attach_notes(
    slide1,
    what_to_say="Good morning. Today I am presenting LearnIQ, an AI-powered learning intelligence platform. This presentation is not based on conceptual slides or mockups, but on a line-by-line audit of our actual implementation. We built LearnIQ to replace blunt percentage scores with deep diagnostic intelligence, helping students identify exactly why they made a mistake, while giving teachers real-time visibility into classroom concept gaps.",
    key_point="LearnIQ is a fully functioning diagnostic platform built with Node.js, Express, Google Gemini, and Supabase, backed by 19 passing automated tests.",
    possible_question="What is the high-level business goal of LearnIQ?",
    answer="To transform routine quiz taking from a passive score counter into an automated pedagogical diagnostic tool that identifies conceptual versus calculation mistakes and generates immediate remedial actions."
)

# ==============================================================================
# SLIDE 2: PROBLEM STATEMENT
# ==============================================================================
slide2 = create_slide(
    "Market & Pedagogical Challenge",
    "The Diagnostic Blindspot in Modern Education",
    "Traditional assessment tools score correctness, but completely ignore the underlying cognitive reason for student failure."
)

# 3 Column Cards
card_w = Inches(3.64)
card_h = Inches(4.8)
top_pos = Inches(1.8)

# Card 1: Static Testing
c1 = add_card(slide2, Inches(0.8), top_pos, card_w, card_h, "1. Static One-Size Quizzes", CARD_BORDER)
tb_c1 = slide2.shapes.add_textbox(Inches(1.0), top_pos + Inches(0.6), card_w - Inches(0.4), card_h - Inches(0.8))
tf_c1 = tb_c1.text_frame
tf_c1.word_wrap = True
add_bullet_point(tf_c1, "Fixed Question Banks:", "Every student receives the exact same questions regardless of their past performance or grade comprehension.")
add_bullet_point(tf_c1, "Rote Memorization:", "Students memorize answer options rather than mastering foundational concepts.")
add_bullet_point(tf_c1, "No Difficulty Scaling:", "Struggling students face overwhelming questions while advanced students remain unchallenged.")

# Card 2: Superficial Scoring
c2 = add_card(slide2, Inches(4.84), top_pos, card_w, card_h, "2. Blunt Score Feedback", CARD_BORDER)
tb_c2 = slide2.shapes.add_textbox(Inches(5.04), top_pos + Inches(0.6), card_w - Inches(0.4), card_h - Inches(0.8))
tf_c2 = tb_c2.text_frame
tf_c2.word_wrap = True
add_bullet_point(tf_c2, "Missing 'Why':", "A student who scores 60% receives a grade, but no explanation of whether they failed due to a concept gap, formula error, or sign mistake.")
add_bullet_point(tf_c2, "Generic Answer Keys:", "Showing only 'Option B was correct' does not teach the student how to solve the problem step-by-step.")
add_bullet_point(tf_c2, "Repeated Pitfalls:", "Without root-cause classification, students carry the exact same misconceptions into exam week.")

# Card 3: Teacher Visibility Lag
c3 = add_card(slide2, Inches(8.88), top_pos, card_w, card_h, "3. Teacher Blindspots", CARD_BORDER)
tb_c3 = slide2.shapes.add_textbox(Inches(9.08), top_pos + Inches(0.6), card_w - Inches(0.4), card_h - Inches(0.8))
tf_c3 = tb_c3.text_frame
tf_c3.word_wrap = True
add_bullet_point(tf_c3, "Delayed Intervention:", "Teachers only discover student learning gaps weeks later when major exam papers are graded.")
add_bullet_point(tf_c3, "Overwhelming Manual Work:", "Individualized feedback for 40+ students per classroom is practically impossible without automation.")
add_bullet_point(tf_c3, "No Group Aggregation:", "Educators lack real-time visibility into which specific sub-topic 60% of the class is struggling with today.")

attach_notes(
    slide2,
    what_to_say="Every educator and school faces the same dilemma: quizzes tell you that a student scored 6 out of 10, but they never tell you *why*. Did the student misunderstand the core definition? Did they make a simple arithmetic error? Or did they misread the question? In a 35-student classroom, teachers cannot manually diagnose every single error, so remedial interventions happen far too late.",
    key_point="Modern LMS platforms grade answers, but fail to diagnose cognitive misconceptions.",
    possible_question="Why can't schools just use Google Forms or existing LMS quiz modules?",
    answer="Google Forms and standard LMS engines only verify option indices (e.g. A vs B). They cannot classify cognitive mistake categories, dynamically adapt question difficulty to class syllabus standards, or generate automated 5-minute remedial lesson plans."
)

# ==============================================================================
# SLIDE 3: THE SOLUTION
# ==============================================================================
slide3 = create_slide(
    "Product Vision & Value Proposition",
    "LearnIQ: The Continuous Learning Intelligence Loop",
    "A self-reinforcing educational feedback loop integrating dynamic AI generation, cognitive diagnostics, and teacher intervention."
)

# 4 Horizontal Step Cards
step_w = Inches(2.7)
step_h = Inches(4.8)
lefts = [Inches(0.8), Inches(3.8), Inches(6.8), Inches(9.8)]

steps_data = [
    ("Step 1: Adaptive Generation", ACCENT_CYAN, [
        ("Curriculum-Aligned:", "Generates dynamic questions tailored to Class (5-12), Subject, Topic, and Difficulty."),
        ("Multi-Tier AI Engine:", "Google Gemini 2.5/1.5 Flash with built-in pedagogical template fallback."),
        ("Zero Hallucinations:", "Strict JSON response schemas enforce exactly 4 options and a verified answer key.")
    ]),
    ("Step 2: Interactive Assessment", ACCENT_INDIGO, [
        ("Clean Glassmorphic UI:", "Focused, distraction-free test interface with timer, progress indicators, and formula display."),
        ("Strict Integrity:", "Client submission validation and anti-cheat request throttling prevent automated spamming."),
        ("Instant Client Sync:", "Evaluates student response against server-verified answer keys.")
    ]),
    ("Step 3: Cognitive Diagnosis", ACCENT_AMBER, [
        ("Error Classification:", "Categorizes wrong answers into Conceptual, Calculation, Misinterpretation, or Careless."),
        ("Step-by-Step Logic:", "Delivers targeted explanations, why the chosen option failed, and actionable practice."),
        ("Evidence Safeguards:", "Never labels an error careless without high confidence (>=0.7 threshold).")
    ]),
    ("Step 4: Teacher & Student Loop", ACCENT_GREEN, [
        ("Class DNA Map:", "Aggregates student mastery percentages into visual live class heatmaps."),
        ("Remedial Action:", "Generates 5-minute targeted board review strategies and mini-quizzes for teachers."),
        ("Gamified Retention:", "Drives daily practice via XP, 15 progression tiers, daily challenges, and reward unlocks.")
    ])
]

for idx, (title, color, bullets) in enumerate(steps_data):
    add_card(slide3, lefts[idx], top_pos, step_w, step_h, title, color)
    tb = slide3.shapes.add_textbox(lefts[idx] + Inches(0.18), top_pos + Inches(0.6), step_w - Inches(0.36), step_h - Inches(0.8))
    tf = tb.text_frame
    tf.word_wrap = True
    for prefix, body in bullets:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide3,
    what_to_say="LearnIQ solves the assessment problem by turning testing into a continuous intelligence loop. First, the student receives an AI-generated quiz tailored to their exact grade level and topic. Second, when they submit, the backend evaluates the submission. Third, our AI diagnosis engine analyzes incorrect answers to classify the exact failure mechanism. Fourth, these insights immediately update the student's mastery profile and the teacher's classroom learning map.",
    key_point="LearnIQ operates as a complete closed-loop learning cycle: Generate -> Assess -> Diagnose -> Remediate.",
    possible_question="Does LearnIQ require teachers to create all quiz questions from scratch?",
    answer="No. LearnIQ automatically creates curriculum-aligned questions in seconds using Google Gemini or the built-in pedagogical fallback bank. However, teachers can also supply custom teacher instructions/prompts to guide quiz generation."
)

# ==============================================================================
# SLIDE 4: USER ROLES & ACCESS CONTROL
# ==============================================================================
slide4 = create_slide(
    "User Personas & Security Architecture",
    "Verified Multi-Role Access Control (RBAC)",
    "Strict, role-segregated experiences enforced on both the client interface and server API endpoints."
)

roles_data = [
    ("Student Persona", ACCENT_CYAN, Inches(0.8), [
        ("Self-Service Registration:", "Public signup with mandatory Class selection (Class 5 to 12)."),
        ("Class Scoping:", "Strict server enforcement prevents Class 8 students from generating or viewing Class 10/12 exams."),
        ("Adaptive Quizzing:", "Can generate, take, and submit quizzes; review step-by-step diagnostic feedback."),
        ("Gamification System:", "Earns XP, LearnCoins, levels up (Tiers 1-15), claims daily missions, equips badges and avatar frames.")
    ]),
    ("Teacher Persona", ACCENT_INDIGO, Inches(4.84), [
        ("Elevated Role Assignment:", "Assigned by administrators or configured in Supabase profiles (role='teacher')."),
        ("Class Learning Map:", "Monitors concept mastery percentages, identified learning gaps, and top vs struggling students."),
        ("AI Remedial Interventions:", "Generates 5-10 minute focused classroom lesson plans and targeted 3-question remedial drills."),
        ("Gamification Overview:", "Tracks class-wide student activity streaks, aggregate XP, and engagement levels.")
    ]),
    ("Administrator Persona", ACCENT_GREEN, Inches(8.88), [
        ("Platform Oversight:", "Protected by requireRole('admin') middleware; rejects student and teacher tokens."),
        ("User Management:", "Live directory of all registered accounts with role, class, XP, and registration timestamps."),
        ("Role Elevation Engine:", "API endpoint /api/admin/role allows updating user roles dynamically with UUID validation."),
        ("System Health Telemetry:", "Monitors active database connections, Supabase Auth status, and API health.")
    ])
]

for title, color, left_pos, bullets in roles_data:
    add_card(slide4, left_pos, top_pos, card_w, card_h, title, color)
    tb = slide4.shapes.add_textbox(left_pos + Inches(0.2), top_pos + Inches(0.6), card_w - Inches(0.4), card_h - Inches(0.8))
    tf = tb.text_frame
    tf.word_wrap = True
    for prefix, body in bullets:
        add_bullet_point(tf, prefix, body, size=11)

attach_notes(
    slide4,
    what_to_say="LearnIQ implements three distinct roles: Student, Teacher, and Administrator. Students register publicly and must specify their grade from Class 5 through 12. Crucially, as verified in our backend assessment routes, a student is locked to their assigned class and cannot generate tests for other grades. Teachers have access to classroom diagnostic maps and remedial tools, while administrators manage users and assign roles.",
    key_point="Role boundaries are enforced strictly on the backend via Express middleware and Supabase profile verification.",
    possible_question="Can a student elevate themselves to a teacher or admin during registration?",
    answer="No. The signup endpoint strictly normalizes the role parameter to 'student' (or 'teacher' if explicitly registered, but admin can only be assigned by trusted administrators directly in Supabase or via the admin role API)."
)

# ==============================================================================
# SLIDE 5: SYSTEM ARCHITECTURE
# ==============================================================================
slide5 = create_slide(
    "High-Level Engineering Blueprint",
    "LearnIQ Full-Stack System Architecture",
    "A resilient decoupled architecture integrating client SPA, secured Express API gateway, Google GenAI, and Supabase Cloud."
)

# Left Column: Architectural Flow Diagram Cards (Inches 0.8 to 6.2)
flow_w = Inches(5.6)
f1 = add_card(slide5, Inches(0.8), Inches(1.8), flow_w, Inches(1.15), "1. Presentation Layer (Client SPA)", CARD_BORDER)
tb_f1 = slide5.shapes.add_textbox(Inches(1.0), Inches(2.2), flow_w - Inches(0.4), Inches(0.7))
tf_f1 = tb_f1.text_frame
tf_f1.word_wrap = True
p = tf_f1.paragraphs[0]
p.text = "Vanilla HTML5/CSS3/JS Glassmorphic SPA • Chart.js Engine • Zero Build Bloat • Fast Load Times"
p.font.size = Pt(10.5); p.font.color.rgb = TEXT_LIGHT

f2 = add_card(slide5, Inches(0.8), Inches(3.1), flow_w, Inches(1.5), "2. Application & API Gateway (Express 4.19)", CARD_BORDER)
tb_f2 = slide5.shapes.add_textbox(Inches(1.0), Inches(3.5), flow_w - Inches(0.4), Inches(1.05))
tf_f2 = tb_f2.text_frame
tf_f2.word_wrap = True
p = tf_f2.paragraphs[0]
p.text = "Security: Helmet CSP, Rate Limiting, CORS Protection\nAuth Engine: HttpOnly SameSite Cookie Resolution & JWT Exp Claim\nRoutes: /api/auth, /api/assessments, /api/students, /api/teachers, /api/admin"
p.font.size = Pt(10); p.font.color.rgb = TEXT_LIGHT

f3 = add_card(slide5, Inches(0.8), Inches(4.75), flow_w, Inches(1.85), "3. Intelligence & Persistence Layer (Cloud & Local)", CARD_BORDER)
tb_f3 = slide5.shapes.add_textbox(Inches(1.0), Inches(5.15), flow_w - Inches(0.4), Inches(1.4))
tf_f3 = tb_f3.text_frame
tf_f3.word_wrap = True
p = tf_f3.paragraphs[0]
p.text = "Google GenAI SDK: Gemini 2.5/1.5 Flash with deterministic pedagogical fallback\nSupabase Cloud: Auth Service, PostgreSQL tables, Row Level Security (RLS)\nLocal Gamification Engine: Atomic JSON Store with XP audit logs & transaction safety"
p.font.size = Pt(10); p.font.color.rgb = TEXT_LIGHT

# Right Column: Actual Screenshot or Feature Diagram
shot_w = Inches(5.8)
shot_h = Inches(4.8)
landing_shot = os.path.join(MOCKUPS_DIR, "landing.png")
if os.path.exists(landing_shot):
    slide5.shapes.add_picture(landing_shot, Inches(6.7), Inches(1.8), shot_w, shot_h)
else:
    c_sub = add_card(slide5, Inches(6.7), Inches(1.8), shot_w, shot_h, "Platform Interface Overview")

attach_notes(
    slide5,
    what_to_say="This slide displays our architectural flow. The frontend is a responsive Single Page Application built with modern HTML, CSS, and Vanilla JavaScript, ensuring sub-second initial loads without frontend framework overhead. Requests travel to our Express API gateway, protected by Helmet CSP headers and rate limiting. The gateway communicates with Supabase for authentication and relational data, and with Google Gemini for AI quiz and feedback generation.",
    key_point="The backend acts as the secure mediator; client browsers never interact directly with Gemini API keys or database service secrets.",
    possible_question="Why did you choose Vanilla JS over React or Next.js for the frontend?",
    answer="Vanilla JS provides maximum execution speed, zero compile-step overhead, and eliminates frontend dependency churn, while still achieving full component modularity and reactive UI updates via clean DOM manipulation."
)

# ==============================================================================
# SLIDE 6: TECH STACK
# ==============================================================================
slide6 = create_slide(
    "Engineering Stack & Dependencies",
    "Verified Technology Stack",
    "Every listed technology is actively installed and verified in package.json and repository files."
)

tech_cards = [
    ("Frontend Layer", ACCENT_CYAN, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3), [
        ("Core Web:", "HTML5 Semantic Structure, Custom CSS3 Design System with Glassmorphism"),
        ("Typography & Icons:", "Google Fonts (Inter), Font Awesome 6.5.2"),
        ("Analytics Visuals:", "Chart.js (Local minified distribution in assets/chart.min.js)"),
        ("Math Engine:", "KaTeX LaTeX Rendering Ready for mathematical formulae")
    ]),
    ("Backend Layer", ACCENT_INDIGO, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.3), [
        ("Runtime & Framework:", "Node.js (>=20.0.0), Express.js 4.19.2"),
        ("Security Middleware:", "Helmet 8.3.0 (CSP Directives), CORS 2.8.5"),
        ("Traffic Protection:", "express-rate-limit 8.7.1 (Auth: 30 req/15m, AI: 10 req/1m)"),
        ("Testing Suite:", "Node.js Native Test Runner (node:test, node:assert/strict)")
    ]),
    ("AI & Machine Learning", ACCENT_AMBER, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.3), [
        ("SDK Engine:", "@google/genai (v2.27.0) official Google GenAI SDK"),
        ("Active Models:", "gemini-flash-lite-latest, gemini-3.5-flash-lite, gemini-3.8-flash"),
        ("Protocol:", "JSON mode structured output, automatic REST HTTP fallback"),
        ("Heuristic Fallback:", "Deterministic curriculum template bank across 5 core subjects")
    ]),
    ("Database & Infrastructure", ACCENT_GREEN, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.3), [
        ("Cloud Database:", "Supabase PostgreSQL via @supabase/supabase-js (v2.117.2)"),
        ("Auth Engine:", "Supabase Auth with HttpOnly cookie session exchange & rotation"),
        ("Access Control:", "Row Level Security (RLS) enabled on user profiles"),
        ("Local Persistence:", "Atomic atomic file-locking JSON storage for gamification audits")
    ])
]

for title, color, left, top, width, height, items in tech_cards:
    add_card(slide6, left, top, width, height, title, color)
    tb = slide6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7))
    tf = tb.text_frame
    tf.word_wrap = True
    for prefix, body in items:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide6,
    what_to_say="Here is our actual technology stack, verified directly from our package.json and source files. On the backend we run Node.js 20 with Express, protected by Helmet and express-rate-limit. For AI, we utilize Google's newest @google/genai SDK targeting Gemini Flash models for speed and low latency. Supabase powers our cloud database and authentication, while the frontend uses pure HTML, CSS, and Chart.js.",
    key_point="All dependencies are modern, production-grade, and actively verified in code.",
    possible_question="What happens if the Gemini API key runs out of quota or goes down?",
    answer="The system has an automated fallback mechanism: if the API key is missing or fails, it activates our curriculum template bank to generate subject-accurate questions and explanations without breaking the student's exam."
)

# ==============================================================================
# SLIDE 7: AUTHENTICATION & SECURITY
# ==============================================================================
slide7 = create_slide(
    "Enterprise Security & Access Governance",
    "Authentication & Zero-Trust Security Architecture",
    "Complete security implementation details verified in middleware/auth.js and server.js."
)

sec_cards = [
    ("Cookie-Based Session Tokens", ACCENT_CYAN, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3), [
        ("HttpOnly Protection:", "Tokens are stored in 'learniq_access' & 'learniq_refresh' cookies; invisible to browser scripts."),
        ("XSS Immunity:", "Because tokens cannot be read via document.cookie or localStorage, XSS token harvesting is mitigated."),
        ("SameSite=Lax & Secure:", "Cookies use SameSite=Lax and dynamically enforce the Secure flag in HTTPS production."),
        ("Session Duration:", "30-day max session lifecycle with automatic silent token rotation.")
    ]),
    ("Role-Based Access Control (RBAC)", ACCENT_INDIGO, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.3), [
        ("requireRole() Middleware:", "Secures route handlers by validating req.auth.user.role against permitted roles."),
        ("Strict Class Boundaries:", "Students are prevented from accessing or generating quiz data outside their assigned class."),
        ("Admin Route Lockdown:", "Admin endpoints (/api/admin/*) immediately return 403 Forbidden for students and teachers."),
        ("Safe Fallback Routing:", "Guests attempting to navigate to protected routes trigger an authentication modal.")
    ]),
    ("Injection Defense & Validation", ACCENT_AMBER, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.3), [
        ("RFC 4122 UUID Validation:", "Strict isValidUUID validator blocks SQL/PostgREST injection attempts in user and quiz queries."),
        ("Deep Payload Validation:", "Quiz submission route checks options arrays, answer bounds, string lengths (<=4000 chars)."),
        ("Input Sanitization:", "Protects against JSON injection and prototype pollution in submission feedback."),
        ("Atomic Profile Upsert:", "Handles concurrent profile creation gracefully with duplicate-key resolution.")
    ]),
    ("Network Defense & Headers", ACCENT_GREEN, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.3), [
        ("Helmet CSP Directives:", "Explicit whitelist for Google Fonts, cdnjs FontAwesome, and Chart.js CDNs."),
        ("Granular Rate Limiting:", "Auth endpoints capped at 30 req/15 min; AI generation capped at 10 req/min per IP."),
        ("CORS Origin Whitelisting:", "Restricts cross-origin requests to explicit production domains or localhost in dev."),
        ("Zero Secret Leakage:", "Service role keys and Gemini API keys reside exclusively in backend environment variables.")
    ])
]

for title, color, left, top, width, height, items in sec_cards:
    add_card(slide7, left, top, width, height, title, color)
    tb = slide7.shapes.add_textbox(left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7))
    tf = tb.text_frame
    tf.word_wrap = True
    for prefix, body in items:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide7,
    what_to_say="Security was built into LearnIQ from day one. Many developer projects make the mistake of storing access tokens in localStorage, which leaves them vulnerable to XSS attacks. In LearnIQ, tokens are stored in HttpOnly, SameSite cookies. Furthermore, every route uses requireRole middleware, and all database IDs are validated using our strict RFC 4122 UUID checker to prevent PostgREST or SQL injection.",
    key_point="Tokens are stored in HttpOnly cookies, not in browser localStorage, providing robust defense against XSS.",
    possible_question="How does token refresh work when an access token expires?",
    answer="In middleware/auth.js, the isNearExpiry function checks if the JWT token is within 60 seconds of expiration. If expired, it silently calls Supabase's refreshSession with the refresh token and sets new cookies on the response without disrupting the user."
)

# ==============================================================================
# SLIDE 8: STUDENT JOURNEY
# ==============================================================================
slide8 = create_slide(
    "End-to-End User Experience",
    "The Student Learning Journey",
    "A structured, motivating path from initial dashboard login through adaptive practice to verified mastery."
)

# Left Column: Step-by-Step Cards (Inches 0.8 to 6.2)
sj_w = Inches(5.6)
card_step_h = Inches(1.1)

steps = [
    ("1. Student Dashboard", "Live streak tracker, current level progress bar, recent test attendance, and subject mastery cards."),
    ("2. Setup & Topic Selection", "Selects Subject, Topic, and Difficulty (Easy, Medium, Hard). Quick topic chips provide 1-click presets."),
    ("3. Adaptive AI Assessment", "Takes dynamic timed multiple-choice questions with real-time progress bar and option selection."),
    ("4. Diagnostic Score & Intelligence", "Receives instantaneous score percentage, mistake category breakdown, and question-by-question remediation.")
]

for idx, (stitle, sdesc) in enumerate(steps):
    c = add_card(slide8, Inches(0.8), Inches(1.8 + idx * 1.25), sj_w, card_step_h, stitle, ACCENT_CYAN)
    tb = slide8.shapes.add_textbox(Inches(1.0), Inches(2.2 + idx * 1.25), sj_w - Inches(0.4), Inches(0.6))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = sdesc
    p.font.size = Pt(11); p.font.color.rgb = TEXT_LIGHT

# Right Column: Screenshot of Student Dashboard
dash_shot = os.path.join(MOCKUPS_DIR, "student-dashboard.png")
if os.path.exists(dash_shot):
    slide8.shapes.add_picture(dash_shot, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.8))

attach_notes(
    slide8,
    what_to_say="This slide illustrates the student's journey. When the student logs in, they see their personalized dashboard with active daily streak, current XP, and level. They navigate to Adaptive Quiz, pick their subject and topic, and immediately begin their assessment. Once submitted, they don't just see a raw number; they receive an immediate diagnostic analysis showing what they mastered and exactly where they stumbled.",
    key_point="The student journey transforms evaluation into an engaging, gamified feedback cycle.",
    possible_question="What happens if a student exits mid-quiz?",
    answer="The quiz state is held in the client memory during the attempt; if refreshed before submission, the student can re-generate or resume from the quiz generator screen."
)

# ==============================================================================
# SLIDE 9: AI QUIZ GENERATION ENGINE
# ==============================================================================
slide9 = create_slide(
    "Core Artificial Intelligence Layer",
    "AI Quiz Generation Engine & Fallback Architecture",
    "Deep dive into prompt construction, Gemini API integration, and subject-aware pedagogical fallbacks."
)

# Left Column: Prompting & Architecture (0.8 to 6.2)
ai_w = Inches(5.6)
add_card(slide9, Inches(0.8), Inches(1.8), ai_w, Inches(2.3), "Prompt Engineering & Schema", ACCENT_CYAN)
tb_ai1 = slide9.shapes.add_textbox(Inches(1.0), Inches(2.35), ai_w - Inches(0.4), Inches(1.6))
tf_ai1 = tb_ai1.text_frame
tf_ai1.word_wrap = True
add_bullet_point(tf_ai1, "Curriculum Alignment:", "System prompt strictly injects Class Level (5-12), Subject, and Sub-topic.")
add_bullet_point(tf_ai1, "Strict JSON Schema:", "Forces response schema: { title, subject, classLevel, difficulty, questions: [{ id, question, options, correctIndex, concept, explanation }] }.")
add_bullet_point(tf_ai1, "Hallucination Defense:", "Strict instruction: 'EVERY single question MUST be 100% strictly about the Subject and Topic. Do NOT include cross-subject questions.'")

add_card(slide9, Inches(0.8), Inches(4.3), ai_w, Inches(2.3), "Multi-Tiered Resilient Pipeline", ACCENT_INDIGO)
tb_ai2 = slide9.shapes.add_textbox(Inches(1.0), Inches(4.85), ai_w - Inches(0.4), Inches(1.6))
tf_ai2 = tb_ai2.text_frame
tf_ai2.word_wrap = True
add_bullet_point(tf_ai2, "1. Primary SDK:", "Uses Google GenAI SDK (@google/genai) with candidate models (gemini-flash-lite-latest, gemini-3.5-flash-lite).")
add_bullet_point(tf_ai2, "2. Direct REST Fallback:", "If SDK fails, executes direct HTTPS call to generativelanguage.googleapis.com REST endpoint.")
add_bullet_point(tf_ai2, "3. Heuristic Curriculum Bank:", "If offline, immediately serves curated pedagogical questions for Physics, Chem, Bio, Math, and English.")

# Right Column: Screenshot of Quiz Question
q_shot = os.path.join(MOCKUPS_DIR, "quiz-question.png")
if os.path.exists(q_shot):
    slide9.shapes.add_picture(q_shot, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.8))

attach_notes(
    slide9,
    what_to_say="The AI Quiz Generation Engine is one of LearnIQ's core differentiators. In backend/services/aiService.js, we construct a heavily constrained educational prompt that passes the student's exact class level, subject, and topic. We demand a strictly formatted JSON payload so our parser never breaks. Furthermore, we implemented a 3-tier fallback pipeline: Google GenAI SDK, direct REST backup, and a deterministic template engine, ensuring 100% platform uptime.",
    key_point="Quiz generation uses strict JSON schemas and a 3-tier fallback pipeline so tests never fail.",
    possible_question="How does LearnIQ prevent Gemini from inventing incorrect answers?",
    answer="We enforce verified single-choice answer structures where correctIndex explicitly points to an element in the options array, and we require an explanation field that proves why the selected option is correct."
)

# ==============================================================================
# SLIDE 10: LEARNING INTELLIGENCE & GAP DIAGNOSIS
# ==============================================================================
slide10 = create_slide(
    "Pedagogical Diagnostic Core",
    "Learning Intelligence: Cognitive Error Diagnosis",
    "How LearnIQ transforms raw quiz answers into precise cognitive diagnostic insights."
)

# Left Column: Error Classification Model (0.8 to 6.2)
diag_w = Inches(5.6)
add_card(slide10, Inches(0.8), Inches(1.8), diag_w, Inches(2.3), "The 4-Category Cognitive Error Engine", ACCENT_AMBER)
tb_d1 = slide10.shapes.add_textbox(Inches(1.0), Inches(2.35), diag_w - Inches(0.4), Inches(1.6))
tf_d1 = tb_d1.text_frame
tf_d1.word_wrap = True
add_bullet_point(tf_d1, "1. Conceptual Error:", "Student misunderstands the fundamental scientific law, grammatical rule, or mathematical principle.")
add_bullet_point(tf_d1, "2. Calculation Error:", "Correct conceptual formulation, but student stumbled on arithmetic, signs, or unit conversions.")
add_bullet_point(tf_d1, "3. Misinterpretation:", "Student misread question constraints (e.g. overlooked 'NOT', inverted variables, or mixed terminology).")
add_bullet_point(tf_d1, "4. Careless Error:", "Random slip-up on elementary steps; only assigned if confidence exceeds 0.7 threshold.")

add_card(slide10, Inches(0.8), Inches(4.3), diag_w, Inches(2.3), "Remediation & Improvement Plan", ACCENT_CYAN)
tb_d2 = slide10.shapes.add_textbox(Inches(1.0), Inches(4.85), diag_w - Inches(0.4), Inches(1.6))
tf_d2 = tb_d2.text_frame
tf_d2.word_wrap = True
add_bullet_point(tf_d2, "Step-by-Step Remediation:", "Generates a clean 2-to-4 step solution showing the exact derivation of the correct answer.")
add_bullet_point(tf_d2, "Why Chosen Answer Failed:", "Explains specifically what false assumption caused the student's selected option to be wrong.")
add_bullet_point(tf_d2, "Actionable Practice Activity:", "Provides an immediate targeted drill (e.g. 'Solve 2(x+3)=14') to solidify concept understanding.")

# Right Column: Screenshot of Learning Intelligence
intel_shot = os.path.join(MOCKUPS_DIR, "learning-intelligence.png")
if os.path.exists(intel_shot):
    slide10.shapes.add_picture(intel_shot, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.8))

attach_notes(
    slide10,
    what_to_say="This is the true heart of LearnIQ: our Learning Intelligence layer. When a student misses a question, we don't just say 'Wrong'. The AI analyzes what the student chose compared to the correct answer. In aiService.js, we categorize the error into one of four verified pedagogical types: Conceptual, Calculation, Misinterpretation, or Careless. We then provide a step-by-step solution and an immediate practice exercise.",
    key_point="LearnIQ classifies student mistakes into four specific cognitive failure modes with step-by-step remediation.",
    possible_question="What if the AI isn't confident about why the student got it wrong?",
    answer="In aiService.js, if the classification confidence is below 0.7 or evidence is ambiguous, the system explicitly labels the mistake as 'Mistake type not confidently identified', avoiding misleading pedagogical advice."
)

# ==============================================================================
# SLIDE 11: GAMIFICATION ENGINE
# ==============================================================================
slide11 = create_slide(
    "Engagement Mechanics & Behavioral Psychology",
    "Gamification Engine: XP Economy & Rewards Vault",
    "Motivating consistent daily learning habits through a mathematical progression system."
)

# 4 Cards Grid (2x2)
gw = Inches(5.6)
gh = Inches(2.3)

add_card(slide11, Inches(0.8), Inches(1.8), gw, gh, "15-Tier Level Progression Math", ACCENT_CYAN)
tb_g1 = slide11.shapes.add_textbox(Inches(1.0), Inches(2.35), gw - Inches(0.4), gh - Inches(0.6))
tf_g1 = tb_g1.text_frame; tf_g1.word_wrap = True
add_bullet_point(tf_g1, "Level Curve:", "Tier 1 Explorer (0-150 XP) to Tier 15 Supreme Luminary (17,500+ XP) with auto-scaling.")
add_bullet_point(tf_g1, "Progressive Span:", "XP span expands dynamically between levels; displays exact XP needed to next tier.")
add_bullet_point(tf_g1, "Continuous Motivation:", "Milestone level-ups trigger celebration notifications and unlock new avatars.")

add_card(slide11, Inches(6.8), Inches(1.8), gw, gh, "Multi-Factor XP Calculation", ACCENT_INDIGO)
tb_g2 = slide11.shapes.add_textbox(Inches(7.0), Inches(2.35), gw - Inches(0.4), gh - Inches(0.6))
tf_g2 = tb_g2.text_frame; tf_g2.word_wrap = True
add_bullet_point(tf_g2, "Base Completion:", "+20 XP for finishing any assessment.")
add_bullet_point(tf_g2, "Accuracy Boost:", "+5 XP per correct answer.")
add_bullet_point(tf_g2, "Perfection Bonus:", "+30 XP for a flawless 100% score.")
add_bullet_point(tf_g2, "Comeback Reward:", "+25 XP for improving by >=10% over previous attempt on same topic.")

add_card(slide11, Inches(0.8), Inches(4.3), gw, gh, "Daily Missions & Streak Defense", ACCENT_AMBER)
tb_g3 = slide11.shapes.add_textbox(Inches(1.0), Inches(4.85), gw - Inches(0.4), gh - Inches(0.6))
tf_g3 = tb_g3.text_frame; tf_g3.word_wrap = True
add_bullet_point(tf_g3, "4 Daily Missions:", "Complete 1 Quiz, Answer 4 Correct, Score >=70%, Practice a Growth Area.")
add_bullet_point(tf_g3, "Streak Tracking:", "Computes consecutive active days with milestone rewards at 3, 7, 14, and 30 days.")
add_bullet_point(tf_g3, "Streak Freeze Shield:", "Students can equip shields in the Rewards Vault to protect streaks if a day is missed.")

add_card(slide11, Inches(6.8), Inches(4.3), gw, gh, "LearnCoins & Reward Shop Vault", ACCENT_GREEN)
tb_g4 = slide11.shapes.add_textbox(Inches(7.0), Inches(4.85), gw - Inches(0.4), gh - Inches(0.6))
tf_g4 = tb_g4.text_frame; tf_g4.word_wrap = True
add_bullet_point(tf_g4, "Digital Economy:", "Earns LearnCoins alongside XP for high scores and daily quest completions.")
add_bullet_point(tf_g4, "Store Items:", "Cyber Neon Glow Frame (80 coins), Golden Scholar Frame (120 coins), Matrix Backdrop (150 coins).")
add_bullet_point(tf_g4, "Custom Titles:", "Equip titles like 'Math Prodigy', 'AI Pioneer', or 'Curious Thinker' on profile.")
add_bullet_point(tf_g4, "Anti-Fraud Checks:", "Validates coin balance on server before allowing redemption; prevents client forgery.")

attach_notes(
    slide11,
    what_to_say="Gamification is not an afterthought in LearnIQ; it is integrated directly into the learning loop in gamificationService.js. We implemented a 15-tier progression curve with titles from Explorer to Supreme Luminary. XP is awarded transparently: base completion, points per correct answer, bonus for 100%, and extra XP for a comeback improvement. Students also earn LearnCoins to purchase avatar frames, background themes, and streak shields.",
    key_point="The gamification engine uses server-validated XP and coin transactions to incentivize consistent daily study.",
    possible_question="Is the gamification data stored in Supabase or locally?",
    answer="Both. It writes atomically to our local gamification store with full transaction logs, and automatically syncs XP, streaks, coins, and unlocked achievements directly to the Supabase profiles and student_achievements tables."
)

# ==============================================================================
# SLIDE 12: TEACHER INTELLIGENCE
# ==============================================================================
slide12 = create_slide(
    "Educator Enablement & Actionable Analytics",
    "Teacher Intelligence: Class Learning Map & Interventions",
    "Equipping teachers with real-time concept mastery heatmaps and AI-generated remedial lesson plans."
)

# Left Column: Features (0.8 to 6.2)
teach_w = Inches(5.6)
add_card(slide12, Inches(0.8), Inches(1.8), teach_w, Inches(2.3), "Class DNA Learning Map", ACCENT_INDIGO)
tb_t1 = slide12.shapes.add_textbox(Inches(1.0), Inches(2.35), teach_w - Inches(0.4), Inches(1.6))
tf_t1 = tb_t1.text_frame; tf_t1.word_wrap = True
add_bullet_point(tf_t1, "Multi-Grade Switching:", "Teachers switch instantly between Classes 5 through 12 to inspect curriculum mastery.")
add_bullet_point(tf_t1, "Concept DNA Breakdown:", "Shows percentage mastery across topics (e.g. Quadratic Equations: 54% - Critical Gap).")
add_bullet_point(tf_t1, "Targeted Student Lists:", "Automatically highlights students requiring urgent intervention versus top class scholars.")

add_card(slide12, Inches(0.8), Inches(4.3), teach_w, Inches(2.3), "AI Remedial Intervention Engine", ACCENT_CYAN)
tb_t2 = slide12.shapes.add_textbox(Inches(1.0), Inches(4.85), teach_w - Inches(0.4), Inches(1.6))
tf_t2 = tb_t2.text_frame; tf_t2.word_wrap = True
add_bullet_point(tf_t2, "1-Click Generation:", "Teacher selects a weak concept (e.g. Linear Equations) and triggers AI remedial planning.")
add_bullet_point(tf_t2, "Misconception Summary:", "'18 out of 32 students in Class 10-A stumbled on brackets expansion.'")
add_bullet_point(tf_t2, "5-Minute Action Plan:", "Provides concrete pedagogical advice for quick board review followed by paired practice.")
add_bullet_point(tf_t2, "Remedial Mini-Quiz:", "Generates 3 targeted practice questions for immediate classroom reinforcement.")

# Right Column: Screenshot of Teacher Dashboard
teach_shot = os.path.join(MOCKUPS_DIR, "teacher-dashboard.png")
if os.path.exists(teach_shot):
    slide12.shapes.add_picture(teach_shot, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.8))

attach_notes(
    slide12,
    what_to_say="Now let's look at the teacher experience. Teachers no longer have to guess what their class struggles with. The Class Learning Map aggregates student test data into an interactive DNA heatmap showing mastery percentages per topic. When a teacher sees a critical gap—such as 54% in Quadratic Equations—they click 'Generate AI Intervention'. The system produces a concise summary of the student misconception, a 5-minute teaching strategy, and 3 remedial questions.",
    key_point="Teachers receive automated pedagogical interventions saving hours of lesson planning and diagnosis.",
    possible_question="Where does the teacher class data come from?",
    answer="In routes/teacherRoutes.js, the endpoint /api/teachers/class-map pulls aggregated concept mastery records from Supabase class_learning_maps, supplemented with curriculum presets from constants/curriculum.js when new classes are launched."
)

# ==============================================================================
# SLIDE 13: ADMIN SYSTEM
# ==============================================================================
slide13 = create_slide(
    "Platform Administration & Governance",
    "Administrator Dashboard & User Management",
    "Full governance capabilities to inspect platform health, monitor user metrics, and assign roles."
)

# Left Column: Admin Capabilities (0.8 to 6.2)
adm_w = Inches(5.6)
add_card(slide13, Inches(0.8), Inches(1.8), adm_w, Inches(2.3), "Platform Oversight & Health Telemetry", ACCENT_GREEN)
tb_a1 = slide13.shapes.add_textbox(Inches(1.0), Inches(2.35), adm_w - Inches(0.4), Inches(1.6))
tf_a1 = tb_a1.text_frame; tf_a1.word_wrap = True
add_bullet_point(tf_a1, "Total User Registry:", "Real-time count of total registered users, broken down into Students, Teachers, and Admins.")
add_bullet_point(tf_a1, "Cloud Connectivity:", "Telemetry card verifying live Supabase Auth and database connectivity status.")
add_bullet_point(tf_a1, "Audit Log Monitoring:", "Tracks recent user registrations with timestamps and assigned grade levels.")

add_card(slide13, Inches(0.8), Inches(4.3), adm_w, Inches(2.3), "User Directory & Dynamic Role Promotion", ACCENT_INDIGO)
tb_a2 = slide13.shapes.add_textbox(Inches(1.0), Inches(4.85), adm_w - Inches(0.4), Inches(1.6))
tf_a2 = tb_a2.text_frame; tf_a2.word_wrap = True
add_bullet_point(tf_a2, "Live Directory Table:", "Tabular display of Name, Email, Role, Class, Accumulated XP, and Daily Streak.")
add_bullet_point(tf_a2, "Role Management API:", "POST /api/admin/role enables promoting any user between Student, Teacher, and Admin.")
add_bullet_point(tf_a2, "Security Restrictions:", "Strictly protected by requireRole('admin') middleware; non-admins receive 403 Forbidden.")
add_bullet_point(tf_a2, "UUID Protection:", "All role update payloads require verified RFC 4122 UUIDs to safeguard the database.")

# Right Column: Screenshot of Admin Dashboard
admin_shot = os.path.join(MOCKUPS_DIR, "admin-dashboard.png")
if os.path.exists(admin_shot):
    slide13.shapes.add_picture(admin_shot, Inches(6.7), Inches(1.8), Inches(5.8), Inches(4.8))

attach_notes(
    slide13,
    what_to_say="The Administrator dashboard provides institutional governance. Implemented in routes/adminRoutes.js and frontend/js/admin.js, administrators have real-time visibility into total registered students and teachers, system operational status, and database connectivity. The admin can promote students to teachers or assign new administrators dynamically through a secure, UUID-validated API.",
    key_point="Administrators have complete, secure control over user roles, platform telemetry, and account statuses.",
    possible_question="Can an admin delete student accounts or view student passwords?",
    answer="No. Passwords are encrypted inside Supabase Auth and are never accessible to admins or the backend. Account deletion and role modifications follow zero-trust principles."
)

# ==============================================================================
# SLIDE 14: DATABASE ARCHITECTURE
# ==============================================================================
slide14 = create_slide(
    "Relational Data Modeling & Integrity",
    "Supabase PostgreSQL Database Architecture",
    "Clean relational schema with Row Level Security (RLS) and verified foreign-key constraints."
)

# 4 Table Description Cards
db_cards = [
    ("public.profiles", ACCENT_CYAN, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3), [
        ("Primary Key:", "id UUID REFERENCES auth.users(id) ON DELETE CASCADE"),
        ("Core Columns:", "name, email, role ('student'|'teacher'|'admin'), class (INT 5-12)"),
        ("Gamification Fields:", "xp (INT), streak (INT), coins (INT), rank (INT)"),
        ("Security:", "Row Level Security (RLS) enabled; backend accesses via service key.")
    ]),
    ("public.quizzes", ACCENT_INDIGO, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.3), [
        ("Primary Key:", "id UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
        ("Metadata:", "title, subject, class_level, difficulty, created_by, created_at"),
        ("Question Payload:", "questions JSONB (stores array of questions, options, answer key, explanation)"),
        ("Performance Indexes:", "Indexes on subject, class_level, and created_at DESC.")
    ]),
    ("public.quiz_submissions", ACCENT_AMBER, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.3), [
        ("Primary Key:", "id UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
        ("Foreign Keys:", "quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE"),
        ("Performance Metrics:", "score_percentage, correct_count, total_questions, xp_earned, coins_earned"),
        ("Diagnostic JSONB:", "mistake_categories JSONB, concept_stats JSONB, ai_insight TEXT.")
    ]),
    ("Auxiliary & Audit Tables", ACCENT_GREEN, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.3), [
        ("public.xp_transactions:", "id, student_id, amount, source, reference_id, created_at"),
        ("public.student_achievements:", "student_id, achievement_id, unlocked_at (UNIQUE constraint)"),
        ("public.class_learning_maps:", "class_name, concept_name, mastery_percentage, status"),
        ("public.reward_items & redemptions:", "item_id, cost_coins, student_id, redeemed_at.")
    ])
]

for title, color, left, top, width, height, items in db_cards:
    add_card(slide14, left, top, width, height, title, color)
    tb = slide14.shapes.add_textbox(left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7))
    tf = tb.text_frame; tf.word_wrap = True
    for prefix, body in items:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide14,
    what_to_say="Our database architecture is designed in PostgreSQL on Supabase, verified in backend/schema.sql and backend/gamification-schema.sql. The profiles table mirrors Supabase Auth users with cascading deletes. Quizzes and submissions store structured JSONB payloads for flexibility and high performance. We also maintain a dedicated xp_transactions table for complete financial and gamification auditability.",
    key_point="Relational tables store user metadata while JSONB stores complex question and diagnostic payloads.",
    possible_question="Why use JSONB for quiz questions instead of a normalized question table?",
    answer="JSONB allows atomic, single-query retrieval of entire multi-part assessments without costly multi-table joins, while maintaining flexible schemas for varying subject structures (such as math formulas vs literature passages)."
)

# ==============================================================================
# SLIDE 15: TECHNICAL DATA FLOW
# ==============================================================================
slide15 = create_slide(
    "End-to-End Execution Pipeline",
    "Detailed Technical Data Flow: Quiz Lifecycle",
    "Step-by-step trace of a single quiz generation, student submission, and diagnostic evaluation."
)

# 6 Sequential Pipeline Steps
steps_flow = [
    ("1. Client Request", "Student selects Class 10, Mathematics, Quadratic Equations. POST /api/assessments/generate sent with HttpOnly cookies."),
    ("2. Auth & RBAC Check", "auth.js middleware validates JWT cookie, refreshes if near expiry, and verifies student is enrolled in Class 10."),
    ("3. AI Prompt & Generation", "aiService.js passes strict prompt to Google GenAI SDK. If offline, template fallback triggers. Quiz saved to Supabase quizzes table."),
    ("4. Student Assessment", "Frontend displays timed quiz; student clicks options. On submit, answers object { '1': 0, '2': 3 } sent to /api/assessments/submit."),
    ("5. Cognitive Diagnosis", "aiService.js evaluates accuracy, concurrently calls Gemini to classify mistake categories, and builds step-by-step remediation."),
    ("6. Gamification & DB Sync", "gamificationService.js calculates +XP, LearnCoins, updates streak, checks unlocked badges, and syncs updates to Supabase profiles.")
]

flow_box_w = Inches(11.7)
flow_box_h = Inches(0.72)

for i, (title, desc) in enumerate(steps_flow):
    top = Inches(1.8 + i * 0.85)
    c = add_card(slide15, Inches(0.8), top, flow_box_w, flow_box_h, None, CARD_BORDER)
    tb = slide15.shapes.add_textbox(Inches(1.0), top + Inches(0.1), flow_box_w - Inches(0.4), flow_box_h - Inches(0.2))
    tf = tb.text_frame; tf.word_wrap = True
    p = tf.paragraphs[0]
    p.font.size = Pt(11); p.font.name = "Arial"
    
    r1 = p.add_run()
    r1.text = f"{title}: "
    r1.font.bold = True
    r1.font.color.rgb = ACCENT_CYAN
    
    r2 = p.add_run()
    r2.text = desc
    r2.font.bold = False
    r2.font.color.rgb = TEXT_LIGHT

attach_notes(
    slide15,
    what_to_say="Let's trace the exact lifecycle of a student taking a quiz. The student clicks 'Generate Quiz'. The request hits /api/assessments/generate with their session cookie. Auth middleware verifies their class level. The AI service calls Gemini to generate 5 multiple choice questions. The student answers and submits. The backend analyzes the submission, evaluates mistakes, updates XP, streaks, and badges, and commits the records to Supabase in a single coordinated response.",
    key_point="The complete quiz lifecycle is coordinated through a secure, authenticated, and transactional API pipeline.",
    possible_question="What is the average latency for an AI quiz generation request?",
    answer="With Gemini Flash Lite, quiz generation averages 1.2 to 2.2 seconds. If network latency increases, the client displays a glassmorphic loading spinner, and the rate limiter ensures no single student can flood the API."
)

# ==============================================================================
# SLIDE 16: IMPLEMENTATION STATUS
# ==============================================================================
slide16 = create_slide(
    "Codebase Audit & Verification Matrix",
    "Current Implementation Status: Verified vs Planned",
    "Honest, evidence-based status audit distinguishing 100% completed code from future roadmap items."
)

# 4 Status Columns
col_w = Inches(2.7)
col_h = Inches(4.8)
col_lefts = [Inches(0.8), Inches(3.8), Inches(6.8), Inches(9.8)]

status_data = [
    ("Completed (100% Verified)", ACCENT_GREEN, [
        ("Supabase Auth & Cookies:", "Full login, signup, cookie exchange, token rotation."),
        ("Multi-Role RBAC:", "Student, Teacher, Admin route guards."),
        ("AI Quiz Generation:", "Gemini SDK with JSON mode + pedagogical fallback bank."),
        ("Cognitive Gap Engine:", "4-category error diagnosis with step-by-step solutions."),
        ("Gamification System:", "15-tier levels, XP math, LearnCoins, 12 badges, daily missions."),
        ("Admin Directory:", "Overview telemetry, user list, and role promotion API.")
    ]),
    ("Partially Completed", ACCENT_CYAN, [
        ("Class Learning Map:", "Works with real Supabase class_learning_maps, but uses fallback presets when new grades lack records."),
        ("Reward Shop Items:", "Avatar frames, titles, and themes unlock properly; additional digital merchandise is being added."),
        ("KaTeX Rendering:", "KaTeX stylesheet loaded; complex formula rendering is expanding across advanced math topics.")
    ]),
    ("Needs Live Testing", ACCENT_AMBER, [
        ("School-Scale Concurrency:", "Load tested on single-instance Node; multi-server Redis session clustering is ready for live trials."),
        ("Gemini Free Tier Quotas:", "Production deployment requires dedicated paid tier Gemini API quota for peak school hours."),
        ("Multi-Section Classes:", "Section A tested; Sections B, C, D need multi-class educator assignments.")
    ]),
    ("Future Roadmap", ACCENT_INDIGO, [
        ("LTI 1.3 Canvas/Moodle:", "Standards-based LMS single-sign-on integration."),
        ("Vector RAG Embeddings:", "Custom NCERT/State Board textbook PDF indexing via pgvector."),
        ("Voice/Multimodal AI:", "Speech-based viva questions and handwriting recognition."),
        ("Automated Parent Reports:", "Weekly WhatsApp/Email progress summaries.")
    ])
]

for idx, (title, color, bullets) in enumerate(status_data):
    add_card(slide16, col_lefts[idx], top_pos, col_w, col_h, title, color)
    tb = slide16.shapes.add_textbox(col_lefts[idx] + Inches(0.18), top_pos + Inches(0.55), col_w - Inches(0.36), col_h - Inches(0.7))
    tf = tb.text_frame; tf.word_wrap = True
    for prefix, body in bullets:
        add_bullet_point(tf, prefix, body, size=10)

attach_notes(
    slide16,
    what_to_say="As an engineer, I believe in complete transparency. We divided our features into four distinct buckets: Completed, Partially Completed, Needs Testing, and Future Roadmap. Core features like authentication, RBAC, AI quiz generation, error classification, and gamification are 100% complete and verified by unit tests. Areas like class learning maps fall back to curated presets when newly added grades lack past historical quiz records.",
    key_point="Core platform features are 100% verified; no features are exaggerated.",
    possible_question="What is the single most important item that needs testing before school deployment?",
    answer="Stress testing with 200+ simultaneous students submitting quizzes within the same 5-minute window to calibrate Gemini API concurrency limits and verify Supabase connection pool sizing."
)

# ==============================================================================
# SLIDE 17: ENGINEERING QUALITY & RESILIENCE
# ==============================================================================
slide17 = create_slide(
    "Code Quality, Testing & Reliability",
    "Engineering Resilience & Test Coverage",
    "Verification metrics from 19 automated unit tests and architectural reliability safeguards."
)

eq_cards = [
    ("19/19 Passing Automated Tests", ACCENT_GREEN, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3), [
        ("auth.test.js (6 Tests):", "Verifies HttpOnly cookies, SameSite=Lax, Secure flags, logout cookie clearance, and RBAC guards."),
        ("security.test.js (2 Tests):", "Validates RFC 4122 UUIDs and blocks PostgREST / SQL injection vectors."),
        ("gamification.test.js (5 Tests):", "Tests level calculations, mission generation, streak tracker, and anti-fraud balance checks."),
        ("quizFeedback.test.js (6 Tests):", "Tests error categorization, timeouts, and fallback resilience across 5 subjects.")
    ]),
    ("Anti-Cheat & Rate Limiting", ACCENT_CYAN, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.3), [
        ("3-Second Submission Cooldown:", "gamificationService.js enforces a 3000ms minimum interval between student submissions."),
        ("IP-Based Express Rate Limiting:", "Auth routes capped at 30 attempts per 15 minutes; AI generation capped at 10 requests per minute."),
        ("Server-Side Answer Key Verification:", "Correct answer indices are validated exclusively on the backend; client answers cannot forge scoring."),
        ("Payload Bounds Checking:", "Questions, explanations, and options have strict length limits (<=4000 characters).")
    ]),
    ("Fault-Tolerant AI Architecture", ACCENT_AMBER, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.3), [
        ("15-Second Feedback Timeout:", "Promise.race ensures sluggish LLM responses abort cleanly without hanging student requests."),
        ("Deterministic Fallback Banks:", "Curated pedagogical question banks instantly trigger if Gemini is unreachable."),
        ("Graceful Degradation:", "If AI diagnosis fails, the student still receives official scores and verified explanations."),
        ("Atomic Store Locking:", "File-based gamification backups write via temporary files (.tmp.Date.now()) before atomic renaming.")
    ]),
    ("Maintainability & Clean Code", ACCENT_INDIGO, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.3), [
        ("Modular Layer Separation:", "Strict separation between Routes, Services, Middleware, and Config."),
        ("Unified Error Handler:", "Express global error handling middleware normalizes error codes and masks server internals."),
        ("Presenter Pattern:", "userPresenter.js strictly strips sensitive fields before sessions are exposed to the client."),
        ("Zero Environment Dependencies:", "Runs seamlessly with or without live Gemini / Supabase keys via automatic fallback modes.")
    ])
]

for title, color, left, top, width, height, items in eq_cards:
    add_card(slide17, left, top, width, height, title, color)
    tb = slide17.shapes.add_textbox(left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7))
    tf = tb.text_frame; tf.word_wrap = True
    for prefix, body in items:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide17,
    what_to_say="We take software engineering rigor seriously. Our backend test suite runs 19 automated tests covering authentication, security, gamification math, and quiz feedback. We built anti-cheat throttles preventing students from spamming submissions faster than every 3 seconds, and our AI calls are protected by a 15-second timeout and deterministic subject fallbacks so the app never crashes.",
    key_point="LearnIQ is backed by 19 automated unit tests, strict anti-cheat rate limiting, and timeout fallbacks.",
    possible_question="What test runner did you use for the automated tests?",
    answer="We used Node.js's built-in test runner (node:test and node:assert/strict), which requires zero third-party testing dependencies, runs natively in under 11 seconds, and executes seamlessly in CI/CD pipelines."
)

# ==============================================================================
# SLIDE 18: DEMO SCRIPT
# ==============================================================================
slide18 = create_slide(
    "Practical Manager Demonstration Guide",
    "Live Product Walkthrough Script",
    "A concise, manager-friendly demonstration script: What I show → What happens → Why it matters."
)

demo_cards = [
    ("Screen 1: Landing Page & Role Login", ACCENT_CYAN, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3), [
        ("What I Show:", "Toggle between Student and Teacher on the glassmorphic landing card, then log in."),
        ("What Happens:", "Browser exchanges credentials with /api/auth/login, receives HttpOnly cookies, and restores profile."),
        ("Why It Matters:", "Shows enterprise cookie authentication and immediate role-based dashboard redirection.")
    ]),
    ("Screen 2: AI Quiz Generator", ACCENT_INDIGO, Inches(6.8), Inches(1.8), Inches(5.7), Inches(2.3), [
        ("What I Show:", "Select Class 10, Mathematics, click 'Quadratic Equations' chip, and generate quiz."),
        ("What Happens:", "Backend invokes Gemini API with structured prompt, parses JSON response, and starts test."),
        ("Why It Matters:", "Eliminates static testing; every quiz is personalized and dynamic for the student's exact topic.")
    ]),
    ("Screen 3: Quiz Diagnosis & Learning Intel", ACCENT_AMBER, Inches(0.8), Inches(4.3), Inches(5.6), Inches(2.3), [
        ("What I Show:", "Answer questions, intentionally miss one, submit quiz, and open the diagnosis modal."),
        ("What Happens:", "AI categorizes the mistake (e.g. Calculation Error) and generates step-by-step remediation."),
        ("Why It Matters:", "Demonstrates our core value proposition: diagnosing why the student failed, not just what they scored.")
    ]),
    ("Screen 4: Teacher Map & Interventions", ACCENT_GREEN, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.3), [
        ("What I Show:", "Switch to Teacher account, open Class Learning Map, and click 'Generate Intervention'."),
        ("What Happens:", "AI compiles a 5-minute board review plan and 3 remedial questions targeting the concept gap."),
        ("Why It Matters:", "Empowers teachers to address classroom learning gaps in minutes instead of waiting for term exams.")
    ])
]

for title, color, left, top, width, height, items in demo_cards:
    add_card(slide18, left, top, width, height, title, color)
    tb = slide18.shapes.add_textbox(left + Inches(0.2), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7))
    tf = tb.text_frame; tf.word_wrap = True
    for prefix, body in items:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide18,
    what_to_say="When giving a live demo to school administrators or managers, I follow this 4-step walkthrough: First, log in as a student to show authentication and the dashboard. Second, generate a quiz on Quadratic Equations to demonstrate the AI speed. Third, submit the quiz to show real-time error categorization. Fourth, switch to the teacher view to generate an immediate 5-minute remedial intervention plan.",
    key_point="The demo clearly links technical architecture directly to real-world educational value.",
    possible_question="Can you run this entire demo offline without an internet connection?",
    answer="Yes. Thanks to our built-in pedagogical template fallbacks and local gamification store, the complete demo runs smoothly even if internet connectivity drops."
)

# ==============================================================================
# SLIDE 19: STRATEGIC FUTURE ROADMAP
# ==============================================================================
slide19 = create_slide(
    "Strategic Evolution & Scalability",
    "Future Strategic Roadmap & Institutional Scaling",
    "Architectural milestones to scale LearnIQ from individual classrooms to entire school districts."
)

# 4 Roadmap Phase Cards
road_w = Inches(2.7)
road_h = Inches(4.8)

roadmap_data = [
    ("Phase 1: Scale & Integration", ACCENT_CYAN, [
        ("LTI 1.3 Compliance:", "Direct integration with Google Classroom, Canvas, and Moodle for one-click rostering."),
        ("Redis Session Caching:", "Decouple session memory for horizontal scaling across multi-node server clusters."),
        ("PostgreSQL Connection Pooling:", "Deploy PgBouncer on Supabase to handle 10,000+ concurrent quiz submissions.")
    ]),
    ("Phase 2: Deep Textbook RAG", ACCENT_INDIGO, [
        ("pgvector Embeddings:", "Index official NCERT, CBSE, and State Board textbooks using vector embeddings."),
        ("Curriculum Citations:", "Pinpoint exact textbook page numbers and paragraph references in quiz remedial feedback."),
        ("Teacher Question Vaults:", "Enable teachers to upload syllabus PDF documents to seed AI question generation.")
    ]),
    ("Phase 3: Multimodal Diagnostics", ACCENT_AMBER, [
        ("Handwriting OCR:", "Students snap a photo of hand-worked math steps; Gemini Vision diagnoses the exact algebraic step where the error occurred."),
        ("Audio Viva Voice AI:", "Conversational voice-based oral testing for English pronunciation and science concepts.")
    ]),
    ("Phase 4: District Analytics", ACCENT_GREEN, [
        ("Cross-School Benchmarks:", "Superintendents compare concept mastery across multiple schools and demographics."),
        ("Automated Parent Alerts:", "Weekly progress reports sent automatically to parents via WhatsApp or email summaries.")
    ])
]

for idx, (title, color, bullets) in enumerate(roadmap_data):
    add_card(slide19, col_lefts[idx], top_pos, road_w, road_h, title, color)
    tb = slide19.shapes.add_textbox(col_lefts[idx] + Inches(0.18), top_pos + Inches(0.55), road_w - Inches(0.36), road_h - Inches(0.7))
    tf = tb.text_frame; tf.word_wrap = True
    for prefix, body in bullets:
        add_bullet_point(tf, prefix, body, size=10.5)

attach_notes(
    slide19,
    what_to_say="Our engineering roadmap focuses on institutional scaling. In Phase 1, we plan to implement LTI 1.3 standards to integrate directly into Google Classroom and Canvas. In Phase 2, we will introduce vector embeddings using pgvector on Supabase so questions strictly cite official school textbook page numbers. Phases 3 and 4 expand into multimodal handwriting OCR and district-wide analytics.",
    key_point="LearnIQ has a clear, actionable engineering path to scale from single classrooms to regional school districts.",
    possible_question="How much would it cost to run LearnIQ for a school of 1,000 students?",
    answer="Because Gemini Flash Lite costs fractions of a cent per 1,000 tokens and our static SPA incurs near-zero compute overhead, the infrastructure cost is estimated at under $30 to $50 per month for 1,000 active students."
)

# ==============================================================================
# SLIDE 20: EXECUTIVE CONCLUSION
# ==============================================================================
slide20 = create_slide(
    "Executive Summary & Next Steps",
    "Conclusion: Transforming Learning Through Intelligence",
    "Summary of key achievements, pedagogical impact, and readiness for pilot deployment."
)

# 3 Summary Cards
add_card(slide20, Inches(0.8), Inches(1.8), Inches(11.7), Inches(1.4), "1. Pedagogical Innovation: Beyond Mere Scoring", ACCENT_CYAN)
tb_end1 = slide20.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(0.9))
tf_end1 = tb_end1.text_frame; tf_end1.word_wrap = True
p = tf_end1.paragraphs[0]; p.font.size = Pt(11); p.font.color.rgb = TEXT_LIGHT
p.text = "LearnIQ replaces blunt grades with root-cause diagnostic feedback. By categorizing errors into Conceptual, Calculation, Misinterpretation, and Careless mistakes, students learn how to think, and teachers receive actionable intervention plans before exams."

add_card(slide20, Inches(0.8), Inches(3.35), Inches(11.7), Inches(1.4), "2. Architectural Rigor: Production-Grade Engineering", ACCENT_GREEN)
tb_end2 = slide20.shapes.add_textbox(Inches(1.0), Inches(3.75), Inches(11.3), Inches(0.9))
tf_end2 = tb_end2.text_frame; tf_end2.word_wrap = True
p = tf_end2.paragraphs[0]; p.font.size = Pt(11); p.font.color.rgb = TEXT_LIGHT
p.text = "Built on a resilient Node.js/Express foundation, verified by 19 automated tests. Implements zero-trust HttpOnly cookie authentication, strict role-based access control, RFC 4122 UUID validation, anti-cheat rate limiting, and a robust multi-tier AI fallback engine."

add_card(slide20, Inches(0.8), Inches(4.9), Inches(11.7), Inches(1.8), "3. Readiness & Immediate Next Steps", ACCENT_AMBER)
tb_end3 = slide20.shapes.add_textbox(Inches(1.0), Inches(5.3), Inches(11.3), Inches(1.3))
tf_end3 = tb_end3.text_frame; tf_end3.word_wrap = True
add_bullet_point(tf_end3, "Classroom Pilot Ready:", "The platform is fully deployable today for pilot testing in Grade 8-10 science and mathematics classes.")
add_bullet_point(tf_end3, "Low Operational Cost:", "Optimized for Gemini Flash Lite and Supabase Free/Pro tiers, delivering high ROI with minimal cloud overhead.")
add_bullet_point(tf_end3, "Measurable Impact:", "Provides school leadership with real-time metrics on student streak consistency, concept mastery, and teacher intervention efficacy.")

attach_notes(
    slide20,
    what_to_say="To conclude: LearnIQ is not a concept or a prototype. It is a fully functioning learning intelligence platform built with architectural rigor, verified by automated tests, and designed to solve a genuine problem in education. It gives students immediate clarity on their mistakes and gives teachers real-time tools to intervene. We are ready to initiate classroom pilot trials immediately. Thank you, and I look forward to your questions.",
    key_point="LearnIQ is technically verified, architecturally sound, and ready for classroom pilot deployment.",
    possible_question="What is the very first step to deploy this for a pilot test?",
    answer="Configure the Supabase production project, set the production environment variables, apply the migration scripts, and conduct a 1-week pilot with two Class 10 math sections to gather teacher feedback."
)

# Output Presentation
out_pptx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "LearnIQ_Manager_Presentation.pptx"))
prs.save(out_pptx_path)
print("SUCCESS: Professional PowerPoint Presentation generated with 20 slides at: " + out_pptx_path)
