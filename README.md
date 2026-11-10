# Pushdown Automata in Recursive Security Analysis

A responsive React and TypeScript learning resource explaining how Pushdown Automata (PDA) and Pushdown Systems (PDS) represent nested execution and support security analysis.

## Technology

- React 18 and TypeScript
- Vite
- Framer Motion for restrained, accessible transitions
- Lucide React for consistent interface icons
- Responsive CSS with reduced-motion support

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

## Learning sections

1. **Foundations** — the formal PDA 7-tuple and PDS 4-tuple, configurations, and canonical PDS transition rules.
2. **Stack semantics** — an interactive seven-step call/return trace with consistent active-frame semantics.
3. **Parser simulation** — an editable JSON request, recursive descent trace, depth guard, back/step/run controls, auto-play, and malformed-input rejection.
4. **Analysis methods** — a concrete source-to-PDS pipeline, security-property encoding, P-automaton saturation, Dyck-language reachability, and the distinction between general PDAs and visibly pushdown automata.
5. **Formal verification** — product construction for authorization and resource-state monitors, depth bounds, and the role of IFDS/IDE and Weighted Pushdown Systems.
6. **Security applications** — uncontrolled recursion, authorization across nested resources, exceptional cleanup, and shadow-stack control-flow integrity.

## Scope and technical notes

- A PDA is a language-recognition model. A PDS is a transition-system model commonly used for recursive program verification; they are related but not interchangeable.
- The stack visualiser shows active procedure frames as an intuition aid. The formal PDS rules separately show the top-of-stack rewrite convention and return-site handling.
- A standard PDA/PDS captures nested control flow. It does not automatically model physical memory, CPU time, authorization facts, heap ownership, or all runtime vulnerabilities.
- A concrete resource-exhaustion claim requires an explicit bound, cost/resource model, or runtime enforcement.
- The parser simulation is a teaching implementation of JSON recursive descent. It is not a production parser or a measurement of operating-system stack usage.
- A model-checking witness is a path in the abstraction. Validate feasibility against the concrete source and environmental assumptions before reporting a confirmed vulnerability.
- General PDA language problems and visibly pushdown language problems have different closure and decidability properties. The three-way call/return/internal partition is specific to visibly pushdown models, not every PDA.

## Navigation

Use the horizontal section navigation at the top or the Previous/Next controls at the bottom. Left/Right Arrow and Page Up/Page Down move between sections when a text field is not focused.


## Latest refinements

- The header now contains only the course title and six section navigation steps; redundant breadcrumb, section-count and topic labels have been removed.
- The visual theme uses the specified orange palette (`#FF6600`, `#FF5A00`, `#FB651E`) with warm neutral and high-contrast charcoal surfaces.
- The stack trace shows a PDS top-of-stack rewrite rule and the resulting full stack configuration at every step.
- The JSON parser simulation includes token-boundary validation and a normal/fast playback control.
- Repeated overview/navigation blocks and duplicate caveats have been removed.
- Formal notation, semiring overlines, headings and transition arrows have been corrected according to the supplied screenshot audit.
