import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown, ArrowLeft, ArrowRight, Braces, Check,
  ChevronLeft, ChevronRight, Database,
  Layers, Pause, Play, RotateCcw,
  SkipBack, SkipForward, Zap
} from 'lucide-react';

type Section = 'overview' | 'stack' | 'playground' | 'analysis' | 'verification' | 'cases';
const modules: { id: Section; label: string; short: string }[] = [
  { id: 'overview', label: 'Foundations', short: '01' },
  { id: 'stack', label: 'Stack semantics', short: '02' },
  { id: 'playground', label: 'Parser simulation', short: '03' },
  { id: 'analysis', label: 'Analysis methods', short: '04' },
  { id: 'verification', label: 'Formal verification', short: '05' },
  { id: 'cases', label: 'Security applications', short: '06' },
];
const headingMotion = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: .28 } };

function Heading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <motion.div className="section-heading" {...headingMotion}>
    <div className="eyebrow"><span className="eyebrow-mark" />{eyebrow}</div>
    <h1>{title}</h1><p>{detail}</p>
  </motion.div>;
}
function Tag({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
function CodePanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="code-panel"><div className="code-panel-head"><span className="code-dots"><i/><i/><i/></span><span>{title}</span></div><div className="code-panel-body">{children}</div></div>;
}

const stackSteps = [
  {
    event: '1. Program starts in main()',
    op: 'START',
    controlState: 'q_main (executing main)',
    frames: ['⊥  (initial stack marker)'],
    note: 'Execution begins in control location q_main. The stack contains only the bottom marker ⊥ because no procedure call has occurred yet.',
    rule: 'Initial state: ⟨q_main, ⊥⟩',
    configuration: '⟨q_main, [⊥]⟩'
  },
  {
    event: '2. main() calls parse()',
    op: 'CALL',
    controlState: 'q_parse (executing parse)',
    frames: ['⊥  (initial stack marker)', 'ret_main  (return → main)'],
    note: 'Control moves to q_parse and pushes the saved return site ret_main onto the stack above ⊥.',
    rule: '⟨q_main, ⊥⟩ ↪ ⟨q_parse, ret_main · ⊥⟩',
    configuration: '⟨q_parse, [ret_main, ⊥]⟩'
  },
  {
    event: '3. parse() calls validate()',
    op: 'CALL',
    controlState: 'q_validate (executing validate)',
    frames: ['⊥  (initial stack marker)', 'ret_main  (return → main)', 'ret_parse₁  (return → outer parse)'],
    note: 'Control enters q_validate and pushes ret_parse₁ on top of the stack so execution can return to the outer parse() call.',
    rule: '⟨q_parse, ret_main⟩ ↪ ⟨q_validate, ret_parse₁ · ret_main⟩',
    configuration: '⟨q_validate, [ret_parse₁, ret_main, ⊥]⟩'
  },
  {
    event: '4. validate() calls parse() recursively',
    op: 'CALL',
    controlState: 'q_parse (executing nested parse)',
    frames: ['⊥  (initial stack marker)', 'ret_main  (return → main)', 'ret_parse₁  (return → outer parse)', 'ret_validate  (return → validate)'],
    note: 'The recursive call re-enters q_parse and pushes ret_validate. The stack now distinguishes the inner parse() return from the outer one.',
    rule: '⟨q_validate, ret_parse₁⟩ ↪ ⟨q_parse, ret_validate · ret_parse₁⟩',
    configuration: '⟨q_parse, [ret_validate, ret_parse₁, ret_main, ⊥]⟩'
  },
  {
    event: '5. Nested parse() returns to validate()',
    op: 'RETURN',
    controlState: 'q_validate (resumed in validate)',
    frames: ['⊥  (initial stack marker)', 'ret_main  (return → main)', 'ret_parse₁  (return → outer parse)'],
    note: 'The inner parse() completes first. Popping ret_validate restores control to q_validate while leaving ret_parse₁ at the top of the stack.',
    rule: '⟨q_parse, ret_validate⟩ ↪ ⟨q_validate, ε⟩',
    configuration: '⟨q_validate, [ret_parse₁, ret_main, ⊥]⟩'
  },
  {
    event: '6. validate() returns to outer parse()',
    op: 'RETURN',
    controlState: 'q_parse (resumed in outer parse)',
    frames: ['⊥  (initial stack marker)', 'ret_main  (return → main)'],
    note: 'Popping ret_parse₁ restores control to the outer parse() invocation, exposing ret_main as the next return target.',
    rule: '⟨q_validate, ret_parse₁⟩ ↪ ⟨q_parse, ε⟩',
    configuration: '⟨q_parse, [ret_main, ⊥]⟩'
  },
  {
    event: '7. Outer parse() returns to main()',
    op: 'RETURN',
    controlState: 'q_main (resumed in main)',
    frames: ['⊥  (initial stack marker)'],
    note: 'Popping ret_main restores control to q_main. Every call has returned to its matching caller in Last-In, First-Out order.',
    rule: '⟨q_parse, ret_main⟩ ↪ ⟨q_main, ε⟩',
    configuration: '⟨q_main, [⊥]⟩'
  },
];
function StackVisualizer() {
  const [step, setStep] = useState(0); const current = stackSteps[step];
  return <div className="panel stack-lab">
    <div className="panel-heading"><div><Tag tone={current.op === 'CALL' ? 'blue' : current.op === 'RETURN' ? 'green' : 'slate'}>{current.op}</Tag><span className="micro-label">CALL / RETURN TRACE · STEP {step + 1} OF {stackSteps.length}</span></div>
      <div className="control-group"><button className="icon-button" onClick={() => setStep(0)} aria-label="Reset trace"><RotateCcw/></button><button className="icon-button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous step"><SkipBack/></button><button className="icon-button primary" onClick={() => setStep(Math.min(stackSteps.length - 1, step + 1))} disabled={step === stackSteps.length - 1} aria-label="Next step"><SkipForward/></button></div>
    </div>
    <h3 className="trace-title">{current.event}</h3>
    <div className="stack-stage">
      <div className="stack-top-rail"><span>ACTIVE CONTROL STATE: {current.controlState}</span><span>STACK TOP ↓</span></div>
      <div className="stack-frames"><AnimatePresence initial={false}>{[...current.frames].reverse().map((frame, i) => <motion.div layout key={frame + ':' + (current.frames.length - 1 - i)} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ type: 'spring', stiffness: 280, damping: 28 }} className={`stack-frame ${i === 0 ? 'is-top' : ''}`}><span className="frame-number">{String(current.frames.length - i).padStart(2, '0')}</span><code>{frame}</code>{i === 0 && <b>TOP SYMBOL</b>}</motion.div>)}</AnimatePresence></div>
      <div className="stack-base"><span>SAVED RETURN-SITE STACK (Γ*)</span><b>LIFO ORDER</b></div>
    </div>
    <div className="trace-explanation"><div><b>{current.note}</b><span>PDS top-of-stack rewrite rule</span><code>{current.rule}</code><span>Resulting configuration ⟨control, stack⟩</span><code>{current.configuration}</code></div></div>
    <div className="step-track">{stackSteps.map((s, i) => <button key={s.event} aria-label={`Go to trace step ${i + 1}`} onClick={() => setStep(i)} className={i <= step ? 'done' : ''}/>)}</div>
  </div>;
}

