\# Instructions for AI Agent



\*\*TASK:\*\* Pixel-Perfect Frontend Implementation from Mockup Files into React TypeScript – Senior Tech Lead Level Execution



You are an elite AI Coder operating at the level of a Senior Tech Lead/Software Engineer, with \*\*direct read/write access to all files\*\* in the locally cloned project directory. Your mission is to perform a complete, precise overhaul of the frontend by \*\*directly editing the relevant files\*\* to replicate the EXACT HTML structure, CSS styling, and visual design from the mockup files in the `mockups-last` folder. This is a zero-deviation, pixel-perfect implementation: no interpretations, enhancements, modifications to the mockups, or creative liberties. Treat the mockups as the absolute, immutable source of truth for design, while seamlessly preserving and integrating all existing React logic, state, props, functionality, and TypeScript integrity without any alterations. Leverage your direct file system access to read mockups and modify target files efficiently, ensuring no manual copying or external tooling is needed.



\*\*CRITICAL REQUIREMENTS (ENFORCED RIGOROUSLY TO AVOID PAST FAILURES):\*\*



\- \*\*Pixel-Perfect Replication Only\*\*: Directly read and extract the PRECISE HTML structure (tag-for-tag, attribute-for-attribute, nesting level-for-level) and CSS rules from the mockup files in `mockups-last`. DO NOT add, remove, modify, interpret, "fix," enhance, or deviate from any design elements, layouts, colors, spacings, fonts, shadows, gradients, blurs, animations, transitions, or interactions in the mockups. If a mockup element conflicts with existing React logic, prioritize the mockup's exact structure but weave in the logic non-destructively (e.g., replace static text with dynamic variables in the exact same tags).

\- \*\*Preserve All React/TypeScript Functionality\*\*: Maintain EVERY existing prop, state management (e.g., `useState`, `useEffect`), event handlers, data mappings, conditional rendering, imports, exports, TypeScript types, and hooks intact. Only overwrite static HTML/CSS segments with mockup equivalents; functional code must remain unchanged. If dynamic elements (e.g., loops or conditionals) aren't explicitly in the mockup, integrate them into the mockup structure at analogous positions, styled exactly to match surrounding mockup aesthetics.

\- \*\*Responsive Design Fidelity\*\*: Implement fully responsive and mobile-compatible behavior exactly as implied or specified in the mockups (including any media queries). Use browser dev tools to verify pixel-level matching across devices (desktop, tablet, mobile).

\- \*\*Comprehensive Dual Theme Support (Light and Dark Modes)\*\*: Every mockup includes light and dark variants. Implement BOTH modes exhaustively using the existing theme hook (e.g., `const { theme } = useTheme();`). Conditionally apply light/dark classes to EVERY element, ensuring seamless toggling without glitches.

\- \*\*No Assumptions, Creativity, or Extrapolations\*\*: Base EVERYTHING solely on the contents of the `mockups-last` folder, accessed directly via file system reads. If something in the current code isn't in the mockup, retain the functionality but style it to blend with the mockup's exact aesthetic (though mockups are comprehensive, so this should be minimal).

\- \*\*Direct File Access Advantage\*\*: Utilize your ability to read `mockups-last/\*.html` files and write to `src/` files directly. Avoid intermediate steps (e.g., manual extraction or external editors); programmatically parse HTML/CSS and apply to target files.

\- \*\*Address Past Mistakes and Difficulties\*\*:

&nbsp; - \*\*Tables\*\*: In pages like `billing.tsx` (which include tables), implement tables EXACTLY as in the mockups—use the precise `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` structure, classes, and styling. DO NOT use React table libraries, custom components, or modifications; copy the HTML structure verbatim and ensure proper rendering (e.g., no collapsed borders or misaligned cells, as seen in prior failed attempts).

&nbsp; - \*\*Incomplete Extractions\*\*: Meticulously extract EVERY CSS rule, including subtle ones like `backdrop-filter`, `linear-gradient`, `box-shadow`, hover/transition effects, pseudo-elements (`::before`, `::after`), and media queries. Past failures stemmed from missing these.

&nbsp; - \*\*Structure Integrity\*\*: Replicate nesting and hierarchy precisely (e.g., if a mockup has a `<div>` with specific child elements, do not flatten or reorganize).

&nbsp; - \*\*Theme Application\*\*: Avoid hard-coded styles; use conditional classes for ALL elements (e.g., no inline styles unless in mockups).

&nbsp; - \*\*Functionality Breaks\*\*: Previous attempts broke dynamic features (e.g., chat scrolling, form submissions)—test and ensure all work post-implementation.

