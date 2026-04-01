// ============================================================
// pages/Home.jsx — FIXED
// Fixes:
// - Removed scanlines (CSS ::after animation was repainting whole page)
// - Removed animated-bg class (gradient animation was forcing
//   composite layers on the entire page — huge GPU cost)
// - Replaced inline onMouseEnter/Leave style mutations with
//   CSS classes for hover states (no JS on every hover)
// - Moved grid breakpoints to a single <style> block
// - Terminal animation kept but debounced to avoid rapid state updates
// ============================================================

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const AGENTS = [
  {
    id:          "bug",
    label:       "Bug Detector",
    badge:       "Agent 01",
    color:       "var(--agent-bug)",
    dim:         "var(--agent-bug-dim)",
    glow:        "var(--agent-bug-glow)",
    border:      "rgba(244,63,94,0.25)",
    gradient:    "linear-gradient(135deg,#f43f5e,#fb923c)",
    description: "Identifies logical errors, null pointer issues, incorrect control flow, and runtime exceptions before they reach production.",
    tags:        ["Null Safety","Control Flow","Runtime Errors","Logic Bugs"],
    icon:        BugIcon,
  },
  {
    id:          "security",
    label:       "Security Analyst",
    badge:       "Agent 02",
    color:       "var(--agent-security)",
    dim:         "var(--agent-security-dim)",
    glow:        "var(--agent-security-glow)",
    border:      "rgba(245,158,11,0.25)",
    gradient:    "linear-gradient(135deg,#f59e0b,#fde68a)",
    description: "Scans for OWASP Top 10 vulnerabilities, injection risks, insecure data handling, and authentication flaws.",
    tags:        ["OWASP Top 10","Injection Risks","Auth Flaws","Data Security"],
    icon:        ShieldIcon,
  },
  {
    id:          "perf",
    label:       "Optimization Advisor",
    badge:       "Agent 03",
    color:       "var(--agent-perf)",
    dim:         "var(--agent-perf-dim)",
    glow:        "var(--agent-perf-glow)",
    border:      "rgba(16,185,129,0.25)",
    gradient:    "linear-gradient(135deg,#10b981,#2dd4bf)",
    description: "Identifies performance bottlenecks, redundant computations, and suggests algorithmic or structural improvements.",
    tags:        ["Big-O Analysis","Memory Usage","Redundancy","Refactoring"],
    icon:        ZapIcon,
  },
];

const FEATURES = [
  { icon:"⬡", title:"LangGraph Orchestration",  description:"Stateful multi-agent graph with conditional routing and shared memory across all review agents." },
  { icon:"⚡", title:"Parallel Analysis",         description:"All three agents run simultaneously — full review in seconds, not minutes." },
  { icon:"🔬", title:"GPT-4o Powered",            description:"Each agent uses specialized prompting strategies tuned for its exact domain of expertise." },
  { icon:"📦", title:"REST API Backend",          description:"FastAPI async endpoints handle code submission, polling, and structured result retrieval." },
  { icon:"🎯", title:"Python & JavaScript",       description:"Full support for both languages with language-aware analysis and context-sensitive suggestions." },
  { icon:"🐳", title:"Docker Ready",              description:"Containerized deployment with a single docker-compose up for local or cloud environments." },
];

const TERMINAL_LINES = [
  { text: "$ codesentinel analyze --file app.py",          color: "var(--text-secondary)", delay: 0    },
  { text: "  Initializing agents...",                       color: "var(--text-tertiary)",  delay: 500  },
  { text: "  ✓ Bug Detector          [READY]",              color: "var(--agent-bug)",      delay: 900  },
  { text: "  ✓ Security Analyst      [READY]",              color: "var(--agent-security)", delay: 1300 },
  { text: "  ✓ Optimization Advisor  [READY]",              color: "var(--agent-perf)",     delay: 1700 },
  { text: "  Running parallel analysis...",                 color: "var(--text-tertiary)",  delay: 2200 },
  { text: "  ━━━━━━━━━━━━━━━━━━━━━━ 100%",                 color: "var(--accent-primary)", delay: 3000 },
  { text: "  → 3 bugs · 1 vulnerability · 4 optimizations",color: "var(--text-primary)",   delay: 3600 },
  { text: "  Report ready. ✓",                              color: "var(--agent-perf)",     delay: 4100 },
];