type ParserEvent = { symbol: string; position: number; operation: 'PUSH' | 'POP' | 'TOKEN' | 'BLOCKED' | 'REJECT' | 'ACCEPT'; stack: string[]; detail: string };
function buildParserTrace(source: string, limit: number): ParserEvent[] {
  const events: ParserEvent[] = []; const stack: string[] = []; let i = 0;
  const fail = (message: string) => { events.push({ symbol: source[i] ?? 'EOF', position: i + 1, operation: 'REJECT', stack: [...stack], detail: message }); throw new Error('TRACE_STOP'); };
  const emit = (operation: ParserEvent['operation'], symbol: string, position: number, detail: string) => events.push({ symbol, position, operation, stack: [...stack], detail });
  const ws = () => { while (i < source.length && /[ \t\n\r]/.test(source[i])) i++; };
  const parseString = () => { const start = i; if (source[i] !== '"') fail('Expected a quoted JSON string.'); i++; let closed = false;
    while (i < source.length) { const ch = source[i]; if (ch === '"') { i++; closed = true; break; } if (ch.charCodeAt(0) < 0x20) fail('Unescaped control character inside a JSON string.'); if (ch === '\\') { i++; const esc = source[i]; if (!['"','\\','/','b','f','n','r','t','u'].includes(esc ?? '')) fail('Invalid escape sequence in JSON string.'); if (esc === 'u') { const hex = source.slice(i + 1, i + 5); if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('A Unicode escape must contain four hexadecimal digits.'); i += 5; continue; } i++; continue; } i++; }
    if (!closed) fail('Input ended before the JSON string was closed.'); emit('TOKEN', 'string', start + 1, 'Read a complete JSON string token.'); };
  const parseValue = (depth: number): void => { ws(); const ch = source[i];
    if (ch === '{' || ch === '[') { const frame = ch === '{' ? 'parseObject()' : 'parseArray()'; if (depth + 1 > limit) { emit('BLOCKED', ch, i + 1, `Opening this container would reach depth ${depth + 1}, exceeding the configured limit of ${limit}. The depth guard stops descent before creating another parser frame.`); throw new Error('TRACE_STOP'); } const start = i++; stack.push(frame); emit('PUSH', ch, start + 1, `Enter ${frame} and push a nested parser frame.`); ws();
      if (ch === '{') { if (source[i] === '}') { i++; stack.pop(); emit('POP', '}', i, 'Empty object completed; pop frame and return to caller.'); return; } while (true) { ws(); if (source[i] !== '"') fail('An object key must begin with a double quote.'); parseString(); ws(); if (source[i] !== ':') fail('Expected a colon after the object key.'); i++; ws(); parseValue(depth + 1); ws(); if (source[i] === '}') { i++; stack.pop(); emit('POP', '}', i, 'Object completed; pop frame and return to caller.'); return; } if (source[i] !== ',') fail('Expected a comma or closing brace after the member value.'); i++; ws(); if (source[i] === '}') fail('Trailing commas are not valid in JSON objects.'); } }
      else { if (source[i] === ']') { i++; stack.pop(); emit('POP', ']', i, 'Empty array completed; pop frame and return to caller.'); return; } while (true) { parseValue(depth + 1); ws(); if (source[i] === ']') { i++; stack.pop(); emit('POP', ']', i, 'Array completed; pop frame and return to caller.'); return; } if (source[i] !== ',') fail('Expected a comma or closing bracket after the array element.'); i++; ws(); if (source[i] === ']') fail('Trailing commas are not valid in JSON arrays.'); } }
    }
    if (ch === '"') { parseString(); return; }
    const rest = source.slice(i); const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest); if (number) { i += number[0].length; const next = source[i]; if (next !== undefined && !/[ \t\n\r,\]}]/.test(next)) fail('Invalid token boundary after JSON number.'); emit('TOKEN', 'number', i - number[0].length + 1, `Read number ${number[0]}.`); return; }
    for (const literal of ['true','false','null']) if (rest.startsWith(literal)) { i += literal.length; const next = source[i]; if (next !== undefined && !/[ \t\n\r,\]}]/.test(next)) fail(`Invalid token boundary after JSON literal ${literal}.`); emit('TOKEN', literal, i - literal.length + 1, `Read JSON literal ${literal}.`); return; }
    fail(ch === undefined ? 'Expected a JSON value, but reached end of input.' : `Unexpected token ${JSON.stringify(ch)}. Expected an object, array, string, number, true, false, or null.`);
  };
  try { if (!source.trim()) fail('The request body is empty.'); if (source.length > 20000) fail('Input exceeds the 20,000-character demonstration limit.'); parseValue(0); ws(); if (i !== source.length) fail('Unexpected trailing characters after the root JSON value.'); JSON.parse(source); emit('ACCEPT', 'EOF', source.length + 1, 'Valid JSON payload; all recursive parser frames returned cleanly.'); }
  catch (error) { if (!(error instanceof Error) || error.message !== 'TRACE_STOP') { events.push({ symbol: 'EOF', position: i + 1, operation: 'REJECT', stack: [...stack], detail: error instanceof Error ? error.message : 'Invalid JSON input.' }); } }
  return events;
}
const normalRequest = '{\n  "user": {\n    "profile": {\n      "settings": { "theme": "dark" }\n    }\n  },\n  "roles": ["reader", "editor"]\n}';
const deepRequest = '{\n  "payload": '.repeat(12) + '"attacker-controlled"' + '\n}'.repeat(12);
const invalidRequest = '{\n  "user": { bad: true }\n}';
function ParserSimulation() {
  const [source, setSource] = useState(normalRequest); const [depthLimit, setDepthLimit] = useState(8); const [cursor, setCursor] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(650);
  const trace = useMemo(() => buildParserTrace(source, depthLimit), [source, depthLimit]); const visible = trace.slice(0, cursor); const current = visible[visible.length - 1]; const stack = current?.stack ?? []; const terminal = cursor > 0 && ['BLOCKED','REJECT','ACCEPT'].includes(current?.operation ?? '');
  useEffect(() => { if (!playing || terminal || cursor >= trace.length) return; const timer = window.setTimeout(() => setCursor(v => Math.min(trace.length, v + 1)), speed); return () => window.clearTimeout(timer); }, [playing, cursor, trace.length, speed, terminal]);
  useEffect(() => { if (terminal || cursor >= trace.length) setPlaying(false); }, [terminal, cursor, trace.length]);
  const choose = (v: string) => { setSource(v); setCursor(0); setPlaying(false); };
  const step = () => setCursor(v => Math.min(trace.length, v + 1)); const back = () => { setPlaying(false); setCursor(v => Math.max(0, v - 1)); };
  const activePos = current?.position ? current.position - 1 : -1; const previewStart = activePos < 0 ? 0 : Math.max(0, activePos - 24); const previewEnd = activePos < 0 ? Math.min(source.length, 80) : Math.min(source.length, activePos + 25);
  const status = cursor === 0 ? 'Ready to parse the request body.' : current?.operation === 'BLOCKED' ? 'Blocked by the configured nesting-depth guard.' : current?.operation === 'REJECT' ? 'Rejected at the first invalid JSON token.' : current?.operation === 'ACCEPT' ? 'Accepted: valid JSON and all parser frames returned.' : 'Parsing request; nested frames are active on the stack.';
  return <div className="parser-lab">
    <div className="scenario-bar"><div><span className="eyebrow">APPLICATION SCENARIO</span><h2>API request validation</h2><p>Compare how recursive descent handles a normal payload, deep nesting, and malformed syntax.</p></div><div className="scenario-buttons"><button className={source === normalRequest ? 'selected' : ''} onClick={() => choose(normalRequest)}>Normal request</button><button className={source === deepRequest ? 'selected' : ''} onClick={() => choose(deepRequest)}>Deep nesting</button><button className={source === invalidRequest ? 'selected' : ''} onClick={() => choose(invalidRequest)}>Invalid JSON</button></div></div>
    <div className="parser-grid">
      <section className="panel request-panel"><div className="panel-heading"><div><Tag>POST /api/profile/import</Tag><span className="micro-label">CONTENT-TYPE: APPLICATION/JSON</span></div><button className="text-button" onClick={() => { setCursor(0); setPlaying(false); }}><RotateCcw/> Reset</button></div>
        <label className="field-label" htmlFor="request-body">Request body · editable</label><textarea id="request-body" className="request-editor" spellCheck={false} value={source} onChange={e => { setSource(e.target.value); setCursor(0); setPlaying(false); }}/><div className="token-preview"><small>{activePos < 0 ? 'TOKEN PREVIEW · STEP TO INSPECT' : `ACTIVE CHARACTER · POSITION ${activePos + 1}`}</small><pre>{source.slice(previewStart, activePos < 0 ? previewEnd : activePos)}{activePos >= 0 && <mark>{source[activePos] ?? 'EOF'}</mark>}{source.slice(activePos < 0 ? previewEnd : activePos + 1, previewEnd)}{previewEnd < source.length ? ' …' : ''}</pre></div>
        <div className="guard-setting"><label htmlFor="depth-limit">Maximum permitted nesting depth <strong>{depthLimit}</strong></label><input id="depth-limit" type="range" min="2" max="16" value={depthLimit} onChange={e => { setDepthLimit(Number(e.target.value)); setCursor(0); setPlaying(false); }}/><div className="range-labels"><span>2 levels</span><span>16 levels</span></div></div>
        <div className="simulation-controls"><button className="button secondary" onClick={back} disabled={!cursor}><SkipBack/> Back</button><button className="button secondary" onClick={() => setPlaying(v => !v)} disabled={terminal || cursor >= trace.length}>{playing ? <Pause/> : <Play/>}{playing ? 'Pause' : 'Auto-play'}</button><button className="button secondary" onClick={() => setSpeed(v => v === 650 ? 300 : 650)}>{speed === 650 ? 'Normal speed' : 'Fast speed'}</button><button className="button primary" onClick={step} disabled={terminal || cursor >= trace.length}><SkipForward/> Step</button><button className="button primary" onClick={() => { setPlaying(false); setCursor(trace.length); }} disabled={cursor >= trace.length}><Zap/> Run</button></div>
        <div className={`simulation-status ${current?.operation === 'ACCEPT' ? 'success' : current?.operation === 'BLOCKED' || current?.operation === 'REJECT' ? 'danger' : ''}`}><span/>{status}<small>{cursor} / {trace.length} events</small></div>
        {current && <div className="event-explanation"><div><Tag tone={current.operation === 'PUSH' ? 'blue' : current.operation === 'POP' || current.operation === 'ACCEPT' ? 'green' : current.operation === 'BLOCKED' || current.operation === 'REJECT' ? 'red' : 'slate'}>{current.operation}</Tag><span>Position {current.position} · {current.symbol}</span></div><p>{current.detail}</p></div>}
      </section>
      <section className="panel runtime-panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVE PARSER FRAMES</span><span className="micro-label">LAST IN · FIRST OUT</span></div><strong className="depth-count">{stack.length} / {depthLimit}</strong></div>
        <div className="depth-meter"><div><span style={{ width: `${Math.min(100, stack.length / depthLimit * 100)}%` }}/></div><small>Observed nesting depth (abstraction of active parser calls)</small></div>
        <div className="runtime-stack"><div className="runtime-stack-head"><b>TOP OF STACK</b><span>{stack.length ? 'ACTIVE' : 'EMPTY'}</span></div><AnimatePresence initial={false}>{[...stack].reverse().map((frame, i) => <motion.div layout key={`${frame}-${stack.length - i}`} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className={`runtime-frame ${i === 0 ? 'frame-top' : ''}`}><span>{String(stack.length - i).padStart(2,'0')}</span><code>{frame}</code>{i === 0 && <b>ACTIVE</b>}</motion.div>)}</AnimatePresence>{!stack.length && <div className="runtime-empty"><Layers/><b>No active parser frames</b><span>Each open object or array pushes a frame here.</span></div>}</div>
        <div className="runtime-stats"><div><small>MAX DEPTH REACHED</small><b>{Math.max(0, ...visible.map(e => e.stack.length))}</b></div><div><small>CALLS / RETURNS</small><b>{visible.filter(e => e.operation === 'PUSH').length} / {visible.filter(e => e.operation === 'POP').length}</b></div></div>
        <div className="trace-history"><div className="trace-history-head"><b>EXECUTION TRACE</b><span>{visible.length} recorded events</span></div>{visible.length ? visible.map((event, i) => <div className={`history-row ${i === visible.length - 1 ? 'current' : ''}`} key={`${event.position}-${i}`}><code>{event.symbol} · {event.position}</code><Tag tone={event.operation === 'PUSH' ? 'blue' : event.operation === 'POP' || event.operation === 'ACCEPT' ? 'green' : event.operation === 'BLOCKED' || event.operation === 'REJECT' ? 'red' : 'slate'}>{event.operation}</Tag><small>depth {event.stack.length}</small></div>) : <p className="muted">Step or run the payload to record parser transitions.</p>}</div>
      </section>
    </div>
  </div>;
}

