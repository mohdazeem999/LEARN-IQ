# LearnIQ — MVP Visual Mockups

## Purpose

This document records the visual mockups for the agreed LearnIQ MVP. The MVP is focused on a school-learning platform for Classes 5–12.

**Important:** The images below are design mockups. A mockup does not mean that the corresponding feature is fully implemented or connected to production data.

## Design Source

Google Stitch design reference:
https://stitch.withgoogle.com/preview/4934162167222285533?node-id=7f1895c89ade40cda6f3aaa68bec87cd

## Screen Inventory

| ID | Screen | Role | Status |
|---|---|---|---|
| S01 | Sign Up / Login | Student / Teacher | Implemented UI; end-to-end verification required |
| S02 | Student Onboarding | Student | Planned / design-first |
| S03 | Student Dashboard | Student | Implemented UI; data/acceptance verification required |
| S04 | Assessment Setup | Student | Implemented UI; acceptance verification required |
| S05 | Question Flow | Student | Implemented UI; partial verification |
| S06 | Assessment Results | Student | Implemented UI; partial verification |
| S07 | Next Learning Action | Student | Planned / design-first |
| S08 | Teacher Class Map | Teacher | Implemented UI; data-source verification required |

## Student MVP Journey

`S01 → S02 → S03 → S04 → S05 → S06 → S07 → S03`

1. Student signs up or logs in.
2. Student completes onboarding.
3. Student reaches the dashboard.
4. Student selects an assessment.
5. Student answers questions.
6. Student receives results and learning-intelligence information.
7. Student receives the next learning action.
8. Student returns to the dashboard and continues learning.

## Teacher MVP Journey

`S01 → Teacher Role → S08`

A teacher signs in and accesses the class learning map. The teacher view is separate from the student learning flow.

## Navigation and Interaction

- Desktop uses the existing LearnIQ navigation/sidebar pattern.
- Mobile uses a compact navigation/menu pattern.
- Back and cancel actions return the user to the previous logical step.
- Assessment setup includes validation before generation.
- Question flow supports moving through the assessment and handling submission errors.
- Results allow the student to review the assessment and continue to the next action.

## State Coverage

| Screen | Loading | Empty / First Use | Validation | Error | Success |
|---|---|---|---|---|---|
| S01 | — | ✓ | ✓ | ✓ | ✓ |
| S02 | — | ✓ | ✓ | ✓ | ✓ |
| S03 | ✓ | ✓ | — | ✓ | ✓ |
| S04 | ✓ | — | ✓ | ✓ | ✓ |
| S05 | ✓ | — | ✓ | ✓ | ✓ |
| S06 | ✓ | ✓ | — | ✓ | ✓ |
| S07 | ✓ | ✓ | — | ✓ | ✓ |
| S08 | ✓ | ✓ | — | ✓ | ✓ |

## Visual Mockups

### S01 — Sign Up / Login

**Desktop**

![S01 Sign Up / Login desktop](docs/mockups/S01-login-desktop.png)

**Mobile**

![S01 Sign Up / Login mobile](docs/mockups/S01-login-mobile.png)

### S02 — Student Onboarding

**Desktop**

![S02 Student Onboarding desktop](docs/mockups/S02-onboarding-desktop.png)

**Mobile**

![S02 Student Onboarding mobile](docs/mockups/S02-onboarding-mobile.png)

### S03 — Student Dashboard

**Desktop**

![S03 Student Dashboard desktop](docs/mockups/S03-dashboard-desktop.png)

**Mobile**

![S03 Student Dashboard mobile](docs/mockups/S03-dashboard-mobile.png)

### S04 — Assessment Setup

**Desktop**

![S04 Assessment Setup desktop](docs/mockups/S04-assessment-desktop.png)

**Mobile**

![S04 Assessment Setup mobile](docs/mockups/S04-assessment-mobile.png)

### S05 — Question Flow

**Desktop**

![S05 Question Flow desktop](docs/mockups/S05-question-desktop.png)

**Mobile**

![S05 Question Flow mobile](docs/mockups/S05-question-mobile.png)

### S06 — Assessment Results

**Desktop**

![S06 Assessment Results desktop](docs/mockups/S06-results-desktop.png)

**Mobile**

![S06 Assessment Results mobile](docs/mockups/S06-results-mobile.png)

### S07 — Next Learning Action

**Desktop**

![S07 Next Learning Action desktop](docs/mockups/S07-next-action-desktop.png)

**Mobile**

![S07 Next Learning Action mobile](docs/mockups/S07-next-action-mobile.png)

### S08 — Teacher Class Map

**Desktop**

![S08 Teacher Class Map desktop](docs/mockups/S08-teacher-desktop.png)

**Mobile**

![S08 Teacher Class Map mobile](docs/mockups/S08-teacher-mobile.png)

## Mockup vs. Implementation

The current repository contains an existing LearnIQ implementation with student and teacher interfaces, authentication work, quiz-generation UI, learning-intelligence UI, profile/progress elements, and related interface components.

The mockups in this folder define the agreed MVP experience and should be treated as the design reference. Existing sample interface elements such as XP, rankings, rewards, challenges, or AI recommendation examples must not be interpreted as fully implemented MVP functionality unless they are separately verified.

### Design-first areas

- S02 Student Onboarding
- S07 Next Learning Action
- Complete loading/empty/error/success behavior where implementation is not yet verified

### Verification required

- Authentication and role-based access end-to-end
- Assessment data flow
- Results persistence and accuracy
- Teacher class-map data source
- Responsive behavior across supported screen sizes

## Excluded from the Agreed MVP

The following should not be presented as required MVP functionality:

- Career-development platform features
- Rankings as a core MVP requirement
- Rewards as a core MVP requirement
- Challenges as a core MVP requirement
- Unverified AI recommendations presented as working functionality

## File Structure

```text
LearnIQ/
├── DESIGN.md
├── MOCKUPS.md
└── docs/
    └── mockups/
        ├── S01-login-desktop.svg
        ├── S01-login-mobile.svg
        ├── S02-onboarding-desktop.svg
        ├── S02-onboarding-mobile.svg
        ├── S03-dashboard-desktop.svg
        ├── S03-dashboard-mobile.svg
        ├── S04-assessment-desktop.svg
        ├── S04-assessment-mobile.svg
        ├── S05-question-desktop.svg
        ├── S05-question-mobile.svg
        ├── S06-results-desktop.svg
        ├── S06-results-mobile.svg
        ├── S07-next-action-desktop.svg
        ├── S07-next-action-mobile.svg
        ├── S08-teacher-desktop.svg
        └── S08-teacher-mobile.svg
```

## Review Checklist

- [x] MVP scope documented
- [x] Screen IDs assigned
- [x] Student journey documented
- [x] Teacher journey documented
- [x] Desktop mockups included
- [x] Mobile mockups included
- [x] Mockup assets stored under `docs/mockups/`
- [x] State coverage documented
- [x] Mockup vs. implementation distinction documented
- [x] Excluded/unverified functionality clearly identified