// ── Icons ──
function BugIcon({ size=24, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M9 9h6M9 12h6M9 15h4"/>
      <path d="M6.5 9A5.5 5.5 0 0117.5 9v7a5.5 5.5 0 01-11 0V9z"/>
      <path d="M3 11h3M18 11h3M3 16h3M18 16h3M6 7L4 5M18 7l2-2"/>
    </svg>
  );
}
function ShieldIcon({ size=24, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}
function ZapIcon({ size=24, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

// ── Terminal — batches state updates to avoid rapid re-renders ──
function TerminalPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cursor, setCursor]             = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Use a single interval that checks elapsed time
    // instead of N separate setTimeouts (avoids timer pile-up)
    const startAt = Date.now();
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      const elapsed = Date.now() - startAt;
      let count = 0;
      for (let i = 0; i < TERMINAL_LINES.length; i++) {
        if (elapsed >= TERMINAL_LINES[i].delay + 600) count = i + 1;
      }
      setVisibleCount((prev) => (count > prev ? count : prev));
      if (count >= TERMINAL_LINES.length) clearInterval(interval);
    }, 200); // check every 200ms — smooth without being expensive

    const cursorInterval = setInterval(() => {
      if (mountedRef.current) setCursor((v) => !v);
    }, 530);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div style={{
      borderRadius: "var(--radius-lg)",
      overflow:     "hidden",
      border:       "1px solid var(--border-default)",
      background:   "var(--bg-surface)",
      boxShadow:    "var(--shadow-lg)",
      width:        "100%",
      maxWidth:     "500px",
    }}>
      {/* Title bar */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "0.5rem",
        padding:      "0.65rem 1rem",
        borderBottom: "1px solid var(--border-subtle)",
        background:   "rgba(255,255,255,0.02)",
      }}>
        {["#f43f5e","#f59e0b","#10b981"].map((c) => (
          <span key={c} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:0.7, flexShrink:0 }} aria-hidden="true" />
        ))}
        <span style={{ marginLeft:"auto", fontFamily:"var(--font-mono)", fontSize:"0.65rem", color:"var(--text-tertiary)", letterSpacing:"0.08em" }}>
          codesentinel — zsh
        </span>
      </div>

      {/* Body */}
      <div style={{ padding:"1.25rem", minHeight:"210px", background:"rgba(5,5,10,0.9)" }}>
        {TERMINAL_LINES.map((line, i) => (
          <div key={i} style={{
            fontFamily:  "var(--font-mono)",
            fontSize:    "0.76rem",
            lineHeight:  "1.85",
            color:       line.color,
            opacity:     i < visibleCount ? 1 : 0,
            transform:   i < visibleCount ? "none" : "translateX(-6px)",
            transition:  "opacity 0.25s ease, transform 0.25s ease",
            whiteSpace:  "pre",
          }}>
            {line.text}
          </div>
        ))}
        {visibleCount >= TERMINAL_LINES.length && (
          <span style={{
            display:    "inline-block",
            fontFamily: "var(--font-mono)",
            fontSize:   "0.76rem",
            color:      "var(--accent-primary)",
            opacity:    cursor ? 1 : 0,
            transition: "opacity 0.1s",
          }} aria-hidden="true">█</span>
        )}
      </div>
    </div>
  );
}