const pipeline = [
  { title: 'Extract the control-flow model', subtitle: 'Procedures, call sites, and sensitive operations', body: 'Identify procedure entries, branches, recursive call sites, return sites, and security-sensitive operations from the source program.', artifact: ['n₁: read(request)', 'n₂: call parseNode()', 'n₃: if authorized(resource)', 'n₄: privileged_action(resource)'], output: 'Stage 1 · Control-Flow Graph (CFG)' },
  { title: 'Encode as a pushdown system', subtitle: 'Control locations plus a return-site stack', body: 'Track the current program location and security state in finite control P, and push saved return sites onto the stack alphabet Γ.', artifact: ['r₁ · Internal: ⟨q_n₁, γ⟩ ↪ ⟨q_n₂, γ⟩', 'r₂ · Call:     ⟨q_n₂, γ⟩ ↪ ⟨q_parseNode, ret_n₃ · γ⟩', 'r₃ · Return:   ⟨q_exit, ret_n₃⟩ ↪ ⟨q_n₃, ε⟩'], output: 'Stage 2 · Pushdown System (PDS)' },
  { title: 'Specify the security invariant', subtitle: 'Define the target bad configurations', body: 'Combine program control with a finite security monitor D_auth. The monitor must abstract the resource identities or permission classes relevant to the property.', artifact: ['D_auth ∈ {UNKNOWN, ALLOWED, DENIED}', 'Bad state: q_n₄ ∧ D_auth ≠ ALLOWED', 'Product control state: P × D_auth'], output: 'Stage 3 · Product PDS & Bad Set' },
  { title: 'Compute reachability via saturation', subtitle: 'Finite P-automaton fixed-point search', body: 'Represent the target set of bad configurations C_bad as a finite P-automaton and add predecessor edges (pre*) until saturation.', artifact: ['Initialize P-automaton for C_bad', 'Apply pre*(C_bad) saturation rules to fixed point', 'Test whether ⟨q_init, [⊥]⟩ ∈ pre*(C_bad)', 'Extract a witness trace if reachable'], output: 'Stage 4 · Reachability Result' },
  { title: 'Validate feasibility and remediate', subtitle: 'Check concrete path conditions and patch', body: 'Because data values are abstracted, a witness trace is a candidate bug. Verify path feasibility in the concrete code, patch, and re-verify.', artifact: ['Inspect witness path in source code', 'Infeasible path → refine predicate abstraction', 'Feasible bug → add authorization check or depth guard', 'Re-run PDS reachability to confirm remediation'], output: 'Stage 5 · Verified Remediation' },
];
function AnalysisFlow() {
  const [active, setActive] = useState(0); const stage = pipeline[active];
  return <div className="analysis-layout"><div className="pipeline-list">{pipeline.map((item, i) => <button key={item.title} className={active === i ? 'selected' : ''} onClick={() => setActive(i)}><span className="pipeline-number">0{i + 1}</span><span><b>{item.title}</b><small>{item.subtitle}</small></span><ChevronRight/></button>)}</div>
    <AnimatePresence mode="wait"><motion.section key={active} className="panel pipeline-detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}><div className="eyebrow">STAGE 0{active + 1} · STATIC ANALYSIS PIPELINE</div><h2>{stage.title}</h2><p>{stage.body}</p><CodePanel title={stage.output}>{stage.artifact.map((line, i) => <div className="code-line" key={line}><span>{String(i + 1).padStart(2,'0')}</span><code>{line}</code></div>)}</CodePanel><div className="pipeline-actions"><button className="text-button" onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}><ChevronLeft/> Previous stage</button><button className="button primary" onClick={() => setActive((active + 1) % pipeline.length)}>{active === pipeline.length - 1 ? 'Restart pipeline' : 'Next stage'} <ChevronRight/></button></div></motion.section></AnimatePresence>
    <div className="theory-callout"><div><Braces/><div><b>Pushdown Systems (PDS) and Visibly Pushdown Automata (VPA)</b><p>Because procedure calls and returns have explicit stack behaviour, recursive program execution is naturally modelled as a Pushdown System, where reachability of regular configuration sets is decidable via P-automaton saturation. When execution traces are viewed as strings over an alphabet partitioned into call, return, and internal actions, they form a Visibly Pushdown Language (VPL), which is closed under intersection and complementation.</p></div></div></div>
    <div className="theory-grid"><article className="panel"><Tag tone="orange">P-AUTOMATON SATURATION</Tag><h3>Checking unbounded stack depth finitely</h3><p>For any regular set of pushdown configurations C, the predecessor set pre*(C) and successor set post*(C) are also regular and can be computed in polynomial time by saturating a finite P-automaton.</p><code className="formula">C ⊆ P × Γ*  ⇒  pre<sup>*</sup>(C), post<sup>*</sup>(C) are regular</code></article><article className="panel"><Tag tone="violet">CFL-REACHABILITY</Tag><h3>Filtering out mismatched call–return paths</h3><p>Valid interprocedural paths must have properly nested calls and returns (forming a balanced Dyck language). Pushdown analysis and procedure summaries prevent matching a call site with the wrong return site.</p><code className="formula">callᵢ · returnᵢ  (balanced interprocedural path)</code></article></div>
  </div>;
}

