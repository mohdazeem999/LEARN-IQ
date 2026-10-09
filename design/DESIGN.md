# LearnIQ — Product Design Document

**Scope decision:** LearnIQ is the school-learning product for Classes 5–12. The earlier career-development concept is out of scope for this MVP.

## MVP
Student sign-up/login, onboarding, dashboard, assessment setup, AI-assisted question generation, question flow, results with learning-error categories, next learning action, and teacher class-level learning-gap view. Include role-aware navigation plus loading, empty, validation, error and success states. Desktop and mobile are supported.

## Roles
- **Student:** S01–S07.
- **Teacher:** S08.
- **Admin/system:** access-control plumbing only; no separate user-facing MVP journey.

## Screen inventory
| ID | Screen | Status |
|---|---|---|
| S01 | Sign up / Login | Implemented UI; end-to-end verification required |
| S02 | Student onboarding | Planned/design-first |
| S03 | Student dashboard | Implemented UI; partially verified |
| S04 | Assessment setup | Implemented UI; acceptance verification required |
| S05 | Question flow | Implemented UI; partially verified |
| S06 | Results | Implemented UI; partially verified |
| S07 | Next learning action | Planned/design-first |
| S08 | Teacher class map | Implemented UI; data-source verification required |

## Main journeys
**Student:** S01 → S02 → S03 → S04 → S05 → S06 → S07 → S03.

**Teacher:** S01 → role-aware access → S08.

Back/cancel: S02→S01; S04 cancel→S03; S05 previous/exit→previous or confirmation; S06 review→S05; S07 back→S03; S08 back→role landing.

## Navigation
Desktop: persistent sidebar. Mobile: menu. Student navigation is Dashboard, Assessment, Learning Progress, Profile. Teacher navigation is Class Learning Map and Profile/session controls. Rankings, Rewards and Challenges are removed from the agreed MVP.

## Architecture / data flow
Responsive UI → Authentication + Role Access → Assessment API / Student & Teacher APIs → AI Question Service / learning data → Results + error categories → Next learning action.

The repository contains frontend HTML/CSS/JS plus Node/Express routes, Supabase client configuration, assessment/auth/student/teacher routes, AI service and SQL schema. File presence is not treated as proof of production-complete integration.

## Excluded
Career-development features, public rankings, rewards marketplace/redemption, production XP/streak economy, payments/subscriptions, social/community, parent portal, and unsupported claims that sample XP/rankings/recommendations already work.

## Acceptance criteria
1. S01 validates credentials and routes by role.
2. S02 captures class/subject/goal with save/back/error states.
3. S03 provides a clear learning starting point without unsupported XP/ranking claims.
4. S04 validates required parameters and exposes loading/generation error/retry/cancel.
5. S05 supports progress, previous/next, exit confirmation and retry on save failure.
6. S06 shows score and learning-error categories.
7. S07 gives one clear next action or an explicit unavailable state.
8. S08 shows class-level learning gaps and loading/empty/error states.
9. S01–S08 have consistent desktop/mobile visual behavior.
10. No excluded feature is presented as MVP functionality.

## Visual system
Inter typography; LearnIQ blue primary actions; white cards on a light blue/gray background; dark navy text; restrained rounded controls; consistent spacing and clear hierarchy.