// ── AgentCard — CSS class hover, no inline JS mutations ──
function AgentCard({ agent, index }) {
  const Icon = agent.icon;
  return (
    <div
      className={`agent-card agent-card--${agent.id}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Corner glow */}
      <div className="agent-card__glow" aria-hidden="true"
        style={{ background:`radial-gradient(circle, ${agent.glow} 0%, transparent 70%)` }} />

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <span style={{
          fontFamily:"var(--font-mono)", fontSize:"0.63rem", fontWeight:700,
          letterSpacing:"0.1em", textTransform:"uppercase",
          padding:"0.18em 0.6em", borderRadius:"9999px",
          background:agent.dim, color:agent.color, border:`1px solid ${agent.border}`,
        }}>
          {agent.badge}
        </span>
        <div className="agent-card__icon" style={{ background:agent.dim, border:`1px solid ${agent.border}` }}>
          <Icon size={20} color={agent.color} />
        </div>
      </div>

      <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.1rem", fontWeight:700,
        color:"var(--text-primary)", marginBottom:"0.6rem", letterSpacing:"-0.01em" }}>
        {agent.label}
      </h3>

      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.86rem", color:"var(--text-secondary)",
        lineHeight:1.65, marginBottom:"1.25rem" }}>
        {agent.description}
      </p>

      <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem" }}>
        {agent.tags.map((tag) => (
          <span key={tag} style={{
            fontFamily:"var(--font-mono)", fontSize:"0.63rem",
            padding:"0.2em 0.55em", borderRadius:"9999px",
            background:agent.dim, color:agent.color, border:`1px solid ${agent.border}`,
            letterSpacing:"0.04em",
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── FeatureCard ──
function FeatureCard({ icon, title, description, index }) {
  return (
    <div className="feature-card" style={{ animationDelay:`${index * 0.06}s` }}>
      <div style={{ fontSize:"1.4rem", marginBottom:"0.75rem", lineHeight:1 }} aria-hidden="true">{icon}</div>
      <h4 style={{ fontFamily:"var(--font-display)", fontSize:"0.92rem", fontWeight:600,
        color:"var(--text-primary)", marginBottom:"0.4rem", letterSpacing:"-0.01em" }}>
        {title}
      </h4>
      <p style={{ fontFamily:"var(--font-body)", fontSize:"0.8rem", color:"var(--text-secondary)", lineHeight:1.6 }}>
        {description}
      </p>
    </div>
  );
}

// ── StatPill ──
function StatPill({ value, label, color }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"0.5rem",
      padding:"0.4rem 0.85rem", borderRadius:"9999px",
      background:"var(--bg-surface)", border:"1px solid var(--border-default)",
    }}>
      <span style={{ fontFamily:"var(--font-display)", fontSize:"0.95rem", fontWeight:700, color }}>{value}</span>
      <span style={{ fontFamily:"var(--font-body)", fontSize:"0.72rem", color:"var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}

// ── Home page ──
export default function Home() {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-void)" }}>

      {/* HERO */}
      <section className="container-app" style={{ paddingTop:"5rem", paddingBottom:"5rem" }}>
        <div className="hero-grid">

          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>

            <div className="animate-fade-up" style={{ animationDelay:"0s" }}>
              <span style={{
                display:"inline-flex", alignItems:"center", gap:"0.5rem",
                padding:"0.3rem 0.85rem", borderRadius:"9999px",
                background:"var(--accent-primary-dim)", border:"1px solid var(--border-accent)",
                fontFamily:"var(--font-mono)", fontSize:"0.7rem",
                color:"var(--text-accent)", letterSpacing:"0.08em", textTransform:"uppercase",
              }}>
                <span style={{
                  width:"6px", height:"6px", borderRadius:"50%",
                  background:"var(--accent-primary)", flexShrink:0,
                  animation:"pulse-glow 2.5s ease-in-out infinite",
                }} aria-hidden="true" />
                LangGraph · CrewAI · GPT-4o
              </span>
            </div>

            <div className="animate-fade-up" style={{ animationDelay:"0.07s" }}>
              <h1 className="text-hero">
                Code review{" "}
                <span style={{
                  background:"linear-gradient(135deg,#818cf8 0%,#a78bfa 50%,#c084fc 100%)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                }}>
                  reimagined
                </span>
                <br />by AI agents.
              </h1>
            </div>

            <p className="animate-fade-up" style={{
              animationDelay:"0.12s",
              fontFamily:"var(--font-body)", fontSize:"clamp(0.92rem,1.4vw,1.05rem)",
              color:"var(--text-secondary)", lineHeight:1.7, maxWidth:"44ch",
            }}>
              Three specialized AI agents — Bug Detector, Security Analyst,
              and Optimization Advisor — analyze your code in parallel and
              deliver a structured review in seconds.
            </p>

            <div className="animate-fade-up" style={{ animationDelay:"0.17s", display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
              <Link to="/review" className="btn btn-primary" style={{ fontSize:"0.9rem", padding:"0.65rem 1.5rem" }}>
                Analyze Code →
              </Link>
              <a href="#agents" className="btn btn-ghost" style={{ fontSize:"0.9rem", padding:"0.65rem 1.5rem" }}>
                How It Works
              </a>
            </div>

            <div className="animate-fade-up" style={{ animationDelay:"0.22s", display:"flex", gap:"0.6rem", flexWrap:"wrap" }}>
              <StatPill value="3"        label="AI Agents"  color="var(--text-accent)" />
              <StatPill value="Parallel" label="Execution"  color="var(--agent-perf)" />
              <StatPill value="GPT-4o"   label="Powered"    color="var(--agent-security)" />
            </div>
          </div>

          {/* Right — terminal */}
          <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center" }}>
            <TerminalPreview />
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="container-app" style={{ paddingBottom:"5rem" }}>
        <div className="animate-fade-up" style={{ textAlign:"center", marginBottom:"3rem" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--text-accent)",
            letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"0.75rem" }}>
            The Review Pipeline
          </p>
          <h2 className="text-section-title">
            Three agents.{" "}
            <span style={{
              background:"linear-gradient(135deg,#818cf8,#c084fc)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>One review.</span>
          </h2>
          <p style={{ fontFamily:"var(--font-body)", color:"var(--text-secondary)", fontSize:"0.95rem",
            marginTop:"0.75rem", maxWidth:"48ch", marginInline:"auto" }}>
            Each agent is a specialized expert, orchestrated by LangGraph
            to run in parallel and aggregate into one actionable report.
          </p>
        </div>

        <div className="agents-grid">
          {AGENTS.map((agent, i) => <AgentCard key={agent.id} agent={agent} index={i} />)}
        </div>

        {/* Pipeline label */}
        <div aria-hidden="true" style={{
          display:"flex", justifyContent:"center", alignItems:"center",
          gap:"0.4rem", marginTop:"2rem",
          fontFamily:"var(--font-mono)", fontSize:"0.68rem", color:"var(--text-tertiary)",
          flexWrap:"wrap",
        }}>
          <span style={{ color:"var(--agent-bug)" }}>Bug</span>
          <span>────</span>
          <span style={{ color:"var(--accent-primary)" }}>Orchestrator</span>
          <span>────</span>
          <span style={{ color:"var(--agent-security)" }}>Security</span>
          <span>────</span>
          <span style={{ color:"var(--accent-primary)" }}>Aggregator</span>
          <span>────</span>
          <span style={{ color:"var(--agent-perf)" }}>Performance</span>
        </div>
      </section>

      <div className="container-app"><hr className="divider" /></div>

      {/* FEATURES */}
      <section className="section container-app">
        <div className="animate-fade-up" style={{ textAlign:"center", marginBottom:"3rem" }}>
          <p style={{ fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--text-accent)",
            letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"0.75rem" }}>
            Under The Hood
          </p>
          <h2 className="text-section-title">
            Built for{" "}
            <span style={{
              background:"linear-gradient(135deg,#818cf8,#c084fc)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>production.</span>
          </h2>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="section-sm container-app" style={{ paddingBottom:"7rem" }}>
        <div className="animate-fade-up cta-panel">
          <div className="cta-panel__glow" aria-hidden="true" />
          <p style={{ fontFamily:"var(--font-mono)", fontSize:"0.7rem", color:"var(--text-accent)",
            letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"1rem" }}>
            Ready to review?
          </p>
          <h2 className="text-section-title" style={{ marginBottom:"0.875rem" }}>
            Paste your code.<br />
            <span style={{
              background:"linear-gradient(135deg,#818cf8,#c084fc)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>Get instant insights.</span>
          </h2>
          <p style={{ fontFamily:"var(--font-body)", color:"var(--text-secondary)", fontSize:"0.92rem",
            marginBottom:"2rem", maxWidth:"38ch", marginInline:"auto" }}>
            No signup. No config. Paste your Python or JavaScript and let the agents work.
          </p>
          <Link to="/review" className="btn btn-primary cta-btn" style={{ fontSize:"1rem", padding:"0.75rem 2rem" }}>
            Start Free Review →
          </Link>
        </div>
      </section>

      {/* ── All CSS for this page in one block — no style recalc fights ── */}
      <style>{`
        /* Hero grid */
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        /* Agents grid */
        .agents-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 1.25rem;
        }

        /* Features grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 1rem;
        }

        /* Agent card — CSS hover, no JS */
        .agent-card {
          position: relative;
          overflow: hidden;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          animation: fade-up 0.5s cubic-bezier(0.4,0,0.2,1) both;
          /* Only transition shadow + border — no transform (avoids reflow) */
          transition:
            border-color 0.25s ease,
            box-shadow   0.25s ease;
        }
        .agent-card:hover { border-color: var(--border-strong); }
        .agent-card--bug:hover      { border-color: rgba(244,63,94,0.4);  box-shadow: 0 12px 32px rgba(0,0,0,0.35), 0 0 24px var(--agent-bug-glow); }
        .agent-card--security:hover { border-color: rgba(245,158,11,0.4); box-shadow: 0 12px 32px rgba(0,0,0,0.35), 0 0 24px var(--agent-security-glow); }
        .agent-card--perf:hover     { border-color: rgba(16,185,129,0.4); box-shadow: 0 12px 32px rgba(0,0,0,0.35), 0 0 24px var(--agent-perf-glow); }

        .agent-card__glow {
          position: absolute;
          top: -50px; right: -50px;
          width: 180px; height: 180px;
          border-radius: 50%;
          opacity: 0.18;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .agent-card:hover .agent-card__glow { opacity: 0.45; }

        .agent-card__icon {
          width: 44px; height: 44px;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          transition: box-shadow 0.25s ease;
        }
        .agent-card--bug:hover      .agent-card__icon { box-shadow: 0 0 14px var(--agent-bug-glow); }
        .agent-card--security:hover .agent-card__icon { box-shadow: 0 0 14px var(--agent-security-glow); }
        .agent-card--perf:hover     .agent-card__icon { box-shadow: 0 0 14px var(--agent-perf-glow); }

        /* Feature card */
        .feature-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.4rem;
          animation: fade-up 0.5s cubic-bezier(0.4,0,0.2,1) both;
          transition: border-color 0.22s ease, box-shadow 0.22s ease;
        }
        .feature-card:hover {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }

        /* CTA panel */
        .cta-panel {
          position: relative; overflow: hidden;
          text-align: center;
          padding: 4rem 2rem;
          border-radius: var(--radius-xl);
          background: var(--bg-surface);
          border: 1px solid var(--border-accent);
          box-shadow: 0 0 60px rgba(99,102,241,0.07), var(--shadow-lg);
        }
        .cta-panel__glow {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 420px; height: 220px;
          background: radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-btn { position: relative; z-index: 1; display: inline-flex; }

        /* Responsive */
        @media (max-width: 960px) {
          .hero-grid    { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          .agents-grid  { grid-template-columns: 1fr !important; }
          .features-grid{ grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 560px) {
          .hero-grid > div:last-child { display: none; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}