const properties = {
  authorization: { title: 'Authorization invariant', question: 'Can a privileged operation execute on a nested child resource when only the parent resource was authorized?', bad: 'q_privileged ∧ D_auth(child) ≠ ALLOWED', state: 'D_auth ∈ {UNKNOWN, ALLOWED, DENIED}', witness: ['handle(request)', 'authorize(parent) → D_auth(parent) = ALLOWED', 'process(child) → D_auth(child) = UNKNOWN', 'privileged(child) → VIOLATION'], safe: 'In the combined program and security-state model, every path to privileged(child) establishes D_auth(child) = ALLOWED first.' },
  cleanup: { title: 'Resource cleanup', question: 'Can a procedure exit along an error or early-return branch while a required lock or handle remains held?', bad: 'q_exit ∧ D_res = HELD', state: 'D_res ∈ {UNACQUIRED, HELD, RELEASED}', witness: ['acquire(lock) → D_res = HELD', 'call(worker)', 'worker takes error branch', 'exit while D_res = HELD → VIOLATION'], safe: 'Every normal and exceptional return path transitions D_res from HELD to RELEASED before exiting the procedure.' },
  depth: { title: 'Recursion depth bound', question: 'Can any reachable configuration exceed a specified recursion-depth budget K?', bad: '|w| − 1 > K  for configuration ⟨q, w⟩ (w includes ⊥)', state: 'Configuration space: P × Γ*', witness: ['parseNode(root)', 'parseNode(child)', 'parseNode(grandchild)', 'stack depth K + 1 → BOUND EXCEEDED'], safe: 'All reachable stack configurations in the analyzed model stay within depth K.' },
};
type PropertyKey = keyof typeof properties;
function VerificationSection() {
  const [selected, setSelected] = useState<PropertyKey>('authorization'); const p = properties[selected];
  return <><Heading eyebrow="05 · FORMAL VERIFICATION" title="Combine pushdown control with explicit security-state models." detail="A pushdown stack only tracks call–return nesting. Verifying authorization, cleanup, or depth requires pairing the stack with an explicit finite state or resource bound."/><div className="property-tabs">{(Object.keys(properties) as PropertyKey[]).map(key => <button key={key} onClick={() => setSelected(key)} className={selected === key ? 'selected' : ''}>{properties[key].title}</button>)}</div>
    <div className="verification-layout"><section className="panel property-panel"><div className="eyebrow">PROPERTY SPECIFICATION</div><h2>{p.title}</h2><p>{p.question}</p><div className="formula-block"><small>TARGET BAD CONFIGURATION</small><code>{p.bad}</code><small>MODELLED SECURITY / RESOURCE STATE</small><code>{p.state}</code></div><div className="product-explanation"><b>Combined program and security-state model</b><p>A PDS does not automatically infer data ownership or resource status. The analyzer forms the product control space <code>(P × D) × Γ*</code> so the stack tracks call context while <code>D</code> tracks the security fact. For authorization, <code>D</code> must be a finite abstraction that distinguishes the resource identities or permission classes relevant to the property; the three-state domain shown here is a teaching abstraction, not a universal identity model.</p>{selected === 'depth' && <p className="depth-explain">A productive cycle on an accepting path of the automaton recognizing reachable configurations permits arbitrarily long stack words, demonstrating unbounded stack growth in the represented reachable configuration set.</p>}</div></section>
      <div className="outcome-column"><article className="panel outcome-card risk"><Tag tone="red">CANDIDATE COUNTEREXAMPLE</Tag><h3>Witness trace found</h3><p>Reachability analysis returns an abstract call–return path to the bad state:</p><ol>{p.witness.map(s => <li key={s}>{s}</li>)}</ol><small>Check whether concrete branch conditions allow this path in the real program.</small></article><article className="panel outcome-card safe"><Tag tone="green">SAFE WITHIN MODEL</Tag><h3>No bad configuration reachable</h3><p>{p.safe}</p><small>Safety holds relative to the modelled control flow and security predicates.</small></article></div>
    </div>
    <div className="wpds-note"><Database/><div><b>Interprocedural dataflow: IFDS/IDE and Weighted Pushdown Systems (WPDS)</b><p>To propagate richer dataflow facts across recursive calls, a WPDS assigns each transition rule a weight from a bounded idempotent semiring <code className="semiring-code">S = (D, ⊕, ⊗, <span className="overline">0</span>, <span className="overline">1</span>)</code>: <code>⊗</code> composes transfer functions along a path, and <code>⊕</code> merges facts across converging branches.</p></div></div>
  </>;
}