&nbsp; - \*\*Direct Modifications\*\*: Edit files in place (e.g., `src/index.css`, `src/pages/landing.tsx`) using your file system access. Commit changes only after full verification.



\*\*FILES TO PROCESS (Mockup to Target Mapping):\*\*



All mockup files are in the `mockups-last` folder. Direct mappings:



\- `mockups-last/mockup-landing-light.html` and `mockups-last/mockup-landing-dark.html` → `src/pages/landing.tsx`

\- `mockups-last/mockup-dashboard-light.html` and `mockups-last/mockup-dashboard-dark.html` → `src/pages/dashboard.tsx`

\- `mockups-last/mockup-account-light.html` and `mockups-last/mockup-account-dark.html` → `src/pages/account.tsx`

\- `mockups-last/mockup-billing-light.html` and `mockups-last/mockup-billing-dark.html` → `src/pages/billing.tsx`

\- `mockups-last/mockup-cases-light.html` and `mockups-last/mockup-cases-dark.html` → `src/pages/cases.tsx`

\- `mockups-last/mockup-chat-light.html` and `mockups-last/mockup-chat-dark.html` → `src/components/chat/chat-interface.tsx`



\*\*Note\*\*: Each mockup is a self-contained HTML file with `<html>`, `<head>` (including `<style>` for CSS), and `<body>` (structure). Use ONLY `<body>` for JSX structure and `<style>` for CSS extraction. Ignore any non-design elements.



\*\*CSS IMPLEMENTATION GUIDELINES:\*\*



\- Programmatically read ALL `<style>` sections from every file in `mockups-last` (both light and dark variants).

\- Extract EVERY CSS rule, class, selector, gradient, backdrop-filter, animation, transition, media query, and pseudo-element.

\- Consolidate and deduplicate into a SINGLE, comprehensive `src/index.css` file. COMPLETELY REPLACE the existing `src/index.css`—do not append, merge, or retain old content.

\- Include ALL classes from mockups, such as:

&nbsp; - Light: `.sophisticated-bg`, `.executive-card`, `.primary-button`, `.sidebar`, `.case-card`, `.chat-message-user`, `.chat-message-ai`, and table-specific classes (e.g., `.billing-table`, `.table-header`).

&nbsp; - Dark: `.dark-bg`, `.dark-executive-card`, `.dark-primary-button`, `.dark-sidebar`, `.dark-case-card`, `.dark-chat-message-user`, `.dark-chat-message-ai`, and dark table variants.

\- Ensure CSS enables theme toggling via JSX class conditionals (e.g., no `:root` variables unless in mockups; rely on theme-specific classes).



\*\*DETAILED IMPLEMENTATION STEPS (EXECUTE SEQUENTIALLY AS A SENIOR ENGINEER):\*\*



1\. \*\*Repository Access and Preparation\*\*:

&nbsp;  - Directly access the project files via file system APIs.

&nbsp;  - Verify the `mockups-last` folder exists and contains all listed mockups (12 files total: 6 pages x 2 themes).

&nbsp;  - If any files are missing, halt and report; otherwise proceed.



2\. \*\*Global CSS Overhaul\*\*:

&nbsp;  - Programmatically read ALL mockup HTML files in `mockups-last` (light and dark for each page/component).

&nbsp;  - Parse and extract ALL CSS from `<style>` tags, combining light and dark rules without duplication.

&nbsp;  - Directly overwrite `src/index.css` with this consolidated CSS. Validate for syntax errors, completeness (e.g., include all gradients, blurs, table stylings), and theme coverage.

&nbsp;  - Test CSS isolation: Apply to a temporary HTML file to confirm no rendering issues.



3\. \*\*Individual Page/Component Implementation\*\*:

&nbsp;  - For EACH target file (e.g., `src/pages/landing.tsx`):

&nbsp;    - Read the current React file: Catalog all functional elements (props, states, effects, handlers, loops, conditionals, imports, types).

&nbsp;    - Read corresponding light/dark mockups (e.g., `mockups-last/mockup-landing-light.html`, `mockups-last/mockup-landing-dark.html`): Extract EXACT `<body>` HTML structure from light (reference dark for classes).

&nbsp;    - Convert to JSX: Replace `class` with `className`, attributes to camelCase (e.g., `for` → `htmlFor`), use self-closing tags (e.g., `<img>` → `<img />`).

&nbsp;    - Integrate into React: Replace existing JSX with converted structure. Insert dynamic logic precisely (e.g., `{variable}` in mockup-equivalent tags; `map()` in list containers).

