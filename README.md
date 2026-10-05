# Credit assessment dashboard

A dashboard for a credit analyst reviewing business credit assessments, built in two hours against the mock API. The aim was a screen an analyst can trust: every number is either right, clearly labelled as missing, or not shown at all.

## What was built

- **A list of businesses**, those needing attention first. Each row shows status, credit score with Lula's risk band, and monthly net movement with the number of months it averages. Every attention reason is a text chip under the business name, so it stays visible at any width.
- **A summary strip**: businesses, how many need attention, pending and high risk.
- **An assessment detail** for the selected business (`?business=2`, so links can be shared and the back button works):
  - an attention box that explains each flag in a sentence, and only gives an all-clear when every rule could actually be checked
  - the credit score with its band, no gauge (the score has no fixed scale), and a thin-file warning
  - monthly money in and out as two bars on one axis, net movement, and the share of money in that goes out, with the period and the statement totals underneath
  - category scores as bars out of 100, lowest first, against a marked 40 line
- **Every state handled**: loading skeletons; a pending assessment says "Awaiting assessment" rather than showing zeros; an unknown business or a malformed link says so; if the API is down the screen says how to start it, and if a refresh fails, data already on screen stays, marked with the time it was loaded.
- **Layout**: list and detail side by side from 1200px, stacked below that and on phones, where selecting a business moves focus to the detail and "Back to list" returns it.

Stack: React 18, TypeScript (strict), TanStack Query, plain CSS on Lula's `brand.css` tokens. No UI kit or chart library. 91 tests run with Node's built-in test runner.

## Decisions and assumptions

The brief is deliberately open. Lula answered a few questions on 5 Oct 2026 (Andrea): the credit score has no fixed scale and the risk band comes pre-set; category scores have no weightings and read like 0–100; bank totals cover the whole period analysed, not a month; amounts are in rand; and proposing the "needs attention" criteria is part of the exercise. Everything else below is my own call, and says so.

| # | Assumption | Status |
|---|---|---|
| A1 | The credit score has no fixed scale. Show the number plus its band, with no gauge. | Confirmed by Lula |
| A2 | Category scores are out of 100, with no weightings. Bars out of 100 are allowed, labelled. They're never shown as parts of the overall score. | Lula: "read like 0–100" |
| A3 | Bank totals cover `monthsAnalysed`. Compare monthly averages only, and always show the period. | Confirmed by Lula |
| A4 | The currency is ZAR. | Confirmed by Lula |
| A5 | Credits are money in and debits are money out. The difference is "net movement", not profit. | Bank-statement convention |
| A6 | The current assessment is the newest by `createdDate`, with the highest id on a tie. | My rule; tested |
| A7 | One credit report and one bank statement per assessment. If more come back, say so rather than guess. | Observed in the data, not guaranteed |
| A8 | A thin file makes the score less reliable. | Industry meaning |
| A9 | The attention rules below are my proposal. | Lula: part of the exercise |
| A10 | The risk band comes from the API and is never derived from the score. | Confirmed by Lula |
| A11 | Assessment age is counted from today. There's no staleness rule, because it would flag every business. | My decision |

Why A3 matters: Cape Foods' statements cover 6 months and the others cover 3. On raw totals Cape looks about twice Delta's size (R1 240 000 against R630 000 in); per month they're almost level (R206 667 against R210 000). The list and the bars use monthly averages; the detail also shows the statement totals, labelled with their period.

Other decisions:
- **Missing is never zero.** `null` means "not assessed yet" and is shown as "Awaiting assessment" or a muted dash with screen-reader text, never as 0 or R0,00.
- **Bad data fails loudly, unknown labels don't.** Every API field is shape-checked; a wrong type throws rather than being guessed at. An unrecognised risk band or status is kept as its raw text, shown in a neutral style and flagged, so one new value doesn't take down the list.
- **No all-clear without the data.** "No attention flags" appears only when every section loaded and had what its rules need. Otherwise the box says "Not fully checked" and names the rules it couldn't check and why.
- **Formatting** uses `Intl` with `en-ZA`: R206 666,67, 7,0%, 15 Nov 2024. Money uses en-ZA grouping (a no-break space) and decimal comma, with no space after R. That's house style: the CLDR default for en-ZA adds a space, but SA government and many banks write R206 666,67. Dates are formatted from their own parts, so the viewer's time zone can't shift them.
- **Loading:** the list fetches all five collections in parallel and joins them in the browser, which is fine for a handful of businesses; in production I'd ask for a summary endpoint. The detail uses the documented filtered endpoints, one request per section, so one failing section doesn't blank the rest.

### Which businesses need attention

The thresholds live in one place, `src/lib/assessment.ts`, and every flag on screen shows its reason.

- **Pending assessment.** It has to be finished before any credit decision. Shown in the pending colour rather than red, because it needs action rather than signalling risk.
- **High risk band.** Lula's own band, and the clearest signal there is.
- **Thin file.** Less history makes the score less reliable, so a person should look before trusting it.
- **Net monthly movement under 10% of monthly money in, or no money in at all.** Little headroom left after outgoings. A placeholder for analysts to tune.
- **Any category below 40 (out of 100).** One weak area can hide behind a reasonable overall score. Also a placeholder.
- **A risk band or status the app doesn't recognise**, and **conflicting records** (two credit reports for one assessment). A person should check either before relying on it.
- **No assessment at all.** There's nothing to base a decision on yet.