const cases = [
  { title: 'Uncontrolled recursive parsing', class: 'Resource exhaustion', trigger: 'Attacker supplies deeply nested JSON or XML', flow: [{ text: 'POST /api/import', depth: 0, op: 'INPUT' }, { text: 'parseObject(body)', depth: 1, op: 'PUSH' }, { text: 'parseValue(child)', depth: 2, op: 'PUSH' }, { text: 'parseObject(grandchild)', depth: 3, op: 'PUSH' }, { text: '… depth exceeds limit K', depth: 4, op: 'BLOCK' }], issue: 'When input nesting directly drives recursive calls without a depth counter, deeply nested payloads can exhaust the process call stack or CPU budget.', fix: 'Enforce an explicit maximum nesting depth before descending into nested containers, or refactor recursion into an explicit heap-bounded worklist.' },
  { title: 'Authorization across nested resources', class: 'Missing security check', trigger: 'Child operation relies on an outer parent check', flow: [{ text: 'handle(request)', depth: 0, op: 'CALL' }, { text: 'authorize(parent) → ALLOWED', depth: 1, op: 'CHECK' }, { text: 'process(child)', depth: 1, op: 'CALL' }, { text: 'privileged(child)', depth: 2, op: 'BAD' }], issue: 'Validating permissions on a top-level container does not automatically authorize every nested child resource referenced inside a recursive structure.', fix: 'Model and enforce authorization checks per resource identifier at the privileged sink, or prove that parent scope covers the child resource.' },
  { title: 'Resource cleanup on exceptional exits', class: 'Lifecycle violation', trigger: 'Error path unwinds frames without releasing a lock', flow: [{ text: 'acquire(lock)', depth: 0, op: 'ACQUIRE' }, { text: 'call(worker)', depth: 1, op: 'PUSH' }, { text: 'worker throws exception', depth: 2, op: 'EXCEPTION' }, { text: 'exit while lock = HELD', depth: 1, op: 'BAD' }], issue: 'When a nested call exits early via an exception or error return, stack unwinding can bypass release logic and leave locks or descriptors held.', fix: 'Use structured finally / defer blocks and include both normal and exceptional return edges in the pushdown verification model.' },
  { title: 'Return-address integrity and shadow stacks', class: 'Runtime control-flow integrity', trigger: 'Memory corruption overwrites a saved return address', flow: [{ text: 'call() pushes return addr to shadow stack', depth: 0, op: 'PUSH' }, { text: 'Stack buffer overflow corrupts return addr', depth: 1, op: 'CORRUPT' }, { text: 'ret compares stack addr with shadow stack', depth: 1, op: 'MISMATCH' }, { text: 'Hardware / runtime traps execution', depth: 0, op: 'BLOCK' }], issue: 'Return-Oriented Programming (ROP) overwrites saved return addresses on the data stack so a ret instruction jumps to attacker-chosen gadgets instead of the caller.', fix: 'Intel CET and LLVM ShadowCallStack are distinct hardware- and compiler-supported mechanisms for protected return-address storage. Their enforcement and mismatch handling depend on the architecture, compiler, and runtime; they are not identical implementations or general-purpose PDAs.' },
];
function CasesSection() {
  const [active, setActive] = useState(0); const c = cases[active];
  return <><Heading eyebrow="06 · SECURITY APPLICATIONS" title="Four recursive vulnerability and enforcement patterns." detail="Connect pushdown control-flow modeling and runtime return-address protection to concrete application-security risks."/><div className="case-layout"><nav className="case-selector" aria-label="Security scenarios">{cases.map((item, i) => <button key={item.title} className={active === i ? 'selected' : ''} onClick={() => setActive(i)}><span>0{i + 1}</span><div><b>{item.title}</b><small>{item.class}</small></div><ChevronRight/></button>)}</nav>
    <AnimatePresence mode="wait"><motion.section key={active} className="panel case-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="case-topline"><Tag tone={active === 0 ? 'orange' : active === 3 ? 'violet' : 'blue'}>{c.class}</Tag><span>SCENARIO 0{active + 1}</span></div><h2>{c.title}</h2><p className="case-trigger">Trigger: {c.trigger}</p><div className="case-flow">{c.flow.map((item, i) => <div className={`case-flow-row ${item.op === 'BAD' || item.op === 'BLOCK' || item.op === 'MISMATCH' ? 'problem' : ''}`} key={item.text} style={{ marginLeft: `${item.depth * 16}px` }}><span>{String(i + 1).padStart(2, '0')}</span><code>{item.text}</code><Tag tone={item.op === 'PUSH' || item.op === 'CALL' ? 'blue' : item.op === 'BAD' || item.op === 'BLOCK' || item.op === 'MISMATCH' || item.op === 'CORRUPT' ? 'red' : 'slate'}>{item.op}</Tag></div>)}</div><div className="case-insight"><b>Security risk</b><p>{c.issue}</p></div><div className="case-remedy"><b><Check/> Engineering mitigation</b><p>{c.fix}</p></div></motion.section></AnimatePresence></div></>;
}

