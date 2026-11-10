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

## Verification model notes

- The depth property counts return-site symbols, not the bottom marker: when the displayed stack word includes `⊥`, the bounded condition is `|w| − 1 ≤ K`.
- A productive cycle on an accepting path of the automaton for reachable configurations is the relevant evidence for arbitrarily long represented stack words; an arbitrary cycle alone is not sufficient.
- The parser accepts only JSON whitespace characters (space, tab, line feed, and carriage return), not the broader JavaScript `\s` class.
- The authorization monitor is a finite abstraction. A real analysis must preserve distinctions between resource identities or permission classes that matter to the checked property.
- Intel CET and LLVM ShadowCallStack are distinct protected-return-address mechanisms; their exact enforcement and failure behavior depend on platform and runtime.

## Scope and technical notes

- A PDA is a language-recognition model. A PDS is a transition-system model commonly used for recursive program verification; they are related but not interchangeable.
- The stack visualiser shows active procedure frames as an intuition aid. The formal PDS rules separately show the top-of-stack rewrite convention and return-site handling.
- A standard PDA/PDS captures nested control flow. It does not automatically model physical memory, CPU time, authorization facts, heap ownership, or all runtime vulnerabilities.
- A concrete resource-exhaustion claim requires an explicit bound, cost/resource model, or runtime enforcement.
- The parser simulation is a teaching implementation of JSON recursive descent. It is not a production parser or a measurement of operating-system stack usage.
- A model-checking witness is a path in the abstraction. Validate feasibility against the concrete source and environmental assumptions before reporting a confirmed vulnerability.
- General PDA language problems and visibly pushdown language problems have different closure and decidability properties. The three-way call/return/internal partition is specific to visibly pushdown models, not every PDA.

## Navigation

Use the horizontal section navigation at the top or the Previous/Next controls at the bottom. Left/Right Arrow and Page Up/Page Down move between sections when focus is outside interactive controls and editable content.
