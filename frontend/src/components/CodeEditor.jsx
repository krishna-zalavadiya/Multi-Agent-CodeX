// ============================================================
// components/CodeEditor.jsx — Code Input Panel
// Features: Monaco editor integration, language selector,
// line counter, paste detection, clear button, char counter
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";

// ------------------------------------------------------------
// SUPPORTED LANGUAGES — drives the selector dropdown and
// passes the correct language hint to the backend API.
// ------------------------------------------------------------
const LANGUAGES = [
  { id: "python",     label: "Python",     ext: ".py",  monacoId: "python" },
  { id: "javascript", label: "JavaScript", ext: ".js",  monacoId: "javascript" },
];

// ------------------------------------------------------------
// PLACEHOLDER CODE — shown when editor is empty.
// Gives users immediate context on what to paste.
// Each language has a relevant snippet with a deliberate bug
// so the demo is immediately compelling.
// ------------------------------------------------------------
const PLACEHOLDERS = {
  python: `# Paste your Python code here for review
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    # Bug: ZeroDivisionError when list is empty
    return total / len(numbers)

def fetch_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    # Security: SQL injection vulnerability
    return db.execute(query)
`,
  javascript: `// Paste your JavaScript code here for review
async function fetchUserData(userId) {
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  // Security: SQL injection vulnerability
  const result = await db.query(query);
  return result;
}

function processItems(items) {
  // Bug: no null check — crashes if items is undefined
  return items.map(item => item.value * 2);
}
`,
};

// ------------------------------------------------------------
// SAMPLE CODE — inserted when user clicks "Try Sample"
// ------------------------------------------------------------
const SAMPLE_CODE = {
  python: `def find_user_by_email(email):
    """Find user account by email address."""
    users = get_all_users()
    
    for i in range(len(users)):
        # Performance: O(n) string comparison on every request
        if users[i]['email'] == email:
            return users[i]
    
    # Bug: implicit None return not handled by callers
    
def update_password(user_id, new_password):
    # Security: storing plaintext password
    query = "UPDATE users SET password='" + new_password + "' WHERE id=" + str(user_id)
    db.execute(query)
    return True

def calculate_stats(data):
    total = sum(data)
    # Bug: ZeroDivisionError if data is empty list
    average = total / len(data)
    variance = sum((x - average) ** 2 for x in data) / len(data)
    return {"total": total, "average": average, "variance": variance}
`,
  javascript: `async function loadDashboard(userId) {
  // Performance: sequential awaits instead of Promise.all
  const user    = await fetchUser(userId);
  const orders  = await fetchOrders(userId);
  const reviews = await fetchReviews(userId);

  // Bug: no null check before property access
  const userName = user.profile.displayName;

  // Security: innerHTML with unsanitized data — XSS risk
  document.getElementById('greeting').innerHTML =
    \`Welcome back, \${userName}!\`;

  return { user, orders, reviews };
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    // Bug: 'this' context lost — should use arrow or bind
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
`,
};

// ------------------------------------------------------------
// Icons — inline SVG, zero dependency
// ------------------------------------------------------------
function CopyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function ClearIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function SparkleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}

function ExpandIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