function Overview({ go }: { go: (s: Section) => void }) {
  return <>
    <section className="overview-hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-mark"/> FORMAL METHODS · APPLICATION SECURITY</div><h1>Model recursive execution.<br/><span>Verify security reachability.</span></h1><p>Pushdown Automata and Pushdown Systems provide a formal stack model for nested procedure calls and returns—supporting interprocedural static analysis, safety verification, and runtime control-flow protection.</p><div className="hero-actions"><button className="button primary large" onClick={() => go('stack')}>Explore stack semantics <ArrowRight/></button><button className="button secondary large" onClick={() => go('playground')}>Open parser simulation <Play/></button></div><div className="hero-points"><span><i/> Formal PDA & PDS tuples</span><span><i/> Interactive stack traces</span><span><i/> Security case studies</span></div></div>
      <div className="hero-model"><div className="hero-model-head"><span>CONTROL STATE + RETURN STACK</span><span>CALL = PUSH · RETURN = POP</span></div><div className="procedure-flow"><div className="procedure-node"><small>ENTRY</small><b>main()</b></div><div className="flow-arrow"><ArrowRight/></div><div className="procedure-node"><small>CALL</small><b>parse()</b></div><div className="flow-arrow"><ArrowRight/></div><div className="procedure-node recursive"><small>ACTIVE CONTROL</small><b>parseNode()</b><span>↺ recursive</span></div></div><div className="hero-stack-title"><b>SAVED RETURN-SITE STACK (Γ*)</b><span>TOP ↓</span></div><div className="hero-stack"><div className="hero-stack-row active"><b>ret_parseNode  (return → parseNode)</b><span>LATEST CALL</span></div><div className="hero-stack-row"><b>ret_parse  (return → parse)</b><span>CALLER</span></div><div className="hero-stack-row"><b>ret_main  (return → main)</b><span>OUTER CALLER</span></div><div className="hero-stack-row base"><b>⊥</b><span>BOTTOM MARKER</span></div></div><div className="hero-model-foot"><span>Control state tracks active location</span><span>Stack stores pending return sites</span></div></div>
    </section>
    <section className="definition-section"><div className="section-title-row"><div><div className="eyebrow">FORMAL FOUNDATIONS</div><h2>Two related pushdown models with distinct roles</h2></div><p>A Pushdown Automaton recognizes context-free input languages; a Pushdown System models recursive program execution for reachability analysis.</p></div><div className="definition-grid"><article className="panel definition-card"><Tag tone="blue">LANGUAGE RECOGNITION</Tag><h3>Nondeterministic PDA (NPDA)</h3><code className="tuple">M = (Q, Σ, Γ, δ, q₀, Z₀, F)</code><dl><div><dt>Q</dt><dd>Finite set of control states</dd></div><div><dt>Σ</dt><dd>Input alphabet (e.g., tokens {`{`}, {`}`})</dd></div><div><dt>Γ</dt><dd>Stack alphabet</dd></div><div><dt>δ</dt><dd>Transition relation</dd></div><div><dt>q₀, Z₀</dt><dd>Initial control state and bottom stack symbol</dd></div><div><dt>F</dt><dd>Set of accepting states</dd></div></dl><p className="definition-note"><b>Transition relation:</b> δ: Q × (Σ ∪ {'{ε}'}) × Γ → P<sub>fin</sub>(Q × Γ*). An NPDA consumes input symbols from Σ and uses Γ* to recognize nested syntactic structures.</p></article><article className="panel definition-card"><Tag tone="violet">PROGRAM VERIFICATION</Tag><h3>Pushdown System (PDS)</h3><code className="tuple">P = (P, Γ, ⊥, Δ)</code><dl><div><dt>P</dt><dd>Finite control states (program location & predicates)</dd></div><div><dt>Γ</dt><dd>Stack alphabet (saved return sites)</dd></div><div><dt>⊥</dt><dd>Bottom-of-stack marker</dd></div><div><dt>Δ</dt><dd>Finite set of stack rewrite rules</dd></div></dl><p className="definition-note">A configuration is ⟨q, w⟩ ∈ P × Γ*, where q ∈ P is the currently executing location/state and w ∈ Γ* is the stack of saved return sites. Physical stack exhaustion requires layering an explicit depth bound K onto this model.</p></article></div>
    </section>
    <section className="transition-section"><div className="section-title-row"><div><div className="eyebrow">PUSHDOWN REWRITE RULES</div><h2>Three canonical program transitions</h2></div><p>In this consistent convention, control state q tracks the active location and the stack stores saved return sites above ⊥.</p></div><div className="transition-grid"><article className="panel"><Tag tone="slate">INTERNAL STEP</Tag><code>⟨q₁, γ⟩ ↪ ⟨q₂, γ⟩</code><p>Advance from location q₁ to q₂ within the same procedure while leaving the top return symbol γ unchanged.</p></article><article className="panel"><Tag tone="blue">PROCEDURE CALL (PUSH)</Tag><code>⟨q_call, γ⟩ ↪ ⟨q_entry, ret_caller · γ⟩</code><p>Transfer control to callee entry q_entry and push the caller's return site ret_caller onto the stack above γ.</p></article><article className="panel"><Tag tone="green">PROCEDURE RETURN (POP)</Tag><code>⟨q_exit, ret_caller⟩ ↪ ⟨q_ret, ε⟩</code><p>Pop the top return symbol ret_caller (replacing it with ε) and restore control to the caller's return location q_ret.</p></article></div></section>
  </>;
}
function StackSection() { return <><Heading eyebrow="02 · STACK SEMANTICS" title="A LIFO stack preserves exact call  return context." detail="Step through a seven-stage recursive trace. Control state q tracks the active procedure, while the stack stores pending return sites in Last-In, First-Out order."/><StackVisualizer/><div className="theory-grid"><article className="panel"><h3>Why a plain call graph is insufficient</h3><p>A flat call graph records which procedures can invoke one another, but loses the history of active callers. Without a stack, an analysis cannot distinguish returning from the inner recursive parse() call (to validate) versus returning from the outer parse() call (to main).</p></article><article className="panel"><h3>Top-of-stack rewrite semantics</h3><p>Each PDS return rule pops only the topmost return symbol by rewriting it to ε, while preserving the deeper return sites w below it. This guarantees that every return restores the exact caller that initiated that invocation.</p><code className="formula">⟨q_exit, ret_caller · w⟩ ↪ ⟨q_ret, w⟩</code></article></div></>; }
function PlaygroundSection() { return <><Heading eyebrow="03 · APPLICATION SIMULATION" title="Untrusted input can drive recursive-descent stack depth." detail="Step through a recursive JSON parser to observe how nested containers push parser frames and how an explicit depth policy prevents unbounded recursion."/><ParserSimulation/></>; }
function AnalysisSection() { return <><Heading eyebrow="04 · STATIC ANALYSIS" title="Pushdown model checking reduces interprocedural safety to reachability." detail="Follow how source code is abstracted into a Pushdown System, paired with a security monitor, and checked across unbounded call depths via P-automaton saturation."/><AnalysisFlow/><div className="distinction-panel"><b>Deterministic syntax parsing vs. nondeterministic static analysis</b><p>A recursive-descent JSON parser is deterministic because the next input token selects a unique grammar rule. Static program analysis abstracts away concrete input values, so conditional branches become nondeterministic transitions that over-approximate all feasible runtime paths.</p></div></>; }

