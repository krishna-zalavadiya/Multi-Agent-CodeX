// ============================================================
// components/ReviewResults.jsx — AI Review Results Panel
// Features: per-agent sections, severity badges, code snippets,
// collapsible findings, animated entrance, summary scorecard
// ============================================================

import { useState } from "react";

// ------------------------------------------------------------
// SEVERITY CONFIG — drives badge colors, icons, and sort order.
// Each severity maps to an agent color from the design system.
// ------------------------------------------------------------
const SEVERITY = {
  critical: {
    label:  "Critical",
    color:  "#ff4d6d",
    dim:    "rgba(255,77,109,0.12)",
    border: "rgba(255,77,109,0.3)",
    order:  0,
  },
  high: {
    label:  "High",
    color:  "var(--agent-bug)",
    dim:    "var(--agent-bug-dim)",
    border: "rgba(244,63,94,0.25)",
    order:  1,
  },
  medium: {
    label:  "Medium",
    color:  "var(--agent-security)",
    dim:    "var(--agent-security-dim)",
    border: "rgba(245,158,11,0.25)",
    order:  2,
  },
  low: {
    label:  "Low",
    color:  "var(--agent-perf)",
    dim:    "var(--agent-perf-dim)",
    border: "rgba(16,185,129,0.25)",
    order:  3,
  },
  info: {
    label:  "Info",
    color:  "var(--text-accent)",
    dim:    "var(--accent-primary-dim)",
    border: "var(--border-accent)",
    order:  4,
  },
};

// ------------------------------------------------------------
// AGENT CONFIG — visual identity per agent type.
// Mirrors the agent data in Home.jsx for consistency.
// ------------------------------------------------------------
const AGENT_CONFIG = {
  bug: {
    label:    "Bug Detector",
    badge:    "Agent 01",
    color:    "var(--agent-bug)",
    dim:      "var(--agent-bug-dim)",
    glow:     "var(--agent-bug-glow)",
    border:   "rgba(244,63,94,0.2)",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)",
    icon:     BugIcon,
  },
  security: {
    label:    "Security Analyst",
    badge:    "Agent 02",
    color:    "var(--agent-security)",
    dim:      "var(--agent-security-dim)",
    glow:     "var(--agent-security-glow)",
    border:   "rgba(245,158,11,0.2)",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fde68a 100%)",
    icon:     ShieldIcon,
  },
  performance: {
    label:    "Optimization Advisor",
    badge:    "Agent 03",
    color:    "var(--agent-perf)",
    dim:      "var(--agent-perf-dim)",
    glow:     "var(--agent-perf-glow)",
    border:   "rgba(16,185,129,0.2)",
    gradient: "linear-gradient(135deg, #10b981 0%, #2dd4bf 100%)",
    icon:     ZapIcon,
  },
};

// ------------------------------------------------------------
// SVG ICONS — inline, zero dependency
// ------------------------------------------------------------
function BugIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M9 9h6M9 12h6M9 15h4" />
      <path d="M6.5 9A5.5 5.5 0 0117.5 9v7a5.5 5.5 0 01-11 0V9z" />
      <path d="M3 11h3M18 11h3M3 16h3M18 16h3M6 7L4 5M18 7l2-2" />
    </svg>
  );
}

function ShieldIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ZapIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ChevronIcon({ size = 16, color = "currentColor", rotate = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)`, transition: "transform 0.25s ease" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CopyIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// ------------------------------------------------------------
// SeverityBadge — colored pill for issue severity level
// ------------------------------------------------------------
function SeverityBadge({ level }) {
  const cfg = SEVERITY[level] || SEVERITY.info;
  return (
    <span
      style={{
        display:       "inline-flex",
        alignItems:    "center",
        padding:       "0.15em 0.6em",
        borderRadius:  "var(--radius-full)",
        fontFamily:    "var(--font-mono)",
        fontSize:      "0.62rem",
        fontWeight:    700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color:         cfg.color,
        background:    cfg.dim,
        border:        `1px solid ${cfg.border}`,
        whiteSpace:    "nowrap",
        flexShrink:    0,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ------------------------------------------------------------
// CodeSnippet — syntax-highlighted code block with copy button.
// Uses CSS classes from index.css for the pre/code styles.
// Highlights the specific "bad" line if lineNumber is provided.
// ------------------------------------------------------------
function CodeSnippet({ code, language = "python", lineNumber }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent fail */ }
  };

  const lines = code.split("\n");

  return (
    <div
      style={{
        position:     "relative",
        borderRadius: "var(--radius-md)",
        overflow:     "hidden",
        border:       "1px solid var(--border-default)",
        marginTop:    "0.75rem",
      }}
    >
      {/* Language label + copy button */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0.35rem 0.75rem",
          background:     "rgba(255,255,255,0.025)",
          borderBottom:   "1px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.62rem",
            color:         "var(--text-tertiary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {language}
        </span>
        <button
          onClick={handleCopy}
          title="Copy snippet"
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "0.3rem",
            fontFamily:   "var(--font-body)",
            fontSize:     "0.65rem",
            color:        copied ? "var(--agent-perf)" : "var(--text-tertiary)",
            background:   "transparent",
            border:       "none",
            cursor:       "pointer",
            transition:   "color var(--transition-fast)",
            padding:      "0.1rem 0.3rem",
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          {copied
            ? <><CheckIcon size={12} color="var(--agent-perf)" /> Copied</>
            : <><CopyIcon size={12} /> Copy</>
          }
        </button>
      </div>

      {/* Code lines with optional line highlighting */}
      <div
        style={{
          background:  "var(--bg-void)",
          padding:     "0.75rem 0",
          overflowX:   "auto",
        }}
      >
        {lines.map((line, i) => {
          const isHighlighted = lineNumber && (i + 1) === lineNumber;
          return (
            <div
              key={i}
              style={{
                display:    "flex",
                background: isHighlighted
                  ? "rgba(244,63,94,0.08)"
                  : "transparent",
                borderLeft: isHighlighted
                  ? "2px solid var(--agent-bug)"
                  : "2px solid transparent",
                transition: "background 0.2s ease",
              }}
            >
              {/* Line number */}
              <span
                aria-hidden="true"
                style={{
                  fontFamily:    "var(--font-mono)",
                  fontSize:      "0.75rem",
                  lineHeight:    "1.7",
                  color:         isHighlighted
                    ? "var(--agent-bug)"
                    : "var(--text-disabled)",
                  width:         "3rem",
                  minWidth:      "3rem",
                  textAlign:     "right",
                  paddingRight:  "1rem",
                  userSelect:    "none",
                  flexShrink:    0,
                }}
              >
                {i + 1}
              </span>

              {/* Line content */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize:   "0.78rem",
                  lineHeight: "1.7",
                  color:      isHighlighted
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  whiteSpace: "pre",
                  paddingRight: "1rem",
                }}
              >
                {line || " "}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// FindingCard — single collapsible issue card.
// Expands to show description, code snippet, and suggestion.
// Uses CSS max-height transition for smooth open/close.
// ------------------------------------------------------------
function FindingCard({ finding, agentColor, index }) {
  const [expanded, setExpanded] = useState(index === 0); // first card open by default

  return (
    <div
      className={`animate-fade-up stagger-${Math.min(index + 1, 6)}`}
      style={{
        border:       `1px solid ${expanded
          ? "var(--border-strong)"
          : "var(--border-subtle)"}`,
        borderRadius: "var(--radius-md)",
        background:   expanded
          ? "var(--bg-elevated)"
          : "var(--bg-surface)",
        overflow:     "hidden",
        transition:   "border-color 0.25s ease, background 0.25s ease",
      }}
    >
      {/* ── Header row — always visible, click to toggle ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "0.75rem",
          width:          "100%",
          padding:        "0.875rem 1rem",
          background:     "transparent",
          border:         "none",
          cursor:         "pointer",
          textAlign:      "left",
        }}
      >
        {/* Severity badge */}
        <SeverityBadge level={finding.severity} />

        {/* Finding title */}
        <span
          style={{
            fontFamily:  "var(--font-body)",
            fontSize:    "0.875rem",
            fontWeight:  500,
            color:       "var(--text-primary)",
            flexGrow:    1,
            lineHeight:  1.4,
          }}
        >
          {finding.title}
        </span>

        {/* Line number tag */}
        {finding.line && (
          <span
            style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      "0.65rem",
              color:         "var(--text-tertiary)",
              background:    "var(--bg-void)",
              border:        "1px solid var(--border-subtle)",
              borderRadius:  "var(--radius-sm)",
              padding:       "0.15em 0.5em",
              whiteSpace:    "nowrap",
              flexShrink:    0,
            }}
          >
            Ln {finding.line}
          </span>
        )}

        {/* Chevron */}
        <ChevronIcon
          size={16}
          color="var(--text-tertiary)"
          rotate={expanded ? 180 : 0}
        />
      </button>

      {/* ── Expandable body ── */}
      <div
        style={{
          maxHeight:  expanded ? "800px" : "0px",
          overflow:   "hidden",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
        aria-hidden={!expanded}
      >
        <div
          style={{
            padding:     "0 1rem 1.25rem",
            borderTop:   "1px solid var(--border-subtle)",
            paddingTop:  "1rem",
            display:     "flex",
            flexDirection: "column",
            gap:          "1rem",
          }}
        >
          {/* Description */}
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize:   "0.85rem",
              color:      "var(--text-secondary)",
              lineHeight: 1.65,
              maxWidth:   "none",
            }}
          >
            {finding.description}
          </p>

          {/* Code snippet */}
          {finding.code && (
            <CodeSnippet
              code={finding.code}
              language={finding.language || "python"}
              lineNumber={finding.line}
            />
          )}

          {/* Suggestion box */}
          {finding.suggestion && (
            <div
              style={{
                padding:      "0.875rem 1rem",
                borderRadius: "var(--radius-md)",
                background:   "rgba(16,185,129,0.06)",
                border:       "1px solid rgba(16,185,129,0.2)",
                display:      "flex",
                gap:          "0.625rem",
                alignItems:   "flex-start",
              }}
            >
              {/* Green checkmark icon */}
              <div
                style={{
                  width:        "20px",
                  height:       "20px",
                  borderRadius: "50%",
                  background:   "rgba(16,185,129,0.15)",
                  border:       "1px solid rgba(16,185,129,0.3)",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  flexShrink:   0,
                  marginTop:    "0.1rem",
                }}
              >
                <CheckIcon size={11} color="var(--agent-perf)" />
              </div>

              <div>
                <p
                  style={{
                    fontFamily:   "var(--font-mono)",
                    fontSize:     "0.65rem",
                    color:        "var(--agent-perf)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "0.3rem",
                    maxWidth:     "none",
                  }}
                >
                  Suggestion
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize:   "0.825rem",
                    color:      "var(--text-secondary)",
                    lineHeight: 1.6,
                    maxWidth:   "none",
                  }}
                >
                  {finding.suggestion}
                </p>

                {/* Fixed code snippet */}
                {finding.fixedCode && (
                  <CodeSnippet
                    code={finding.fixedCode}
                    language={finding.language || "python"}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// AgentSection — collapsible panel for one agent's findings.
// Shows a summary count + severity breakdown in the header.
// ------------------------------------------------------------
function AgentSection({ agentKey, findings, isOpen, onToggle }) {
  const cfg = AGENT_CONFIG[agentKey];
  if (!cfg) return null;

  const Icon = cfg.icon;

  // Count findings by severity for the summary chips
  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  // Sort findings: critical → high → medium → low → info
  const sorted = [...findings].sort((a, b) =>
    (SEVERITY[a.severity]?.order ?? 99) - (SEVERITY[b.severity]?.order ?? 99)
  );

  return (
    <div
      className="animate-fade-up"
      style={{
        borderRadius: "var(--radius-lg)",
        border:       `1px solid ${isOpen ? cfg.border : "var(--border-default)"}`,
        background:   "var(--bg-surface)",
        overflow:     "hidden",
        transition:   "border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow:    isOpen
          ? `0 0 30px ${cfg.glow}, var(--shadow-md)`
          : "var(--shadow-sm)",
      }}
    >
      {/* ── Agent section header ── */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "1rem",
          width:          "100%",
          padding:        "1.125rem 1.25rem",
          background:     isOpen
            ? `linear-gradient(90deg, ${cfg.dim} 0%, transparent 60%)`
            : "transparent",
          border:         "none",
          cursor:         "pointer",
          textAlign:      "left",
          transition:     "background 0.3s ease",
        }}
      >
        {/* Agent icon */}
        <div
          style={{
            width:        "40px",
            height:       "40px",
            borderRadius: "var(--radius-md)",
            background:   cfg.dim,
            border:       `1px solid ${cfg.border}`,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            flexShrink:   0,
            boxShadow:    isOpen ? `0 0 12px ${cfg.glow}` : "none",
            transition:   "box-shadow 0.3s ease",
          }}
        >
          <Icon size={18} color={cfg.color} />
        </div>

        {/* Agent name + badge */}
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontFamily:   "var(--font-display)",
                fontSize:     "0.95rem",
                fontWeight:   600,
                color:        "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {cfg.label}
            </span>
            <span
              style={{
                fontFamily:    "var(--font-mono)",
                fontSize:      "0.6rem",
                color:         cfg.color,
                background:    cfg.dim,
                border:        `1px solid ${cfg.border}`,
                borderRadius:  "var(--radius-full)",
                padding:       "0.1em 0.5em",
                letterSpacing: "0.08em",
              }}
            >
              {cfg.badge}
            </span>
          </div>

          {/* Severity breakdown chips */}
          <div
            style={{
              display:    "flex",
              gap:        "0.4rem",
              marginTop:  "0.35rem",
              flexWrap:   "wrap",
            }}
          >
            {Object.entries(severityCounts).map(([level, count]) => {
              const s = SEVERITY[level];
              if (!s) return null;
              return (
                <span
                  key={level}
                  style={{
                    fontFamily:    "var(--font-mono)",
                    fontSize:      "0.6rem",
                    color:         s.color,
                    background:    s.dim,
                    border:        `1px solid ${s.border}`,
                    borderRadius:  "var(--radius-full)",
                    padding:       "0.1em 0.45em",
                    letterSpacing: "0.04em",
                  }}
                >
                  {count} {s.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Total count */}
        <span
          style={{
            fontFamily:  "var(--font-display)",
            fontSize:    "1.4rem",
            fontWeight:  700,
            color:       cfg.color,
            minWidth:    "2rem",
            textAlign:   "right",
            flexShrink:  0,
          }}
        >
          {findings.length}
        </span>

        {/* Chevron */}
        <ChevronIcon
          size={18}
          color="var(--text-tertiary)"
          rotate={isOpen ? 180 : 0}
        />
      </button>

      {/* ── Findings list ── */}
      <div
        style={{
          maxHeight:  isOpen ? `${findings.length * 600}px` : "0px",
          overflow:   "hidden",
          transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
        }}
        aria-hidden={!isOpen}
      >
        <div
          style={{
            padding:       "0 1.25rem 1.25rem",
            display:       "flex",
            flexDirection: "column",
            gap:           "0.625rem",
            borderTop:     "1px solid var(--border-subtle)",
            paddingTop:    "1rem",
          }}
        >
          {sorted.map((finding, i) => (
            <FindingCard
              key={finding.id || i}
              finding={finding}
              agentColor={cfg.color}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ScoreGauge — circular SVG arc showing the overall score.
// Pure SVG, no canvas, no library.
// strokeDashoffset animates the arc fill on mount.
// ------------------------------------------------------------
function ScoreGauge({ score }) {
  const radius      = 36;
  const circumference = 2 * Math.PI * radius;
  const pct         = Math.max(0, Math.min(100, score));
  const offset      = circumference - (pct / 100) * circumference;

  // Color shifts from red → amber → green based on score
  const color =
    pct >= 80 ? "var(--agent-perf)"
    : pct >= 50 ? "var(--agent-security)"
    : "var(--agent-bug)";

  return (
    <div
      style={{
        position: "relative",
        width:    "88px",
        height:   "88px",
        flexShrink: 0,
      }}
    >
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="5"
        />
        {/* Foreground arc */}
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:  "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            filter:      `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>

      {/* Score number centered inside arc */}
      <div
        style={{
          position:       "absolute",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          lineHeight:     1,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "1.4rem",
            fontWeight: 800,
            color,
          }}
        >
          {pct}
        </span>
        <span
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.52rem",
            color:         "var(--text-tertiary)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop:     "1px",
          }}
        >
          /100
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SummaryScorecard — top-of-results overview panel.
// Shows score gauge, total issue counts, and execution time.
// ------------------------------------------------------------
function SummaryScorecard({ results, executionTime }) {
  const allFindings = Object.values(results).flat();
  const total       = allFindings.length;

  const countBySeverity = allFindings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  // Score: start at 100, subtract weighted penalties
  const weights  = { critical: 20, high: 10, medium: 5, low: 2, info: 0 };
  const penalty  = allFindings.reduce((sum, f) => sum + (weights[f.severity] || 0), 0);
  const score    = Math.max(0, 100 - penalty);

  const scoreLabel =
    score >= 80 ? "Good"
    : score >= 60 ? "Fair"
    : score >= 40 ? "Needs Work"
    : "Critical";

  const scoreLabelColor =
    score >= 80 ? "var(--agent-perf)"
    : score >= 60 ? "var(--agent-security)"
    : "var(--agent-bug)";

  return (
    <div
      className="animate-fade-up"
      style={{
        padding:      "1.5rem",
        borderRadius: "var(--radius-lg)",
        background:   "var(--bg-surface)",
        border:       "1px solid var(--border-default)",
        boxShadow:    "var(--shadow-md)",
        display:      "flex",
        gap:          "1.5rem",
        alignItems:   "center",
        flexWrap:     "wrap",
      }}
    >
      {/* Score gauge */}
      <ScoreGauge score={score} />

      {/* Score label + summary text */}
      <div style={{ flexGrow: 1, minWidth: "160px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span
            style={{
              fontFamily:   "var(--font-display)",
              fontSize:     "1.3rem",
              fontWeight:   700,
              color:        scoreLabelColor,
            }}
          >
            {scoreLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize:   "0.8rem",
              color:      "var(--text-tertiary)",
            }}
          >
            Code Health
          </span>
        </div>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize:   "0.8rem",
            color:      "var(--text-secondary)",
            marginTop:  "0.25rem",
            maxWidth:   "none",
          }}
        >
          {total === 0
            ? "No issues found. Your code looks clean!"
            : `${total} issue${total !== 1 ? "s" : ""} found across ${Object.keys(results).length} agents.`}
        </p>

        {/* Execution time */}
        {executionTime && (
          <p
            style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      "0.65rem",
              color:         "var(--text-tertiary)",
              marginTop:     "0.4rem",
              letterSpacing: "0.04em",
              maxWidth:      "none",
            }}
          >
            ⚡ Completed in {executionTime}s · 3 agents · parallel
          </p>
        )}
      </div>

      {/* Severity breakdown */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap:                 "0.5rem",
          flexShrink:          0,
        }}
      >
        {["critical", "high", "medium", "low"].map((level) => {
          const cfg   = SEVERITY[level];
          const count = countBySeverity[level] || 0;
          return (
            <div
              key={level}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "0.4rem",
                padding:      "0.35rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                background:   count > 0 ? cfg.dim : "var(--bg-elevated)",
                border:       `1px solid ${count > 0 ? cfg.border : "var(--border-subtle)"}`,
              }}
            >
              <span
                style={{
                  fontFamily:  "var(--font-display)",
                  fontSize:    "0.95rem",
                  fontWeight:  700,
                  color:       count > 0 ? cfg.color : "var(--text-disabled)",
                  minWidth:    "1.2rem",
                  lineHeight:  1,
                }}
              >
                {count}
              </span>
              <span
                style={{
                  fontFamily:    "var(--font-mono)",
                  fontSize:      "0.6rem",
                  color:         count > 0 ? cfg.color : "var(--text-disabled)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// EmptyState — shown when no results yet
// ------------------------------------------------------------
function EmptyState() {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "4rem 2rem",
        textAlign:      "center",
        gap:            "1rem",
      }}
    >
      <div
        style={{
          width:        "64px",
          height:       "64px",
          borderRadius: "50%",
          background:   "var(--accent-primary-dim)",
          border:       "1px solid var(--border-accent)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          fontSize:     "1.5rem",
          animation:    "float 4s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        🔍
      </div>
      <h3
        style={{
          fontFamily:   "var(--font-display)",
          fontSize:     "1.1rem",
          fontWeight:   600,
          color:        "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        Awaiting Review
      </h3>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize:   "0.875rem",
          color:      "var(--text-tertiary)",
          maxWidth:   "28ch",
          lineHeight: 1.6,
        }}
      >
        Paste your code and click{" "}
        <span style={{ color: "var(--text-accent)" }}>Analyze Code</span>{" "}
        to run the agents.
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// LoadingState — skeleton + agent status during analysis
// ------------------------------------------------------------
export function LoadingState({ agentStatuses = {} }) {
  const agents = [
    { key: "bug",         ...AGENT_CONFIG.bug },
    { key: "security",    ...AGENT_CONFIG.security },
    { key: "performance", ...AGENT_CONFIG.performance },
  ];

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "1rem",
      }}
    >
      {/* Agent status rows */}
      {agents.map((agent, i) => {
        const Icon   = agent.icon;
        const status = agentStatuses[agent.key] || "pending";
        const isRunning  = status === "running";
        const isDone     = status === "done";
        const isPending  = status === "pending";

        return (
          <div
            key={agent.key}
            className={`animate-fade-up stagger-${i + 1}`}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "1rem",
              padding:      "1rem 1.25rem",
              borderRadius: "var(--radius-lg)",
              background:   "var(--bg-surface)",
              border:       `1px solid ${isRunning
                ? agent.border
                : "var(--border-subtle)"}`,
              boxShadow:    isRunning
                ? `0 0 20px ${agent.glow}`
                : "none",
              transition:   "all 0.4s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width:        "36px",
                height:       "36px",
                borderRadius: "var(--radius-md)",
                background:   isDone || isRunning ? agent.dim : "var(--bg-elevated)",
                border:       `1px solid ${isDone || isRunning
                  ? agent.border
                  : "var(--border-subtle)"}`,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                flexShrink:   0,
                transition:   "all 0.4s ease",
              }}
            >
              <Icon
                size={16}
                color={isDone || isRunning ? agent.color : "var(--text-disabled)"}
              />
            </div>

            {/* Label */}
            <div style={{ flexGrow: 1 }}>
              <span
                style={{
                  fontFamily:  "var(--font-body)",
                  fontSize:    "0.875rem",
                  fontWeight:  500,
                  color:       isDone || isRunning
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  transition:  "color 0.3s ease",
                  display:     "block",
                }}
              >
                {agent.label}
              </span>
              {/* Skeleton line */}
              {!isDone && (
                <div
                  className="skeleton"
                  style={{
                    height:    "8px",
                    width:     isRunning ? "60%" : "40%",
                    marginTop: "0.4rem",
                    opacity:   isPending ? 0.4 : 1,
                  }}
                />
              )}
            </div>

            {/* Status indicator */}
            <div style={{ flexShrink: 0 }}>
              {isDone && (
                <div
                  style={{
                    width:        "24px",
                    height:       "24px",
                    borderRadius: "50%",
                    background:   "rgba(16,185,129,0.15)",
                    border:       "1px solid rgba(16,185,129,0.3)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    animation:    "scale-in 0.3s var(--transition-spring)",
                  }}
                >
                  <CheckIcon size={12} color="var(--agent-perf)" />
                </div>
              )}
              {isRunning && (
                <div
                  className="spinner"
                  style={{ borderTopColor: agent.color }}
                  aria-label="Running"
                />
              )}
              {isPending && (
                <div
                  style={{
                    width:        "8px",
                    height:       "8px",
                    borderRadius: "50%",
                    background:   "var(--border-default)",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// ReviewResults — main export
// Props:
//   results        {object}  — { bug: [...], security: [...], performance: [...] }
//   isLoading      {boolean} — show loading state
//   agentStatuses  {object}  — { bug: "pending"|"running"|"done", ... }
//   executionTime  {string}  — e.g. "3.2"
//   error          {string}  — error message to display
// ------------------------------------------------------------
export default function ReviewResults({
  results       = null,
  isLoading     = false,
  agentStatuses = {},
  executionTime = null,
  error         = null,
}) {
  // Track which agent sections are open
  const [openSections, setOpenSections] = useState({
    bug: true, security: true, performance: true,
  });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Error state ──
  if (error) {
    return (
      <div
        style={{
          padding:      "1.5rem",
          borderRadius: "var(--radius-lg)",
          background:   "var(--agent-bug-dim)",
          border:       "1px solid rgba(244,63,94,0.3)",
          display:      "flex",
          gap:          "0.75rem",
          alignItems:   "flex-start",
        }}
      >
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚠️</span>
        <div>
          <p
            style={{
              fontFamily:  "var(--font-display)",
              fontSize:    "0.9rem",
              fontWeight:  600,
              color:       "var(--agent-bug)",
              maxWidth:    "none",
            }}
          >
            Review Failed
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize:   "0.825rem",
              color:      "var(--text-secondary)",
              marginTop:  "0.25rem",
              maxWidth:   "none",
            }}
          >
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return <LoadingState agentStatuses={agentStatuses} />;
  }

  // ── Empty state ──
  if (!results) {
    return <EmptyState />;
  }

  // ── Results ──
  const agentKeys = ["bug", "security", "performance"];
  const hasResults = agentKeys.some(
    (k) => results[k] && results[k].length > 0
  );

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "1rem",
      }}
    >
      {/* Summary scorecard */}
      <SummaryScorecard results={results} executionTime={executionTime} />

      {/* No issues found */}
      {!hasResults && (
        <div
          className="animate-fade-up"
          style={{
            padding:      "2rem",
            borderRadius: "var(--radius-lg)",
            background:   "rgba(16,185,129,0.06)",
            border:       "1px solid rgba(16,185,129,0.2)",
            textAlign:    "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
          <p
            style={{
              fontFamily:  "var(--font-display)",
              fontSize:    "1rem",
              fontWeight:  600,
              color:       "var(--agent-perf)",
              maxWidth:    "none",
            }}
          >
            All Clear
          </p>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize:   "0.85rem",
              color:      "var(--text-secondary)",
              marginTop:  "0.3rem",
              maxWidth:   "none",
            }}
          >
            No issues detected by any agent.
          </p>
        </div>
      )}

      {/* Per-agent sections */}
      {agentKeys.map((key) => {
        const findings = results[key] || [];
        if (findings.length === 0) return null;
        return (
          <AgentSection
            key={key}
            agentKey={key}
            findings={findings}
            isOpen={openSections[key]}
            onToggle={() => toggleSection(key)}
          />
        );
      })}
    </div>
  );
}