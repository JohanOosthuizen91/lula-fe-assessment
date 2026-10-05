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