export default function App() {
  const [section, setSection] = useState<Section>('overview'); const reduceMotion = useReducedMotion(); const activeIndex = modules.findIndex(m => m.id === section);
  const navigate = (id: Section) => { setSection(id); window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); };
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.altKey || event.ctrlKey || event.metaKey) return; const target = event.target as HTMLElement | null; if (target && (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(target.tagName) || target.isContentEditable || target.closest('[contenteditable="true"], [role="textbox"], [role="slider"]'))) return; if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); navigate(modules[Math.min(modules.length - 1, activeIndex + 1)].id); } if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); navigate(modules[Math.max(0, activeIndex - 1)].id); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [activeIndex, reduceMotion]);
  let content: ReactNode;
  switch (section) {
    case 'overview': content = <Overview go={navigate}/>; break;
    case 'stack': content = <StackSection/>; break;
    case 'playground': content = <PlaygroundSection/>; break;
    case 'analysis': content = <AnalysisSection/>; break;
    case 'verification': content = <VerificationSection/>; break;
    case 'cases': content = <CasesSection/>; break;
  }
  return <MotionConfig reducedMotion="user"><div className="app-shell"><header className="site-header"><div className="brand"><span className="brand-mark"><Layers/></span><div><b>Pushdown Automata</b><small>RECURSIVE SECURITY ANALYSIS</small></div></div><nav className="module-nav" aria-label="Learning sections">{modules.map(item => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><span>{item.short}</span>{item.label}</button>)}</nav></header>
    <main className="main-content"><AnimatePresence mode="wait"><motion.div key={section} className="page-content" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} transition={{ duration: .2 }}>{content}</motion.div></AnimatePresence>
      <footer className="module-footer"><button className="text-button" onClick={() => navigate(modules[Math.max(0, activeIndex - 1)].id)} disabled={activeIndex === 0}><ArrowLeft/> Previous section</button><div className="footer-progress"><span style={{ width: `${((activeIndex + 1) / modules.length) * 100}%` }}/></div><button className="button primary" onClick={() => navigate(modules[Math.min(modules.length - 1, activeIndex + 1)].id)} disabled={activeIndex === modules.length - 1}>Next section <ArrowRight/></button></footer>
    </main></div></MotionConfig>;
}
