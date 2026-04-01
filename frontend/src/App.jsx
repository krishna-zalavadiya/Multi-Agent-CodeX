// ============================================================
// App.jsx — Root Application Shell (FIXED)
// Fixes: blank flash on mount, removed heavy backdrop stacking
// ============================================================

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Review from "./pages/Review";
import "./App.css";

// ------------------------------------------------------------
// ScrollToTop — resets scroll on route change
// ------------------------------------------------------------
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ------------------------------------------------------------
// AmbientBackground — FIXED:
// - Removed backdrop-filter (was stacking with navbar blur)
// - Used will-change: transform on orbs for GPU layer promotion
// - Reduced orb opacity to cut compositing cost
// - Single fixed background, no re-mount flicker
// ------------------------------------------------------------
function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position:      "fixed",
        inset:         0,
        pointerEvents: "none",
        zIndex:        0,
        overflow:      "hidden",
      }}
    >
      {/* Orb 1 — indigo top-left */}
      <div style={{
        position:        "absolute",
        width:           "700px",
        height:          "700px",
        top:             "-250px",
        left:            "-200px",
        borderRadius:    "50%",
        background:      "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)",
        willChange:      "transform",
        animation:       "float 16s ease-in-out infinite",
      }} />

      {/* Orb 2 — violet bottom-right */}
      <div style={{
        position:        "absolute",
        width:           "600px",
        height:          "600px",
        bottom:          "-200px",
        right:           "-150px",
        borderRadius:    "50%",
        background:      "radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 65%)",
        willChange:      "transform",
        animation:       "float 20s ease-in-out infinite",
        animationDelay:  "-7s",
      }} />

      {/* Dot grid — static, no animation cost */}
      <div style={{
        position: "absolute",
        inset:    0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize:  "28px 28px",
      }} />
    </div>
  );
}

// ------------------------------------------------------------
// NotFound page
// ------------------------------------------------------------
function NotFound() {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      minHeight:      "80vh",
      gap:            "1.5rem",
    }}>
      <div style={{
        fontFamily:             "var(--font-display)",
        fontSize:               "clamp(5rem,15vw,9rem)",
        fontWeight:             800,
        background:             "linear-gradient(135deg,#818cf8,#c084fc)",
        WebkitBackgroundClip:   "text",
        WebkitTextFillColor:    "transparent",
        backgroundClip:         "text",
        lineHeight:             1,
      }}>
        404
      </div>
      <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
        This page doesn't exist.
      </p>
      <a href="/" style={{
        padding:      "0.6rem 1.4rem",
        borderRadius: "9999px",
        background:   "var(--accent-primary)",
        color:        "#fff",
        fontFamily:   "var(--font-body)",
        fontSize:     "0.9rem",
        textDecoration: "none",
      }}>
        ← Back to Home
      </a>
    </div>
  );
}

// ------------------------------------------------------------
// AppShell — NO PageTransition wrapper.
// Page transitions were causing the blank flash because
// React unmounts + remounts the entire page subtree on
// every navigation. Simple opacity is handled in CSS instead.
// ------------------------------------------------------------
function AppShell() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <AmbientBackground />
      <Navbar />
      <main className="app-main">
        <ScrollToTop />
        {/*
          key on Routes causes full remount = blank flash.
          Removed. CSS handles the fade via .app-main > * selector.
        */}
        <Routes location={location}>
          <Route path="/"       element={<Home />} />
          <Route path="/review" element={<Review />} />
          <Route path="*"       element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}