Not flagged, on purpose:
- **Assessment age.** Every assessment in the data is from late 2024, about 22–23 months old, so an age rule would flag everything and tell the analyst nothing.
- **The Medium band on its own.** It would flag two of the four completed assessments and make the list noisy.

With the current data, Bright Construction is flagged for four reasons (High band, thin file, net 7,0% of money in, three categories below 40), Echo Tech is flagged as awaiting assessment, and Acme, Cape Foods and Delta are clear.

## How AI was used

I worked with Claude Code (Opus) as a pair, one small step and one commit at a time: it wrote the code and ran the checks, and I reviewed each step and decided what went in. Around that I used Sonnet subagents that report but never edit:

- **An independent test author** wrote the 43 tests for the assessment logic from the written rules and expected figures, without seeing the implementation. They passed first time; I then broke the code on purpose (period totals instead of monthly, flagging a category of exactly 40, the wrong tie-break) to confirm the tests catch it.
- **A reviewer after every commit**, running the tests against `CLAUDE.md`. It caught real bugs: impossible dates such as 2024-02-30 being accepted and shown as 1 March; a connection dropping mid-response escaping as a raw error; a value that rounds to zero showing as "-R0,00"; a future date described as "next month"; and, most important, the attention box showing a green "No attention flags" heading when a section hadn't loaded. That last one became its own commit.
- **A visual checker** driving Chrome at 1440, 1280, 1024 and 375px, measuring rather than eyeballing. It found the list cramped at 1024 (so the side-by-side breakpoint moved to 1200px) and the stacked detail not scrolling into view after selection.
- **`/code-review`** on the full diff at the end, and a security review (no findings).

Where the AI was confidently wrong, and how it was caught:
- It wrote no-break-space escapes into a test file that arrived on disk as literal characters; the linter caught it, and two quick fixes made it worse before a third worked.
- A time-zone test leaked its zone into later tests, which only showed up when a new test depended on the local clock.
- It twice misread the plan's timetable when reporting how far ahead we were.
- One of its own layout fixes pushed a short detail panel's content down the page; measuring caught it before I saw it.

Decisions I made over its suggestions included: keeping unknown risk bands visible instead of failing the list; how pending rows read (once, not three times); the amber "Not fully checked" state; and using `Intl`'s own sign handling instead of custom rounding.

## How to run and check

```bash
npm install
npm run api     # mock API on :3001
npm run dev     # app on :5173, with /api proxied to the mock API
```

```bash
npm run check   # typecheck, lint (oxlint) and tests
npm run build
```

To see the dead-API state, stop `npm run api` and reload; start it again and press Try again.

## Known issues

- **Duplicate records read differently in the list and the detail.** If two credit reports or bank statements come back for one assessment, the list flags "2 credit reports found", while the detail section shows an error and the attention box says that section "didn't load". Neither picks a record or gives an all-clear, but the detail should name the conflict.
- **The browser Back button doesn't restore focus.** On narrow screens, "Back to list" returns focus to the business you were viewing, but closing the detail with the browser's own Back button leaves focus on the page.
- **A list row with incomplete data looks clear.** The detail says "Not fully checked" when a completed assessment comes back without the data a rule needs, but the list row shows no chip for it.
- **`npm audit` reports 2 issues (1 moderate, 1 high)** in esbuild, through Vite 4. They affect the dev server only, and the fix is a major Vite upgrade, which was out of scope.
- Smaller clean-ups: some CSS class names (`bar`, `figure`, `warning`) aren't prefixed by component, and two places join lists by hand where `Intl.ListFormat` would do.

## With more time

- Fix the known issues above, starting with flagging incomplete data in the list.
- Agree the attention thresholds with the credit team, and make them configurable rather than constants.
- Ask for a summary endpoint for the list, and for the API to say which scale the category scores use rather than assuming 0–100.
- Component tests for the attention box and the detail states, and an automated accessibility check.
- Sorting and filtering for a longer list, and showing assessment history rather than only the current one.

## The original brief: Frontend Assessment

### Context

You're building a dashboard for a credit operations team. The team reviews business credit assessments — they need to see which businesses have been assessed, how they scored, and what the underlying financials look like.

### What to build

Build a React application that lets a credit analyst:

- See a list of assessed businesses and their current status
- View the credit score and risk profile for a business
- Get a sense of the financial picture from the bank statement data
- See how the score breaks down across categories
- Spot which businesses need attention

There are no wireframes. Make reasonable layout and design decisions — we're interested in your judgment, not pixel perfection.

### API

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

### Getting started

```bash
npm install
npm run dev
```

Run both `npm run api` and `npm run dev` in separate terminals.

### Time limit

2 hours from your first commit. Commit regularly — we look at the commit history.

### Tools

Use whatever you'd normally use — Cursor, Claude, v0, Copilot. We expect you to. Part of what we're evaluating is how you work with AI tools, not whether you do. If you complete this without AI assistance, that's a flag against you, not for you.

### Submitting

1. Create a **private repo on your personal GitHub account**, push your work there
2. When done, send us:
   - Your repo link with `neil-lula` invited as a collaborator
   - A short screen recording (5-10 min) walking through your submission. Cover: what you built, the key decisions you made and why, how you used AI tools and what you asked them to do, and what you'd do differently with more time. We're not looking for polish — we're listening for how you think.
