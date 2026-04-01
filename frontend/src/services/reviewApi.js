// ============================================================
// services/reviewApi.js — API Layer
// Handles all communication with the FastAPI backend.
// Includes: submit, poll, cancel, and a full mock mode
// for local development without a running backend.
// ============================================================

// ------------------------------------------------------------
// CONFIG — read from Vite environment variables.
// Set VITE_API_URL in your .env file to point at the backend.
// Falls back to localhost:8000 for local development.
// ------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_V1   = `${API_BASE}/api/v1`;

// Toggle mock mode:
//   - Auto-enabled if VITE_USE_MOCK=true in .env
//   - Auto-enabled if the API base is unreachable (see submitReview)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// Polling config
const POLL_INTERVAL_MS = 2000;   // How often to check for results
const POLL_TIMEOUT_MS  = 60000;  // Max wait before giving up (60s)

// ------------------------------------------------------------
// HTTP HELPERS
// ------------------------------------------------------------

// Base fetch wrapper — sets headers, handles non-2xx responses
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_V1}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept":       "application/json",
      ...options.headers,
    },
    ...options,
  });

  // Parse error body for descriptive messages
  if (!response.ok) {
    let message = `API error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) message = body.detail;
      else if (body?.message) message = body.message;
    } catch { /* response body was not JSON */ }
    throw new ApiError(message, response.status);
  }

  return response.json();
}

// Custom error class — carries HTTP status for UI-level handling
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name   = "ApiError";
    this.status = status;
  }
}

// ------------------------------------------------------------
// SUBMIT REVIEW
// POST /api/v1/review
// Body: { code: string, language: "python" | "javascript" }
// Returns: { reviewId: string }
// ------------------------------------------------------------
export async function submitReview({ code, language }) {
  // Validate inputs before hitting the network
  if (!code || !code.trim()) {
    throw new Error("Code cannot be empty.");
  }
  if (!["python", "javascript"].includes(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Use mock if configured or if API is local and likely not running
  if (USE_MOCK) {
    return mockSubmitReview({ code, language });
  }

  try {
    const data = await apiFetch("/review", {
      method: "POST",
      body:   JSON.stringify({ code, language }),
    });

    if (!data?.review_id) {
      throw new Error("Invalid response from server: missing review_id.");
    }

    return { reviewId: data.review_id };

  } catch (err) {
    // If the backend is not reachable, transparently fall back to mock
    if (err instanceof TypeError && err.message.includes("fetch")) {
      console.warn(
        "[reviewApi] Backend unreachable — falling back to mock mode.\n" +
        `Attempted: POST ${API_V1}/review`
      );
      return mockSubmitReview({ code, language });
    }
    throw err;
  }
}

// ------------------------------------------------------------
// POLL FOR RESULTS
// GET /api/v1/review/:reviewId
// Returns: { status: "pending"|"running"|"done"|"error", results?, error? }
//
// Polls repeatedly until:
//   - status === "done"  → resolves with results
//   - status === "error" → rejects with error message
//   - timeout exceeded   → rejects
//   - shouldCancel()     → resolves early (silent cancel)
// ------------------------------------------------------------
export async function pollReview(reviewId, {
  onProgress   = () => {},
  shouldCancel = () => false,
} = {}) {

  if (!reviewId) throw new Error("reviewId is required for polling.");

  // Mock path
  if (USE_MOCK || reviewId.startsWith("mock_")) {
    return mockPollReview(reviewId, { onProgress, shouldCancel });
  }

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      // Check cancellation
      if (shouldCancel()) {
        resolve({ cancelled: true, results: null });
        return;
      }

      // Check timeout
      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        reject(new Error(
          "Review timed out after 60 seconds. The backend may be overloaded."
        ));
        return;
      }

      try {
        const data = await apiFetch(`/review/${reviewId}`);

        // Notify caller of intermediate progress
        onProgress(data);

        switch (data.status) {
          case "done":
            if (!data.results) {
              reject(new Error("Review completed but no results returned."));
              return;
            }
            resolve({ results: normalizeResults(data.results), cancelled: false });
            break;

          case "error":
            reject(new Error(data.error || "The review agent pipeline failed."));
            break;

          case "pending":
          case "running":
            // Not done yet — schedule the next poll
            setTimeout(tick, POLL_INTERVAL_MS);
            break;

          default:
            reject(new Error(`Unexpected review status: "${data.status}"`));
        }

      } catch (err) {
        // Network errors during polling — retry unless timed out
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          reject(new Error("Lost connection to the server during review."));
        } else {
          console.warn("[reviewApi] Poll error, retrying…", err.message);
          setTimeout(tick, POLL_INTERVAL_MS * 2); // back off on error
        }
      }
    };

    // Kick off first poll immediately
    tick();
  });
}

// ------------------------------------------------------------
// CANCEL REVIEW (optional backend endpoint)
// DELETE /api/v1/review/:reviewId
// Best-effort — we don't throw if this fails since
// the UI has already moved to cancelled state.
// ------------------------------------------------------------
export async function cancelReview(reviewId) {
  if (!reviewId || USE_MOCK || reviewId.startsWith("mock_")) return;

  try {
    await apiFetch(`/review/${reviewId}`, { method: "DELETE" });
  } catch (err) {
    // Non-fatal — log and continue
    console.warn("[reviewApi] Cancel request failed:", err.message);
  }
}

// ------------------------------------------------------------
// NORMALIZE RESULTS
// Maps the raw API response shape to the shape ReviewResults
// expects: { bug: [...], security: [...], performance: [...] }
// Defensive — handles missing fields gracefully.
// ------------------------------------------------------------
function normalizeResults(raw) {
  const normalize = (findings = []) =>
    findings.map((f, i) => ({
      id:          f.id          || `finding_${i}`,
      title:       f.title       || f.message     || "Untitled Finding",
      description: f.description || f.detail      || "",
      severity:    normalizeSeverity(f.severity),
      line:        f.line        || f.line_number  || null,
      code:        f.code        || f.snippet      || null,
      suggestion:  f.suggestion  || f.fix          || null,
      fixedCode:   f.fixed_code  || f.fix_snippet  || null,
      language:    f.language    || "python",
    }));

  return {
    bug:         normalize(raw.bug          || raw.bugs         || []),
    security:    normalize(raw.security     || raw.vulnerabilities || []),
    performance: normalize(raw.performance  || raw.optimizations  || []),
  };
}

// Maps any severity string the API might return to our known levels
function normalizeSeverity(raw) {
  const map = {
    critical:     "critical",
    high:         "high",
    medium:       "medium",
    moderate:     "medium",
    low:          "low",
    info:         "info",
    informational:"info",
    warning:      "medium",
    error:        "high",
  };
  return map[(raw || "").toLowerCase()] || "info";
}

// ============================================================
// MOCK IMPLEMENTATION
// Full offline simulation with realistic delays and data.
// Used when VITE_USE_MOCK=true or backend is unreachable.
// ============================================================

// Generates a fake review ID
function generateMockId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

// In-memory store for mock reviews
const mockStore = new Map();

async function mockSubmitReview({ code, language }) {
  // Simulate network latency
  await delay(400);

  const reviewId = generateMockId();

  // Store the code so mockPollReview can analyze it
  mockStore.set(reviewId, {
    code,
    language,
    submittedAt: Date.now(),
    status:      "pending",
  });

  console.info(`[reviewApi:mock] Submitted review ${reviewId} (${language})`);
  return { reviewId };
}

async function mockPollReview(reviewId, { onProgress, shouldCancel }) {
  const entry = mockStore.get(reviewId);
  if (!entry) throw new Error(`Mock review not found: ${reviewId}`);

  // Simulate agent processing time (3–5 seconds)
  const processingTime = 3000 + Math.random() * 2000;
  const startTime      = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (shouldCancel()) {
        resolve({ cancelled: true, results: null });
        return;
      }

      const elapsed = Date.now() - startTime;

      // Update mock status over time
      if (elapsed < processingTime * 0.3) {
        onProgress({ status: "pending", agentStatuses: {
          bug: "pending", security: "pending", performance: "pending"
        }});
      } else if (elapsed < processingTime * 0.7) {
        onProgress({ status: "running", agentStatuses: {
          bug: "running", security: "running", performance: "running"
        }});
      } else if (elapsed < processingTime) {
        onProgress({ status: "running", agentStatuses: {
          bug: "done", security: "running", performance: "running"
        }});
      } else {
        // Done — return mock results based on the submitted code
        const results = generateMockResults(entry.code, entry.language);
        mockStore.delete(reviewId);
        console.info(`[reviewApi:mock] Review ${reviewId} complete.`);
        resolve({ results, cancelled: false });
        return;
      }

      setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
  });
}

// ------------------------------------------------------------
// generateMockResults — produces realistic-looking findings
// based on actual patterns in the submitted code.
// Scans for known bad patterns rather than returning static data.
// ------------------------------------------------------------
function generateMockResults(code, language) {
  const bugs         = [];
  const security     = [];
  const performance  = [];

  const lines = code.split("\n");

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trim();

    // ── Bug patterns ──
    if (/len\((\w+)\)/.test(trimmed) && /\//.test(trimmed)) {
      bugs.push({
        id:          `bug_div_${lineNum}`,
        title:       "Potential ZeroDivisionError",
        description: "Dividing by the length of a collection without checking if it is empty will raise a ZeroDivisionError at runtime when an empty list or string is passed.",
        severity:    "high",
        line:        lineNum,
        code:        extractContext(lines, i, 3),
        language,
        suggestion:  "Add a guard clause to check the collection is non-empty before dividing, or use a ternary expression to return a default value.",
        fixedCode:   language === "python"
          ? `if not ${extractVarName(trimmed)}:\n    return 0  # or raise ValueError\nreturn total / len(${extractVarName(trimmed)})`
          : `if (!${extractVarName(trimmed)}.length) return 0;\nreturn total / ${extractVarName(trimmed)}.length;`,
      });
    }

    if (/return$/.test(trimmed) || (/def .+:/.test(trimmed) && !lines.slice(i + 1, i + 5).join("").includes("return"))) {
      bugs.push({
        id:          `bug_implicit_none_${lineNum}`,
        title:       "Implicit None Return",
        description: "This function may return None implicitly when no explicit return value is provided. Callers that use the return value without a None check will encounter unexpected behavior.",
        severity:    "medium",
        line:        lineNum,
        code:        extractContext(lines, i, 3),
        language,
        suggestion:  "Add an explicit return statement with a sensible default, or document that the function may return None and update callers accordingly.",
        fixedCode:   null,
      });
    }

    if (/items\b/.test(trimmed) && /\.map\(|\.forEach\(|\.filter\(/.test(trimmed) && !/\?\.|null|undefined|if\s*\(/.test(trimmed)) {
      bugs.push({
        id:          `bug_null_check_${lineNum}`,
        title:       "Missing Null / Undefined Check",
        description: "Calling array methods directly on a variable without verifying it is defined will throw a TypeError if the value is null or undefined.",
        severity:    "high",
        line:        lineNum,
        code:        extractContext(lines, i, 2),
        language,
        suggestion:  "Use optional chaining (?.) or add a guard clause to verify the variable is defined before calling methods on it.",
        fixedCode:   `if (!items) return [];\nreturn items.map(item => item.value * 2);`,
      });
    }

    // ── Security patterns ──
    if (/SELECT|INSERT|UPDATE|DELETE/i.test(trimmed) && /\$\{|f"|f'|\+\s*str\(|%s|%d/.test(trimmed)) {
      security.push({
        id:          `sec_sqli_${lineNum}`,
        title:       "SQL Injection Vulnerability",
        description: "String interpolation or concatenation is used to build SQL queries with user-supplied data. This is one of the most critical security vulnerabilities (OWASP A03) and allows attackers to manipulate the database query to extract, modify, or delete arbitrary data.",
        severity:    "critical",
        line:        lineNum,
        code:        extractContext(lines, i, 3),
        language,
        suggestion:  "Always use parameterized queries or a prepared statement. Never construct SQL queries using string formatting with untrusted input.",
        fixedCode:   language === "python"
          ? `# Use parameterized query\nquery = "SELECT * FROM users WHERE id = %s"\ncursor.execute(query, (user_id,))`
          : `// Use parameterized query\nconst result = await db.query(\n  'SELECT * FROM users WHERE id = $1',\n  [userId]\n);`,
      });
    }

    if (/password|passwd|secret|api_key|token/i.test(trimmed) && /=\s*['"][^'"]{4,}/.test(trimmed)) {
      security.push({
        id:          `sec_hardcoded_${lineNum}`,
        title:       "Hardcoded Secret Detected",
        description: "A potential secret, password, or API key appears to be hardcoded in the source code. Committing secrets to version control exposes them to anyone with repository access and is a critical security risk.",
        severity:    "critical",
        line:        lineNum,
        code:        extractContext(lines, i, 1),
        language,
        suggestion:  "Move all secrets to environment variables and access them via os.environ.get() (Python) or process.env (Node.js). Use a secrets manager for production deployments.",
        fixedCode:   language === "python"
          ? `import os\npassword = os.environ.get("DB_PASSWORD")\nif not password:\n    raise EnvironmentError("DB_PASSWORD is not set")`
          : `const password = process.env.DB_PASSWORD;\nif (!password) throw new Error("DB_PASSWORD is not set");`,
      });
    }

    if (/innerHTML\s*=/.test(trimmed) && !/sanitize|DOMPurify|escape/.test(trimmed)) {
      security.push({
        id:          `sec_xss_${lineNum}`,
        title:       "Cross-Site Scripting (XSS) Risk",
        description: "Setting innerHTML with data that may contain user-controlled content allows attackers to inject and execute arbitrary JavaScript in the context of the page. This is OWASP A03 Cross-Site Scripting.",
        severity:    "high",
        line:        lineNum,
        code:        extractContext(lines, i, 2),
        language,
        suggestion:  "Use textContent instead of innerHTML for plain text. If HTML rendering is required, sanitize the input with DOMPurify before assigning to innerHTML.",
        fixedCode:   `// Safe: use textContent for plain text\nelement.textContent = userInput;\n\n// Or sanitize if HTML is needed:\nelement.innerHTML = DOMPurify.sanitize(userInput);`,
      });
    }

    if (/password.+plain|plain.+password|md5\(password|sha1\(password/i.test(trimmed)) {
      security.push({
        id:          `sec_plainpw_${lineNum}`,
        title:       "Plaintext Password Storage",
        description: "Storing or transmitting passwords in plaintext or using a non-cryptographic hash (MD5, SHA-1) provides no protection against database breaches. An attacker who obtains the database can immediately read or crack all user passwords.",
        severity:    "critical",
        line:        lineNum,
        code:        extractContext(lines, i, 2),
        language,
        suggestion:  "Use a purpose-built password hashing library: bcrypt or Argon2 for Python, bcrypt or scrypt for Node.js. Never store or log raw passwords.",
        fixedCode:   language === "python"
          ? `import bcrypt\nhashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())\n# Store hashed, not password`
          : `const bcrypt = require('bcrypt');\nconst hashed = await bcrypt.hash(password, 12);\n// Store hashed, not password`,
      });
    }

    // ── Performance patterns ──
    if (/for .+ in .+:|\.forEach\(/.test(trimmed) && !/range\(len|enumerate/.test(trimmed)) {
      // Only flag if there's a database or network call inside the loop
      const nextFewLines = lines.slice(i + 1, i + 5).join(" ");
      if (/await|fetch|db\.|cursor\.|execute|query|request|axios/.test(nextFewLines)) {
        performance.push({
          id:          `perf_nplus1_${lineNum}`,
          title:       "N+1 Query Pattern Detected",
          description: "A database or network call appears inside a loop. This creates an N+1 query problem where N separate requests are made for N items, causing response times to grow linearly with data size and often causing unnecessary load on the database or external service.",
          severity:    "high",
          line:        lineNum,
          code:        extractContext(lines, i, 5),
          language,
          suggestion:  "Batch all required IDs before the loop and fetch them in a single query using an IN clause or a batch API. Process the results in memory.",
          fixedCode:   language === "python"
            ? `# Batch fetch outside the loop\nuser_ids = [item.user_id for item in items]\nusers = db.query("SELECT * FROM users WHERE id = ANY(%s)", (user_ids,))\nuser_map = {u.id: u for u in users}`
            : `// Batch fetch outside the loop\nconst userIds = items.map(i => i.userId);\nconst users = await db.query(\n  \`SELECT * FROM users WHERE id IN (\${userIds.join(',')})\`\n);\nconst userMap = Object.fromEntries(users.map(u => [u.id, u]));`,
        });
      }
    }

    if (/await .+\n.*await /.test(code) || (trimmed.startsWith("const ") && /await/.test(trimmed) && i > 0 && /await/.test(lines[i - 1]))) {
      performance.push({
        id:          `perf_sequential_await_${lineNum}`,
        title:       "Sequential Awaits — Use Promise.all",
        description: "Multiple independent async operations are awaited sequentially, meaning each waits for the previous to complete before starting. These operations could run in parallel, significantly reducing total wait time.",
        severity:    "medium",
        line:        lineNum,
        code:        extractContext(lines, i, 4),
        language,
        suggestion:  "Wrap independent async operations in Promise.all() to execute them concurrently. Only use sequential awaits when a later operation depends on the result of an earlier one.",
        fixedCode:   `// Run independent operations in parallel\nconst [user, orders, reviews] = await Promise.all([\n  fetchUser(userId),\n  fetchOrders(userId),\n  fetchReviews(userId),\n]);`,
      });
    }

    if (/range\(len\(/.test(trimmed)) {
      performance.push({
        id:          `perf_range_len_${lineNum}`,
        title:       "Use enumerate() Instead of range(len())",
        description: "Using range(len(collection)) to iterate with an index is an anti-pattern in Python. It is less readable, slightly slower due to extra indexing, and does not follow Python idioms.",
        severity:    "low",
        line:        lineNum,
        code:        extractContext(lines, i, 2),
        language,
        suggestion:  "Use enumerate() to get both the index and value in a single, readable expression.",
        fixedCode:   `# Idiomatic Python\nfor i, item in enumerate(items):\n    process(i, item)`,
      });
    }

    if (/sum\(.+for .+ in/.test(trimmed) && /\*\s*\*\s*2|Math\.pow/.test(trimmed)) {
      performance.push({
        id:          `perf_variance_${lineNum}`,
        title:       "Redundant Two-Pass Computation",
        description: "Computing variance or standard deviation with two separate list comprehensions (one for the mean, one for the variance) iterates the entire dataset twice. This doubles memory allocation and computation time for large datasets.",
        severity:    "low",
        line:        lineNum,
        code:        extractContext(lines, i, 3),
        language,
        suggestion:  "Use the statistics module (Python) or a single-pass Welford's algorithm for computing variance in one iteration, or use numpy for numeric data.",
        fixedCode:   `import statistics\n\n# Single-pass variance\nvariance = statistics.variance(data)\nmean = statistics.mean(data)`,
      });
    }
  });

  // Deduplicate findings by id — pattern matching can produce
  // multiple matches for the same logical issue on adjacent lines
  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter((f) => {
      const key = f.title + f.line;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    bug:         dedup(bugs),
    security:    dedup(security),
    performance: dedup(performance),
  };
}

// ------------------------------------------------------------
// CODE ANALYSIS HELPERS
// ------------------------------------------------------------

// Extracts N lines of context around a target line index.
// Returns them as a joined string for display in code snippets.
function extractContext(lines, centerIndex, radius = 3) {
  const start = Math.max(0, centerIndex - radius);
  const end   = Math.min(lines.length - 1, centerIndex + radius);
  return lines.slice(start, end + 1).join("\n");
}

// Extracts the first variable-like identifier from a line of code.
// Used to fill in fix suggestions with the correct variable name.
function extractVarName(line) {
  const match = line.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/);
  return match ? match[1] : "data";
}

// Simple async delay helper
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}