&nbsp;    - Apply Themes: Use conditionals like `className={"${theme === 'dark' ? 'dark-class' : 'light-class'} other-fixed-classes"}` for EVERY styled element.

&nbsp;    - Special Handling for Tables (e.g., in `billing.tsx`): Replicate `<table>` structure exactly, including colspans, rowspans, classes on `<th>`/`<td>`. Integrate dynamic data via `{}` in cells, ensuring no layout shifts.

&nbsp;    - Write changes directly to the target file.



4\. \*\*Theme and Component Mapping Examples\*\*:

&nbsp;  - Background: `<div className={"min-h-screen p-6 ${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'}"}>...</div>`

&nbsp;  - Card: `<div className={"${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} p-6 rounded-xl"}>...</div>`

&nbsp;  - Dynamic List (e.g., cases): `{cases.map((caseItem) => (<div key={caseItem.id} className={"${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-6"}><h3 className={"${theme === 'dark' ? 'dark-text' : 'text-gray-800'}"}>{caseItem.title}</h3><p>{caseItem.description}</p></div>))}`

&nbsp;  - Table (e.g., billing): `<table className={"${theme === 'dark' ? 'dark-billing-table' : 'billing-table'}"}> <thead><tr><th className={"${theme === 'dark' ? 'dark-table-header' : 'table-header'}"}>Header</th>...</tr></thead> <tbody>{invoices.map((inv) => (<tr><td>{inv.date}</td>...</tr>))}</tbody> </table>`

&nbsp;  - Chat Messages: Alternate user/AI with conditional classes (e.g., `.chat-message-user` vs `.dark-chat-message-user`).



5\. \*\*Verification, Testing, and Iteration\*\*:

&nbsp;  - Run `npm install` if needed, then `npm run build` in the project root—fix ANY errors (TypeScript, compilation).

&nbsp;  - Test Suite:

&nbsp;    - \*\*Visual\*\*: Open each page in browser (light/dark); compare pixel-by-pixel with mockups using dev tools (measure dimensions, colors, spacings).

&nbsp;    - \*\*Functionality\*\*: Interact fully (e.g., chat input/submit, table sorting if present, theme toggle)—confirm no regressions.

&nbsp;    - \*\*Responsiveness\*\*: Test on emulated devices; match mockup breakpoints.

&nbsp;    - \*\*Edge Cases\*\*: Handle empty states, loading, errors as in current code, styled per mockups.

&nbsp;  - If mismatches (e.g., table misalignment), re-read mockup files, re-extract, and re-implement exactly. Iterate until perfect.

&nbsp;  - Use direct file access to streamline verification (e.g., read mockup vs. rendered output programmatically).



\*\*QUALITY CHECKLIST (VALIDATE EACH BEFORE DECLARING DONE):\*\*



\- `src/index.css`: Fully extracted, consolidated, error-free, covers all mockup CSS.

\- JSX Structure: Mirrors mockup `<body>` exactly in every file.

\- Themes: Both modes identical to mockups; toggling flawless.

\- Functionality: All React elements preserved and operational.

\- No TypeScript Errors: Types, imports intact.

\- Tables: Properly implemented, no rendering issues.

\- Responsiveness: Pixel-perfect across sizes.

\- No Deviations: No added/fixed elements; pure replication.



\*\*COMMON PITFALLS TO AVOID (BASED ON PRIOR TRIBULATIONS):\*\*



❌ DO NOT modify mockups (e.g., no "improving" table accessibility or layout).  

❌ DO NOT alter React code (e.g., keep data fetching unchanged).  

❌ DO NOT skip dark mode or conditional classes.  

❌ DO NOT miss CSS details (e.g., blurs, transitions, table borders).  

❌ DO NOT create new classes; only mockup-sourced.  

❌ DO NOT ignore nesting or attributes in HTML.  

❌ DO NOT fail to implement tables fully (past issue: tables created but not styled/structured properly).  

✅ DO leverage direct file access to read mockups and write to `src/` files efficiently.  

✅ DO test exhaustively in all modes/devices.  

✅ DO programmatically parse and apply mockup content to avoid manual errors.



\*\*SUCCESS CRITERIA (COMPLETE ONLY WHEN ALL ACHIEVED):\*\*



\- `npm run build` succeeds without issues.

\- All pages/components visually indistinguishable from `mockups-last` files in both modes.

\- Full interactivity preserved.

\- Theme toggle seamless.

\- Responsive matching mockups.

\- Overall: A flawless, sophisticated design overhaul—exact, functional, and professional-grade. Report completion with a summary of changes and verification results, including file paths modified and test outcomes.

