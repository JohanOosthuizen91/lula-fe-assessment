# Frontend Assessment

## Context

You're building a dashboard for a credit operations team. The team reviews business credit assessments — they need to see which businesses have been assessed, how they scored, and what the underlying financials look like.

## What to build

Build a React application that lets a credit analyst:

- See a list of assessed businesses and their current status
- View the credit score and risk profile for a business
- Get a sense of the financial picture from the bank statement data
- See how the score breaks down across categories
- Spot which businesses need attention

There are no wireframes. Make reasonable layout and design decisions — we're interested in your judgment, not pixel perfection.

## API

The app should fetch data from a local json-server instance. To start it:

```bash
npm run api
```

This serves the following endpoints:

```
GET /businesses
GET /businesses/:id
GET /assessments
GET /assessments?businessId=:id
GET /creditReports?assessmentId=:id
GET /bankStatements?assessmentId=:id
GET /scoreItems?assessmentId=:id
```

## Getting started

```bash
npm install
npm run dev
```

Run both `npm run api` and `npm run dev` in separate terminals.

## Time limit

2 hours from your first commit. Commit regularly — we look at the commit history.

## Tools

Use whatever you'd normally use — Cursor, Claude, v0, Copilot. We expect you to. Part of what we're evaluating is how you work with AI tools, not whether you do. If you complete this without AI assistance, that's a flag against you, not for you.

## Submitting

1. Create a **private repo on your personal GitHub account**, push your work there
2. When done, send us:
   - Your repo link with `neil-lula` invited as a collaborator
   - A short screen recording (5-10 min) walking through your submission. Cover: what you built, the key decisions you made and why, how you used AI tools and what you asked them to do, and what you'd do differently with more time. We're not looking for polish — we're listening for how you think.

## Decisions and assumptions

The brief is deliberately open. Lula answered a few questions on 5 Oct 2026 (Andrea): the credit score has no fixed scale and the risk band comes pre-set; category scores have no weightings and read like 0–100; bank totals cover the whole period analysed, not a month; amounts are in rand; and proposing the "needs attention" criteria is part of the exercise. Everything else below is our own call, and says so.

| # | Assumption | Status |
|---|---|---|
| A1 | The credit score has no fixed scale. Show the number plus its band, with no gauge. | Confirmed by Lula |
| A2 | Category scores are out of 100, with no weightings. Bars out of 100 are allowed, labelled. They're never shown as parts of the overall score. | Lula: "read like 0–100" |
| A3 | Bank totals cover `monthsAnalysed`. Compare monthly averages only, and always show the period. | Confirmed by Lula |
| A4 | The currency is ZAR. | Confirmed by Lula |
| A5 | Credits are money in and debits are money out. The difference is "net movement", not profit. | Bank-statement convention |
| A6 | The current assessment is the newest by `createdDate`, with the highest id on a tie. | Our rule; tested |
| A7 | One credit report and one bank statement per assessment. If more come back, say so rather than guess. | Observed in the data, not guaranteed |
| A8 | A thin file makes the score less reliable. | Industry meaning |
| A9 | The attention rules below are our proposal. | Lula: part of the exercise |
| A10 | The risk band comes from the API and is never derived from the score. | Confirmed by Lula |
| A11 | Assessment age is counted from today. There's no staleness rule, because it would flag every business. | Our decision |

Why A3 matters: Cape Foods' statements cover 6 months and the others cover 3. On raw totals Cape looks about twice Delta's size; per month they're almost level.

### Which businesses need attention

The thresholds live in one place, `src/lib/assessment.ts`, and every flag on screen shows its reason.

- **Pending assessment.** It has to be finished before any credit decision. Pending assessments also get their own count in the summary.
- **High risk band.** Lula's own band, and the clearest signal there is.
- **Thin file.** Less history makes the score less reliable, so a person should look before trusting it.
- **Net monthly movement under 10% of monthly credits.** Little headroom left after outgoings. A placeholder for analysts to tune.
- **Any category below 40 (out of 100).** One weak area can hide behind a reasonable overall score. Also a placeholder.

Not flagged, on purpose:
- **Assessment age.** Every assessment in the data is from late 2024, about 22–23 months old, so an age rule would flag everything and tell the analyst nothing.
- **The Medium band on its own.** It would flag two of the four completed assessments and make the list noisy.

With the current data, Bright Construction is flagged for four reasons (High band, thin file, net 7,0% of credits, three categories below 40), Echo Tech is flagged as pending, and Acme, Cape Foods and Delta are clear.
