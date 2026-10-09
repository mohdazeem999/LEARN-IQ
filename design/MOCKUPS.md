# LearnIQ — Full MVP Mockup Package

**Status:** Design evidence, not proof of implementation.  
**Design source:** https://stitch.withgoogle.com/preview/4934162167222285533?node-id=7f1895c89ade40cda6f3aaa68bec87cd

## Scope
The mockups cover the agreed school-learning MVP only. Career-development features, rankings, rewards and unsupported XP claims are excluded.

## Visual language
Inter, LearnIQ blue, white cards, light blue/gray canvas, dark navy text, consistent rounded controls and responsive spacing.

## Walkthrough
`S01 Login → S02 Onboarding → S03 Dashboard → S04 Assessment Setup → S05 Question Flow → S06 Results → S07 Next Learning Action → S03 Dashboard`

Teacher: `S01 Login → S08 Teacher Class Map`

## Screen mapping
| ID | Requirement |
|---|---|
| S01 | Sign-up/login, validation, error, protected access |
| S02 | Onboarding, save/back/error |
| S03 | Dashboard, empty/first-use, next action |
| S04 | Assessment setup, validation, loading/error/cancel |
| S05 | Question flow, progress, previous/next, exit/error |
| S06 | Results, score, learning-error categories, incomplete-analysis state |
| S07 | Next learning action, empty/error fallback |
| S08 | Teacher class map, loading/empty/error |

## Mockups

### S01 — Sign up / Login
**Mockup — desktop**

![S01 desktop](mockups/S01-login-desktop.svg)

**Mockup — mobile**

![S01 mobile](mockups/S01-login-mobile.svg)

### S02 — Student Onboarding
![S02 desktop](mockups/S02-onboarding-desktop.svg)

![S02 mobile](mockups/S02-onboarding-mobile.svg)

### S03 — Student Dashboard
![S03 desktop](mockups/S03-dashboard-desktop.svg)

![S03 mobile](mockups/S03-dashboard-mobile.svg)

### S04 — Assessment Setup
![S04 desktop](mockups/S04-assessment-desktop.svg)

![S04 mobile](mockups/S04-assessment-mobile.svg)

### S05 — Question Flow
![S05 desktop](mockups/S05-question-desktop.svg)

![S05 mobile](mockups/S05-question-mobile.svg)

### S06 — Results
![S06 desktop](mockups/S06-results-desktop.svg)

![S06 mobile](mockups/S06-results-mobile.svg)

### S07 — Next Learning Action
![S07 desktop](mockups/S07-next-action-desktop.svg)

![S07 mobile](mockups/S07-next-action-mobile.svg)

### S08 — Teacher Class Map
![S08 desktop](mockups/S08-teacher-desktop.svg)

![S08 mobile](mockups/S08-teacher-mobile.svg)

## State coverage
Loading, empty, validation, error/retry and success states are explicitly represented in the screen specifications. The mockup labels use fictional content.

## Mockup vs implementation review
The existing implementation has a richer navigation shell than the agreed MVP and currently contains sample XP, rankings, rewards and other surfaces. Those are **not** accepted as MVP functionality and should be removed or hidden from the final MVP journey.

Where implementation is already present:
- **S01:** working-area authentication UI; end-to-end verification still required.
- **S03:** dashboard UI exists; sample progress/XP values must not be presented as verified data.
- **S04/S05:** assessment generation/question UI exists; acceptance testing is required.
- **S06:** learning-intelligence/results concepts exist; verify data source and states.
- **S08:** teacher class-map UI exists; verify role restriction and data source.

Where design is ahead of implementation:
- **S02** onboarding.
- **S07** complete next-learning-action experience.
- Full state coverage across all screens.
- Clean MVP navigation without excluded features.

## Design-source note
The supplied Google Stitch exploration is retained as a design-source reference. This repository package is the reviewable exported mockup evidence; reviewers do not need special access to the source tool to inspect the SVG assets.