// ------------------------------------------------------------
// LanguageSelector — pill toggle between Python / JavaScript
// Animates a sliding background pill under the active option
// ------------------------------------------------------------
function LanguageSelector({ selected, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Select programming language"
      style={{
        display:      "flex",
        alignItems:   "center",
        background:   "var(--bg-void)",
        borderRadius: "var(--radius-full)",
        padding:      "3px",
        border:       "1px solid var(--border-default)",
        gap:          "2px",
      }}
    >
      {LANGUAGES.map((lang) => {
        const isActive = selected === lang.id;
        return (
          <button
            key={lang.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(lang.id)}
            style={{
              padding:      "0.3rem 0.85rem",
              borderRadius: "var(--radius-full)",
              fontFamily:   "var(--font-mono)",
              fontSize:     "0.72rem",
              fontWeight:   isActive ? 600 : 400,
              letterSpacing: "0.04em",
              color:        isActive ? "#fff" : "var(--text-tertiary)",
              background:   isActive ? "var(--accent-primary)" : "transparent",
              border:       "none",
              cursor:       "pointer",
              transition:   "all var(--transition-base)",
              boxShadow:    isActive ? "0 0 12px var(--accent-primary-glow)" : "none",
              whiteSpace:   "nowrap",
            }}
          >
            {lang.label}
            <span
              style={{
                marginLeft: "0.3em",
                opacity:    0.6,
                fontSize:   "0.65rem",
              }}
            >
              {lang.ext}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// LineNumbers — rendered alongside the textarea to mimic
// a real code editor. Updates as code changes.
// Uses the same monospace font + line-height as the textarea
// so numbers always align with code lines perfectly.
// ------------------------------------------------------------
function LineNumbers({ code, lineHeight = 21 }) {
  const lineCount = Math.max(1, (code || "").split("\n").length);

  return (
    <div
      aria-hidden="true"
      style={{
        width:          "44px",
        minWidth:       "44px",
        padding:        "1rem 0",
        textAlign:      "right",
        paddingRight:   "0.75rem",
        userSelect:     "none",
        borderRight:    "1px solid var(--border-subtle)",
        background:     "rgba(255,255,255,0.01)",
        overflowY:      "hidden",
        flexShrink:     0,
      }}
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div
          key={i}
          style={{
            fontFamily:  "var(--font-mono)",
            fontSize:    "0.8rem",
            lineHeight:  `${lineHeight}px`,
            color:       "var(--text-disabled)",
            height:      `${lineHeight}px`,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// StatusBar — bottom strip showing line/char counts,
// language, and a "clean" / "has content" indicator.
// Mimics VS Code's status bar for familiar UX.
// ------------------------------------------------------------
function StatusBar({ code, language }) {
  const lines = code ? code.split("\n").length : 0;
  const chars = code ? code.length : 0;
  const words = code ? code.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0.3rem 0.75rem",
        borderTop:      "1px solid var(--border-subtle)",
        background:     "rgba(255,255,255,0.015)",
        borderRadius:   "0 0 var(--radius-lg) var(--radius-lg)",
        flexShrink:     0,
      }}
    >
      {/* Left: language badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.65rem",
            color:         "var(--text-accent)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {language === "python" ? "Python 3" : "JavaScript ES2024"}
        </span>

        {/* Encoding pill */}
        <span
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      "0.6rem",
            color:         "var(--text-tertiary)",
            letterSpacing: "0.04em",
          }}
        >
          UTF-8
        </span>
      </div>

      {/* Right: line / char / word count */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "1rem",
        }}
      >
        {[
          { label: "Ln", value: lines },
          { label: "Ch", value: chars },
          { label: "Wrd", value: words },
        ].map(({ label, value }) => (
          <span
            key={label}
            style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      "0.62rem",
              color:         "var(--text-tertiary)",
              letterSpacing: "0.04em",
            }}
          >
            {label}{" "}
            <span style={{ color: "var(--text-secondary)" }}>{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// CodeEditor — main export
// Props:
//   value        {string}   — controlled code value
//   onChange     {fn}       — called with new code string
//   language     {string}   — "python" | "javascript"
//   onLanguageChange {fn}   — called with new language id
//   disabled     {boolean}  — locks editor during review
// ------------------------------------------------------------
export default function CodeEditor({
  value = "",
  onChange,
  language = "python",
  onLanguageChange,
  disabled = false,
}) {
  const textareaRef    = useRef(null);
  const [copied, setCopied]   = useState(false);
  const [focused, setFocused] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Auto-grow textarea height to fit content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(320, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Tab key support — inserts 4 spaces instead of
  // jumping focus to the next element (default browser behavior)
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const spaces = "    "; // 4-space indent
      const newValue =
        value.slice(0, selectionStart) + spaces + value.slice(selectionEnd);
      onChange(newValue);
      // Restore cursor position after the inserted spaces
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.selectionStart = selectionStart + 4;
          el.selectionEnd   = selectionStart + 4;
        }
      });
    }
  };

  // Copy to clipboard with visual confirmation
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = textareaRef.current;
      if (el) { el.select(); document.execCommand("copy"); }
    }
  };

  // Insert sample code for the active language
  const handleSample = () => {
    onChange(SAMPLE_CODE[language] || "");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Clear editor
  const handleClear = () => {
    onChange("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Detect paste event — could be used to trigger auto-detect language
  const handlePaste = (e) => {
    // Future enhancement: auto-detect language from pasted content
    const pasted = e.clipboardData?.getData("text") || "";
    if (pasted.includes("def ") || pasted.includes("import ")) {
      // Hint: likely Python
    }
  };

  const lineHeight = 21; // px — must match textarea line-height
  const isEmpty    = !value || value.trim() === "";

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "0",
        borderRadius:  "var(--radius-lg)",
        border:        `1px solid ${focused ? "var(--border-accent)" : "var(--border-default)"}`,
        background:    "var(--bg-surface)",
        overflow:      "hidden",
        transition:    "border-color var(--transition-base), box-shadow var(--transition-base)",
        boxShadow:     focused
          ? "0 0 0 3px rgba(99,102,241,0.1), var(--shadow-md)"
          : "var(--shadow-sm)",
        opacity:       disabled ? 0.6 : 1,
      }}
    >

      {/* ── TOOLBAR ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0.625rem 0.875rem",
          borderBottom:   "1px solid var(--border-subtle)",
          background:     "rgba(255,255,255,0.02)",
          flexWrap:       "wrap",
          gap:            "0.5rem",
          flexShrink:     0,
        }}
      >
        {/* Left: language selector */}
        <LanguageSelector selected={language} onChange={onLanguageChange} />

        {/* Right: action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>

          {/* Try Sample */}
          <ToolbarButton
            onClick={handleSample}
            disabled={disabled}
            title="Load sample code with intentional bugs"
            icon={<SparkleIcon size={14} />}
            label="Sample"
          />

          {/* Copy */}
          <ToolbarButton
            onClick={handleCopy}
            disabled={disabled || isEmpty}
            title="Copy code to clipboard"
            icon={<CopyIcon size={14} />}
            label={copied ? "Copied!" : "Copy"}
            active={copied}
          />

          {/* Clear */}
          <ToolbarButton
            onClick={handleClear}
            disabled={disabled || isEmpty}
            title="Clear editor"
            icon={<ClearIcon size={14} />}
            label="Clear"
            danger
          />
        </div>
      </div>

      {/* ── EDITOR BODY ── */}
      <div
        style={{
          display:  "flex",
          position: "relative",
          flexGrow: 1,
          minHeight: expanded ? "600px" : "320px",
          transition: "min-height 0.3s ease",
        }}
      >
        {/* Line numbers column */}
        <LineNumbers code={value} lineHeight={lineHeight} />

        {/* Textarea — the actual editable area */}
        <div style={{ position: "relative", flexGrow: 1 }}>

          {/* Placeholder overlay — shown when empty and not focused */}
          {isEmpty && !focused && (
            <div
              aria-hidden="true"
              style={{
                position:    "absolute",
                inset:       0,
                padding:     "1rem",
                fontFamily:  "var(--font-mono)",
                fontSize:    "0.8rem",
                lineHeight:  `${lineHeight}px`,
                color:       "var(--text-disabled)",
                pointerEvents: "none",
                whiteSpace:  "pre",
                overflow:    "hidden",
                userSelect:  "none",
              }}
            >
              {PLACEHOLDERS[language]}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={handlePaste}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-label={`${language} code editor`}
            aria-multiline="true"
            style={{
              display:     "block",
              width:       "100%",
              minHeight:   expanded ? "600px" : "320px",
              padding:     "1rem",
              fontFamily:  "var(--font-mono)",
              fontSize:    "0.8rem",
              lineHeight:  `${lineHeight}px`,
              color:       "var(--text-primary)",
              background:  "transparent",
              border:      "none",
              outline:     "none",
              resize:      "none",
              tabSize:     4,
              whiteSpace:  "pre",
              overflowX:   "auto",
              overflowY:   "hidden",
              caretColor:  "var(--accent-primary)",
              transition:  "min-height 0.3s ease",
            }}
          />
        </div>

        {/* Expand / collapse toggle — bottom-right corner */}
        <button
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Collapse editor" : "Expand editor"}
          aria-label={expanded ? "Collapse editor" : "Expand editor"}
          style={{
            position:    "absolute",
            bottom:      "0.5rem",
            right:       "0.5rem",
            width:       "28px",
            height:      "28px",
            borderRadius: "var(--radius-sm)",
            background:  "var(--bg-elevated)",
            border:      "1px solid var(--border-default)",
            color:       "var(--text-tertiary)",
            display:     "flex",
            alignItems:  "center",
            justifyContent: "center",
            cursor:      "pointer",
            transition:  "color var(--transition-fast), border-color var(--transition-fast)",
            transform:   expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color        = "var(--text-primary)";
            e.currentTarget.style.borderColor  = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color        = "var(--text-tertiary)";
            e.currentTarget.style.borderColor  = "var(--border-default)";
          }}
        >
          <ExpandIcon size={13} />
        </button>
      </div>

      {/* ── STATUS BAR ── */}
      <StatusBar code={value} language={language} />
    </div>
  );
}

// ------------------------------------------------------------
// ToolbarButton — reusable toolbar action button
// Extracted to keep the toolbar JSX clean
// ------------------------------------------------------------
function ToolbarButton({
  onClick,
  disabled,
  title,
  icon,
  label,
  active  = false,
  danger  = false,
}) {
  const [hovered, setHovered] = useState(false);

  const color = active
    ? "var(--agent-perf)"
    : danger && hovered
    ? "var(--agent-bug)"
    : hovered
    ? "var(--text-primary)"
    : "var(--text-tertiary)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "0.3rem",
        padding:      "0.3rem 0.6rem",
        borderRadius: "var(--radius-sm)",
        fontFamily:   "var(--font-body)",
        fontSize:     "0.72rem",
        fontWeight:   500,
        color,
        background:   hovered && !disabled
          ? "var(--bg-elevated)"
          : "transparent",
        border:       "1px solid",
        borderColor:  hovered && !disabled
          ? "var(--border-default)"
          : "transparent",
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled ? 0.4 : 1,
        transition:   "all var(--transition-fast)",
        whiteSpace:   "nowrap",
        flexShrink:   0,
      }}
    >
      {icon}
      {label}
    </button>
  );
}