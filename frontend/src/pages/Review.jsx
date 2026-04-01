// ============================================================
// pages/Review.jsx — FIXED
// Fixes:
// - Sticky header used backdrop-filter blur — replaced with
//   solid semi-transparent bg (blur on scroll = constant repaint)
// - Results panel sticky was conflicting with page scroll
// - SubmitButton used local useState for hover — replaced with CSS
// - ProgressBar animation scoped to keyframes in <style>
// ============================================================

import { useState, useCallback, useRef } from "react";
import CodeEditor from "../components/CodeEditor";
import ReviewResults, { LoadingState } from "../components/ReviewResults";
import { submitReview, pollReview, cancelReview } from "../services/reviewApi";

const STATE = {
  IDLE:       "idle",
  SUBMITTING: "submitting",
  POLLING:    "polling",
  DONE:       "done",
  ERROR:      "error",
};

const INITIAL_AGENT_STATUSES = {
  bug:         "pending",
  security:    "pending",
  performance: "pending",
};

// ── Icons ──
function PlayIcon({ size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
    </svg>
  );
}
function StopIcon({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" />
    </svg>
  );
}
function ResetIcon({ size=14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  );
}
function InfoIcon({ size=15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
    </svg>
  );
}

// ── ProgressBar ──
function ProgressBar({ active }) {
  return (
    <div style={{
      height:       "2px",
      background:   "var(--border-subtle)",
      overflow:     "hidden",
      opacity:      active ? 1 : 0,
      transition:   "opacity 0.4s ease",
    }} aria-hidden="true">
      {active && (
        <div style={{
          height:     "100%",
          width:      "35%",
          background: "linear-gradient(90deg, transparent, var(--accent-primary), transparent)",
          animation:  "progress-slide 1.5s ease-in-out infinite",
        }} />
      )}
    </div>
  );
}

// ── SectionHeader ──
function SectionHeader({ label, badge, right }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      marginBottom:"0.875rem", gap:"0.75rem",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
        <span style={{ fontFamily:"var(--font-display)", fontSize:"0.93rem", fontWeight:600,
          color:"var(--text-primary)", letterSpacing:"-0.01em" }}>
          {label}
        </span>
        {badge && badge}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

// ── TipsBanner ──
function TipsBanner() {
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem("tips_dismissed"); }
    catch { return true; }
  });

  if (!visible) return null;

  return (
    <div className="animate-fade-up" style={{
      padding:"0.875rem 1rem", borderRadius:"var(--radius-lg)",
      background:"var(--accent-primary-dim)", border:"1px solid var(--border-accent)",
      display:"flex", gap:"0.75rem", alignItems:"flex-start", marginBottom:"1.25rem",
    }}>
      <InfoIcon size={15} color="var(--text-accent)" />
      <div style={{ flexGrow:1 }}>
        <p style={{ fontFamily:"var(--font-body)", fontSize:"0.8rem",
          color:"var(--text-accent)", fontWeight:500, marginBottom:"0.3rem" }}>
          Tips for best results
        </p>
        {[
          "Paste complete functions or classes — not just snippets",
          "Python and JavaScript are fully supported in this version",
          "Agents run in parallel — full review takes ~5–15 seconds",
        ].map((tip) => (
          <p key={tip} style={{ fontFamily:"var(--font-body)", fontSize:"0.76rem",
            color:"var(--text-secondary)", lineHeight:1.55, display:"flex", gap:"0.4rem" }}>
            <span style={{ color:"var(--text-accent)", flexShrink:0 }}>·</span>{tip}
          </p>
        ))}
      </div>
      <button
        onClick={() => {
          try { sessionStorage.setItem("tips_dismissed","1"); } catch {}
          setVisible(false);
        }}
        aria-label="Dismiss tips"
        style={{
          color:"var(--text-tertiary)", background:"transparent", border:"none",
          cursor:"pointer", fontSize:"1.1rem", lineHeight:1, padding:0, flexShrink:0,
        }}
      >×</button>
    </div>
  );
}

