# Credit assessment dashboard

Internal tool for credit analysts: see which businesses were assessed, how they scored, their
financial picture, and which need attention. A wrong or overconfident number is the worst failure.

## Commands
- `npm run api`: mock API on :3001 (json-server, data.json). `npm run dev`: app on :5173, proxied at `/api`.
- `npm run check`: typecheck, lint and tests. Must pass before every commit. `npm run build`.

## Data rules
- `null` means "not assessed yet". Never coerce to 0 (`?? 0`, `|| 0`, `Number()`, `+x`), never render as 0.
- Bank totals cover `monthsAnalysed` months (confirmed by Lula). Compare monthly averages only and always show the period. Amounts are rands.
- The credit score has no fixed scale (confirmed by Lula): show the number with its band. No gauge, percentage or bar.
- The risk band comes from the API (confirmed). Never derive it from the score.
- Category scores read as 0–100 with no weightings (Lula's guidance). Bars out of 100 are fine, labelled as such. Never present them as parts of the overall score.
- Attention rules and thresholds live only in `src/lib/assessment.ts`, and every flag shows its reason.
- Never edit data.json.

## Formatting
- Format only through `src/lib/format.ts`: `R206 666,67`, `68,5`, `15 Nov 2024`. Money uses Intl en-ZA grouping (a no-break space) and decimal comma, with no space after R (house style; the CLDR default adds one).
- Numbers are right-aligned with tabular figures. The one exception: on phones (640px and under) each list row becomes a card and its cells, numbers included, are left-aligned under their labels.

## React and TypeScript
- React 18: function components and hooks only; no React 19 APIs.
- Server data through TanStack Query hooks in `src/api/queries.ts`; never fetch in `useEffect`.
- Derive values during render; no state that copies props or query data, no effects for derived values.
- Stable id keys, never indexes. Small components named for what they show.
- Strict TypeScript: no `any`, no non-null `!`, no `@ts-ignore`. `as` only at the API boundary, after a shape check.
- Erasable syntax only (no enums or namespaces), so `node --test` can run the tests. `import type`. Named exports.
- Semantic HTML: `<table>` for tabular data, `<button>` for actions. Visible focus. Colour never carries meaning alone.

## Styling
- Plain CSS in `src/styles/app.css`, with classes prefixed by component. Tokens from `src/brand.css`; add new tokens
  there, and no raw hex in components. No UI kit and no chart library: bars are a `<div>` width plus a text value.
- Layout: a summary strip, then the business list beside a detail panel, stacking below 1200px (`SIDE_BY_SIDE_QUERY` in `App.tsx` is the exact `app.css` media query, `(min-width: 1200px)`; stacked is its negation). When stacked, selecting a business moves focus to the detail; "Back to list" returns it to that business. Attention reasons stay visible at every width.
- No markdown in on-screen text. Show commands in `<code>`, never with backticks inside a string.

## Regex
- Prefer clearer built-ins (`Intl`, `URLSearchParams`). Regex only for real pattern checks, anchored, simple and commented.

## Dependencies and commits
- No new dependency without asking. Pin exact versions. Never upgrade existing ones or run `npm audit fix --force`.
- Small commits whose messages say why.
