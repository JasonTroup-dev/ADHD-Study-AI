# ADHD Study AI v1 launch scope

Status: frozen baseline  
Decision date: 2026-08-28  
Owner: ADHD Study AI  
Review trigger: after the first 20 paid users or 30 days of paid-beta usage, whichever comes first

This document is the product, pricing, and policy boundary for the first paid
release. Later phases may change implementation details, but they must not add
new paid promises without an explicit scope review.

## Launch offer

ADHD Study AI launches with two plans:

| Plan | Price | Billing |
| --- | ---: | --- |
| Free | $0 | No payment method required |
| Pro monthly | $11.99 USD | Renews monthly |
| Pro annual | $119.99 USD | Renews annually; approximately two months free |

There is one Pro product with monthly and annual prices. V1 has no free trial,
coupon system, add-ons, usage billing, team accounts, lifetime plan, or education
license.

The annual price is the economic constraint for quota design because its
recognized monthly revenue is lower than the monthly plan's.

## Margin guardrails

Paddle's published pay-as-you-go Checkout fee is 5% + $0.50 per transaction.
At the prices above:

| Contract | Gross revenue per recognized month | Paddle fee per recognized month | Revenue after Paddle |
| --- | ---: | ---: | ---: |
| Monthly | $11.99 | $1.10 | $10.89 |
| Annual | $10.00 | $0.54 | $9.46 |

The operating target is at least 70% average gross margin across all Pro
subscribers. An unusually active subscriber may have a lower individual margin;
the product should optimize for retention and value while keeping the overall
subscriber portfolio sustainable. The initial monthly variable-cost envelope
per Pro subscriber is:

| Cost | Target | Hard planning limit |
| --- | ---: | ---: |
| OpenAI API | $1.50 | $2.50 |
| Hosting, storage, and monitoring | $0.40 | $0.40 |
| Refund/chargeback reserve | $0.30 | $0.30 |
| Amortized Paddle fee on annual plan | $0.54 | $0.54 |
| Total | $2.74 | $3.74 |

At the $1.50 target AI cost, both plans retain approximately 72% gross margin
before fixed business expenses. A subscriber who reaches the $2.50 emergency
ceiling retains approximately 63% gross margin. The emergency case is acceptable
when portfolio-wide average margin remains at least 70%. This is a planning
model, not an accounting policy.

OpenAI usage is currently emitted as structured `ai.request` records to server
stdout. The repository contains pricing-aware per-request telemetry, but it does
not contain a historical production dataset or a per-user/month aggregate. For
that reason, the launch quotas below are deliberately conservative. Before the
public launch, production metrics must be queryable by workflow, user, plan, and
billing month without logging coursework content or raw user identifiers.

## AI limits

Limits reset at the start of each subscriber billing period for Pro and each UTC
calendar month for Free. A "tutor reply" is one completed response from either
the general AI tutor or the guided study-session tutor. Failed or refused model
requests do not consume a monthly allowance, although short-term abuse controls
may still reject repeated attempts.

| AI capability | Free per month | Pro per billing period |
| --- | ---: | ---: |
| Tutor replies, general and guided combined | 20 | 250 |
| Study-guide generations | 1 | 20 |
| Flashcard-set generations | 1 | 20 |
| Syllabus analyses | 1 | 15 |
| Class-material analyses | 2 | 40 |
| Assignment-guide generations | 2 | 40 |

Additional enforcement rules:

- Keep short-term hourly rate limits to prevent bursts.
- Target an average Pro AI cost of $1.50 or less and set a $2.50 emergency
  ceiling per user per billing period. The cost ceiling is a safety backstop,
  not a user-facing plan promise.
- Warn internally when a Pro user reaches $2.00. If published usage remains,
  preserve the user's allowance by reducing attachment context, using the
  approved lower-cost model for suitable workflows, or applying another
  quality-tested cost control before denying service.
- The emergency cost ceiling must not be presented as an additional, surprise
  user-facing limit. Published capability counters are the customer contract.
- Cap Free AI cost at $0.15 per user per calendar month.
- Add a global monthly OpenAI expenditure kill switch before accepting paid
  traffic.
- Denials must distinguish an hourly rate limit, a monthly plan limit, and a
  temporary global safety shutdown.
- No plan may be described as "unlimited."

The current quota implementation is not the launch contract. It only covers
general tutor chat, tutor-file parsing, flashcard generation, and study-guide
generation with hourly counters. Guided tutoring, assignment guides, syllabus
analysis, and class-material analysis currently have no monthly entitlement
counter. Phase 5 must replace this gap with one centralized entitlement and
usage calculation.

## Feature entitlements

The Free plan is a useful organizer with a small AI sample. Pro sells sustained,
coursework-grounded AI assistance rather than basic access to the student's own
data.

| Capability | Free | Pro |
| --- | --- | --- |
| Account, classes, assignments, planner, and calendar | Included | Included |
| Manual tasks and manual flashcard sets | Included | Included |
| Study timers and non-AI session tracking | Included | Included |
| AI tutor | Starter allowance | Higher monthly allowance |
| Tutor file attachments and coursework-grounded answers | Not included | Included |
| AI study guides | Starter allowance | Higher monthly allowance |
| AI-generated flashcards | Starter allowance | Higher monthly allowance |
| Syllabus and class-material analysis | Starter allowance | Higher monthly allowance |
| Guided AI assignment study sessions | Starter allowance | Higher monthly allowance |
| Billing portal, invoices, payment updates, and cancellation | Not applicable | Included |