// ── ResultsStatusBadge ──
function ResultsStatusBadge({ reviewState, executionTime }) {
  const isDone    = reviewState === STATE.DONE;
  const isRunning = reviewState === STATE.SUBMITTING || reviewState === STATE.POLLING;
  const isError   = reviewState === STATE.ERROR;

  if (!isDone && !isRunning && !isError) return null;

  const label = isDone
    ? `Done${executionTime ? ` · ${executionTime}s` : ""}`
    : isRunning ? "Analyzing…"
    : "Failed";

  const color  = isDone ? "var(--agent-perf)"    : isRunning ? "var(--text-accent)"    : "var(--agent-bug)";
  const bg     = isDone ? "rgba(16,185,129,0.1)" : isRunning ? "var(--accent-primary-dim)" : "var(--agent-bug-dim)";
  const border = isDone ? "rgba(16,185,129,0.25)": isRunning ? "var(--border-accent)"  : "rgba(244,63,94,0.3)";

  return (
    <span style={{
      fontFamily:"var(--font-mono)", fontSize:"0.6rem", fontWeight:700,
      letterSpacing:"0.08em", textTransform:"uppercase",
      padding:"0.15em 0.55em", borderRadius:"9999px",
      color, background:bg, border:`1px solid ${border}`,
    }}>
      {label}
    </span>
  );
}