Users retain access to content they created while subscribed after downgrading.
Downgrade removes Pro generation allowances; it does not hold the user's classes,
assignments, guides, or flashcards hostage.

## Explicitly excluded from the paid launch promise

The following features are not part of v1 pricing copy, onboarding promises, or
the definition of Pro:

- Practice-quiz generation and interactive feedback
- Assignment breakdown utility
- Reading-time estimator
- Dedicated distraction-reduced study mode
- Deeper progress insights beyond the current implemented views
- Teams, shared workspaces, institutional administration, or parent accounts
- Trials, coupons, add-ons, usage billing, or custom plans

Practice quizzes are excluded because the current branch has only the material
selection screen. It does not yet have generation, answering, feedback, scoring,
persistence, quota enforcement, or automated tests. It must remain hidden from
launch marketing and pricing until that complete flow passes the same security,
quota, and accessibility bar as the existing AI tools.

Existing "coming soon" utility cards are product-roadmap previews only. They
must not appear on the pricing page or in Paddle product descriptions. Remove
them from the authenticated launch UI if usability testing shows that they make
the paid product feel unfinished.

## Subscription-state policy

| Paddle state | Product behavior |
| --- | --- |
| `active` | Pro access |
| `trialing` | Not used in v1; if encountered, Pro access |
| `past_due` | Immediate Free access with a persistent payment warning and payment-update action |
| Future scheduled cancellation | Pro through the paid period end |
| `paused` | Free access |
| `canceled` | Free access after the paid period ends, or immediately when cancellation is immediate |
| No subscription | Free access |

There is no unpaid Pro grace period in v1. A failed payment moves the account to
Free as soon as a verified Paddle webhook reports `past_due`; saved user content
remains available under the normal Free rules. Payment recovery restores Pro
after a verified Paddle webhook. The app must never infer paid access from a
checkout return URL or browser-editable user metadata.

## Refund and cancellation policy

- Customers may cancel at any time through the Paddle-hosted customer portal.
  Cancellation normally takes effect at the end of the paid billing period.
- Offer a refund on a customer's first payment when requested within 14 days,
  subject to fraud or refund-abuse review.
- Renewal payments and later purchases are otherwise non-refundable except
  where required by applicable law or approved case-by-case for a service
  failure.
- Approved refunds end the corresponding Pro access when Paddle reports the
  refund.
- Paddle processes refunds to the original payment method. Do not send money
  directly to the buyer.
- Mandatory consumer rights override this policy. Final public wording requires
  legal review and must remain consistent with Paddle's current buyer terms and
  refund policy.

## Audience, geography, and support

- Minimum age: 18. The initial service is for adult college and university
  students. Do not knowingly accept accounts for minors in v1.
- Launch market: United States only, in English, priced in USD.
- Expansion to Canada, the United Kingdom, Australia, New Zealand, the EEA, or
  other markets requires a policy and support review, even though Paddle can
  handle sales-tax collection in many markets.
- Product and account support: `support@adhdstudyai.com`.
- Billing support: `billing@adhdstudyai.com`, with Paddle buyer support available
  for Paddle-managed transactions.
- Response target: acknowledge support requests within two business days,
  Monday through Friday excluding U.S. federal holidays.
- Do not use a public GitHub issue as the primary support channel for coursework,
  account, privacy, or billing problems.

The two private email addresses must be provisioned and tested before Paddle
live-account review.

## Paid-plan promise

Pro is described as:

> Coursework-grounded AI tutoring, study guides, flashcards, syllabus analysis,
> and guided study support with clear monthly limits, while your planning tools
> and saved study content remain available on Free.

Do not describe Pro as unlimited, as a replacement for a teacher or clinician,
or as guaranteeing grades, academic outcomes, or error-free answers.

## Phase 1 exit criteria

Phase 1 is complete when the owner accepts this baseline and the following are
true:

- Prices and annual discount are approved.
- The AI allowances, $1.50 target, and $2.50 per-user emergency ceiling are
  approved.
- Practice quizzes and all other incomplete utilities are excluded from launch
  pricing and marketing.
- Immediate Free fallback for `past_due`, with no unpaid Pro grace period, is
  approved.
- The refund baseline is sent for legal review before publication.
- The 18+ and U.S.-only launch restrictions are approved.
- The support and billing inboxes are assigned for provisioning in Phase 2.
- Phase 5 includes a required telemetry-calibration checkpoint after the first
  20 paid users or 30 days.

## Source notes

- Paddle pricing: https://www.paddle.com/pricing (accessed 2026-08-28)
- Paddle refund policy: https://www.paddle.com/legal/refund-policy (accessed 2026-08-28)
- Paddle seller refund process: https://www.paddle.com/help/manage/your-customers/how-do-i-issue-refunds (accessed 2026-08-28)
- OpenAI model pricing: https://developers.openai.com/api/docs/models/gpt-5-mini and https://developers.openai.com/api/docs/models/gptbase (accessed 2026-08-28)