// ── Review page ──
export default function Review() {
  const [code,           setCode]           = useState("");
  const [language,       setLanguage]       = useState("python");
  const [reviewState,    setReviewState]    = useState(STATE.IDLE);
  const [results,        setResults]        = useState(null);
  const [agentStatuses,  setAgentStatuses]  = useState(INITIAL_AGENT_STATUSES);
  const [executionTime,  setExecutionTime]  = useState(null);
  const [error,          setError]          = useState(null);

  const cancelRef   = useRef(false);
  const startTimeRef = useRef(null);

  // Staggered agent status animation
  const simulateAgentProgress = useCallback(() => {
    const steps = [
      { key:"bug",         status:"running", delay:300  },
      { key:"security",    status:"running", delay:700  },
      { key:"performance", status:"running", delay:1100 },
      { key:"bug",         status:"done",    delay:2600 },
      { key:"security",    status:"done",    delay:3300 },
      { key:"performance", status:"done",    delay:3900 },
    ];
    steps.forEach(({ key, status, delay }) => {
      setTimeout(() => {
        if (!cancelRef.current) {
          setAgentStatuses((prev) => ({ ...prev, [key]: status }));
        }
      }, delay);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) return;

    cancelRef.current  = false;
    startTimeRef.current = Date.now();

    setReviewState(STATE.SUBMITTING);
    setResults(null);
    setError(null);
    setExecutionTime(null);
    setAgentStatuses(INITIAL_AGENT_STATUSES);

    try {
      const { reviewId } = await submitReview({ code, language });
      if (cancelRef.current) return;

      setReviewState(STATE.POLLING);
      simulateAgentProgress();

      const data = await pollReview(reviewId, {
        onProgress: (status) => {
          if (status?.agentStatuses && !cancelRef.current) {
            setAgentStatuses(status.agentStatuses);
          }
        },
        shouldCancel: () => cancelRef.current,
      });

      if (cancelRef.current) return;

      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      setExecutionTime(elapsed);
      setResults(data.results);
      setAgentStatuses({ bug:"done", security:"done", performance:"done" });
      setReviewState(STATE.DONE);

    } catch (err) {
      if (cancelRef.current) return;
      setError(err.message || "An unexpected error occurred. Please try again.");
      setReviewState(STATE.ERROR);
      setAgentStatuses(INITIAL_AGENT_STATUSES);
    }
  }, [code, language, simulateAgentProgress]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setReviewState(STATE.IDLE);
    setAgentStatuses(INITIAL_AGENT_STATUSES);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setResults(null);
    setError(null);
    setExecutionTime(null);
    setReviewState(STATE.IDLE);
    setAgentStatuses(INITIAL_AGENT_STATUSES);
  }, []);

  const isRunning = reviewState === STATE.SUBMITTING || reviewState === STATE.POLLING;
  const isEmpty   = !code.trim();

  return (
    <div style={{ minHeight:"calc(100vh - var(--navbar-height))", background:"var(--bg-void)" }}>

      {/* ── Sticky page header — NO backdrop-filter (paint cost) ── */}
      <div className="review-page-header">
        <ProgressBar active={isRunning} />
        <div className="container-app" style={{
          paddingBlock:"0.875rem", display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:"1rem", flexWrap:"wrap",
        }}>
          <div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"1.05rem", fontWeight:700,
              color:"var(--text-primary)", letterSpacing:"-0.02em", lineHeight:1.2 }}>
              Code Review
            </h1>
            <p style={{ fontFamily:"var(--font-mono)", fontSize:"0.63rem", color:"var(--text-tertiary)",
              letterSpacing:"0.06em", marginTop:"0.1rem" }}>
              3 agents · parallel execution · GPT-4o
            </p>
          </div>

          {/* Submit controls */}
          <div style={{ display:"flex", gap:"0.625rem", alignItems:"center" }}>
            <button
              onClick={isRunning ? undefined : handleSubmit}
              disabled={isEmpty && !isRunning}
              className={`btn btn-primary review-submit-btn${isRunning ? " review-submit-btn--running" : ""}`}
              aria-label={isRunning ? "Analyzing…" : results ? "Re-analyze Code" : "Analyze Code"}
            >
              {isRunning
                ? <><div className="spinner" style={{ width:15, height:15, borderWidth:"1.5px" }} /> Analyzing…</>
                : <><PlayIcon size={14} /> {results ? "Re-analyze" : "Analyze Code"}</>
              }
            </button>

            {isRunning && (
              <button onClick={handleCancel} className="btn review-cancel-btn" aria-label="Cancel review">
                <StopIcon size={13} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="container-app review-layout" style={{ paddingBlock:"1.75rem" }}>

        {/* Left — editor */}
        <div>
          <TipsBanner />

          <SectionHeader
            label="Your Code"
            badge={
              <span style={{
                fontFamily:"var(--font-mono)", fontSize:"0.6rem", fontWeight:700,
                letterSpacing:"0.08em", textTransform:"uppercase",
                padding:"0.15em 0.5em", borderRadius:"9999px",
                background:"var(--accent-primary-dim)", color:"var(--text-accent)",
                border:"1px solid var(--border-accent)",
              }}>
                {language === "python" ? "Python" : "JavaScript"}
              </span>
            }
          />

          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            onLanguageChange={setLanguage}
            disabled={isRunning}
          />

          {!isEmpty && (
            <p style={{
              fontFamily:"var(--font-mono)", fontSize:"0.63rem", color:"var(--text-disabled)",
              marginTop:"0.45rem", letterSpacing:"0.04em",
            }}>
              {code.split("\n").length} lines · {code.length} characters
            </p>
          )}
        </div>

        {/* Right — results */}
        <div className="review-results-col">
          <SectionHeader
            label="Review Results"
            badge={<ResultsStatusBadge reviewState={reviewState} executionTime={executionTime} />}
            right={reviewState === STATE.DONE && (
              <button onClick={handleReset} className="review-clear-btn">
                <ResetIcon size={13} /> Clear
              </button>
            )}
          />

          <ReviewResults
            results={results}
            isLoading={isRunning}
            agentStatuses={agentStatuses}
            executionTime={executionTime}
            error={reviewState === STATE.ERROR ? error : null}
          />
        </div>
      </div>

      <style>{`
        /* Page header — solid bg, NO blur */
        .review-page-header {
          position:     sticky;
          top:          var(--navbar-height);
          z-index:      30;
          background:   rgba(9,9,15,0.97);
          border-bottom: 1px solid var(--border-subtle);
        }

        /* Two-column layout */
        .review-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        /* Results column — sticky within viewport */
        .review-results-col {
          position:   sticky;
          top:        calc(var(--navbar-height) + 58px);
          max-height: calc(100vh - var(--navbar-height) - 70px);
          overflow-y: auto;
          padding-right: 2px;
          /* Custom scrollbar */
          scrollbar-width: thin;
          scrollbar-color: var(--bg-overlay) transparent;
        }

        /* Submit button hover via CSS — no JS needed */
        .review-submit-btn {
          font-size: 0.88rem;
          padding: 0.6rem 1.35rem;
          opacity: 1;
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        .review-submit-btn:hover:not(:disabled) {
          background: #4f52e0;
          box-shadow: var(--shadow-glow-accent);
        }
        .review-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .review-submit-btn--running {
          background: rgba(99,102,241,0.35) !important;
          cursor: default;
        }

        /* Cancel button */
        .review-cancel-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.6rem 1rem;
          border-radius: 9999px;
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--agent-bug);
          background: var(--agent-bug-dim);
          border: 1px solid rgba(244,63,94,0.3);
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          animation: scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .review-cancel-btn:hover {
          background: rgba(244,63,94,0.2);
          border-color: rgba(244,63,94,0.5);
        }

        /* Clear button */
        .review-clear-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.28rem 0.65rem;
          border-radius: 9999px;
          font-family: var(--font-body);
          font-size: 0.73rem;
          color: var(--text-tertiary);
          background: transparent;
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .review-clear-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-default);
          background: var(--bg-elevated);
        }

        /* Progress slide animation */
        @keyframes progress-slide {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(450%); }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .review-layout { grid-template-columns: 1fr !important; }
          .review-results-col {
            position: static !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}