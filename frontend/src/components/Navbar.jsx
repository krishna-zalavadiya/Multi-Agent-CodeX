// ============================================================
// Navbar.jsx — Glassmorphic Fixed Navigation
// Features: blur backdrop, active route indicator, mobile menu,
// animated hamburger, scroll-aware opacity shift
// ============================================================

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

// ------------------------------------------------------------
// NAV LINKS — single source of truth for all navigation items.
// Adding a new page = add one object here, nothing else changes.
// ------------------------------------------------------------
const NAV_LINKS = [
  { label: "Home",       path: "/" },
  { label: "Review",     path: "/review" },
];

// ------------------------------------------------------------
// Logo SVG — inline so no network request, instant render.
// The hexagon shape echoes the "multi-agent network" concept.
// ------------------------------------------------------------
function LogoIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer hexagon — the "sentinel" shield */}
      <path
        d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z"
        stroke="url(#logo-gradient)"
        strokeWidth="1.5"
        fill="rgba(99,102,241,0.08)"
      />
      {/* Inner node — center agent */}
      <circle cx="16" cy="16" r="3" fill="url(#logo-gradient)" />
      {/* Connection lines — agents talking to each other */}
      <line x1="16" y1="7"  x2="16" y2="13" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="16" y1="19" x2="16" y2="25" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="8"  y1="11" x2="13" y2="14" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="19" y1="18" x2="24" y2="21" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="24" y1="11" x2="19" y2="14" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      <line x1="13" y1="18" x2="8"  y2="21" stroke="url(#logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
      {/* Gradient definition */}
      <defs>
        <linearGradient id="logo-gradient" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ------------------------------------------------------------
// NavLink — single navigation item with active indicator.
// The animated underline uses scaleX transform (not width)
// for GPU-accelerated animation — no layout recalculation.
// ------------------------------------------------------------
function NavLink({ label, path, onClick }) {
  const location  = useLocation();
  const isActive  = location.pathname === path;

  return (
    <Link
      to={path}
      onClick={onClick}
      style={{
        fontFamily:     "var(--font-body)",
        fontSize:       "0.9rem",
        fontWeight:     isActive ? 500 : 400,
        color:          isActive ? "var(--text-accent)" : "var(--text-secondary)",
        position:       "relative",
        padding:        "0.25rem 0",
        transition:     "color var(--transition-fast)",
        textDecoration: "none",
        letterSpacing:  "0.01em",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {label}

      {/* Animated underline — active state */}
      <span
        style={{
          position:        "absolute",
          bottom:          "-2px",
          left:            0,
          right:           0,
          height:          "1.5px",
          background:      "linear-gradient(90deg, #818cf8, #c084fc)",
          borderRadius:    "9999px",
          transform:       isActive ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left center",
          transition:      "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:       "0 0 8px rgba(99,102,241,0.6)",
        }}
        aria-hidden="true"
      />
    </Link>
  );
}

// ------------------------------------------------------------
// HamburgerIcon — animated 3-bar → X morphing icon.
// Uses CSS transforms on individual bars rather than
// swapping icons — smoother and more delightful.
// ------------------------------------------------------------
function HamburgerIcon({ isOpen }) {
  const barBase = {
    display:       "block",
    width:         "22px",
    height:        "1.5px",
    background:    "var(--text-secondary)",
    borderRadius:  "9999px",
    transition:    "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
    transformOrigin: "center",
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "5px", cursor: "pointer" }}
      aria-hidden="true"
    >
      <span style={{
        ...barBase,
        transform: isOpen ? "translateY(6.5px) rotate(45deg)" : "none",
      }} />
      <span style={{
        ...barBase,
        opacity:   isOpen ? 0 : 1,
        transform: isOpen ? "scaleX(0)" : "none",
      }} />
      <span style={{
        ...barBase,
        transform: isOpen ? "translateY(-6.5px) rotate(-45deg)" : "none",
      }} />
    </div>
  );
}

// ------------------------------------------------------------
// MobileMenu — full-width dropdown panel for small screens.
// Animates in with a clip-path reveal for a premium feel.
// clip-path is GPU-accelerated — no repaints.
// ------------------------------------------------------------
function MobileMenu({ isOpen, onClose }) {
  return (
    <div
      style={{
        position:   "absolute",
        top:        "100%",
        left:       0,
        right:      0,
        background: "rgba(9,9,15,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--border-default)",
        padding:    isOpen ? "1.5rem var(--space-6) 2rem" : "0 var(--space-6) 0",
        overflow:   "hidden",
        // clip-path reveal animation — top-to-bottom unfold
        clipPath:   isOpen
          ? "inset(0% 0% 0% 0% round 0 0 12px 12px)"
          : "inset(0% 0% 100% 0% round 0 0 12px 12px)",
        transition: "clip-path 0.35s cubic-bezier(0.4,0,0.2,1), padding 0.35s ease",
        pointerEvents: isOpen ? "auto" : "none",
        zIndex: 40,
      }}
      aria-hidden={!isOpen}
    >
      <nav
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "0.25rem",
        }}
      >
        {NAV_LINKS.map((link, i) => (
          <MobileNavLink
            key={link.path}
            {...link}
            delay={i * 60}
            isMenuOpen={isOpen}
            onClose={onClose}
          />
        ))}

        {/* CTA inside mobile menu */}
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
          <Link
            to="/review"
            onClick={onClose}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "0.5rem",
              padding:        "0.75rem 1.5rem",
              borderRadius:   "9999px",
              background:     "var(--accent-primary)",
              color:          "#fff",
              fontFamily:     "var(--font-body)",
              fontSize:       "0.9rem",
              fontWeight:     500,
              textDecoration: "none",
              transition:     "background var(--transition-fast), box-shadow var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background  = "#4f52e0";
              e.currentTarget.style.boxShadow   = "var(--shadow-glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background  = "var(--accent-primary)";
              e.currentTarget.style.boxShadow   = "none";
            }}
          >
            Start Review
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

// Single item inside MobileMenu — staggers in with delay
function MobileNavLink({ label, path, delay, isMenuOpen, onClose }) {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      to={path}
      onClick={onClose}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "0.75rem",
        padding:        "0.75rem 1rem",
        borderRadius:   "var(--radius-md)",
        fontFamily:     "var(--font-body)",
        fontSize:       "1rem",
        fontWeight:     isActive ? 500 : 400,
        color:          isActive ? "var(--text-accent)" : "var(--text-secondary)",
        background:     isActive ? "var(--accent-primary-dim)" : "transparent",
        border:         `1px solid ${isActive ? "var(--border-accent)" : "transparent"}`,
        textDecoration: "none",
        transition:     `
          opacity 0.3s ease ${delay}ms,
          transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
          background var(--transition-fast),
          color var(--transition-fast)
        `,
        opacity:        isMenuOpen ? 1 : 0,
        transform:      isMenuOpen ? "translateX(0)" : "translateX(-12px)",
      }}
    >
      {/* Active dot indicator */}
      {isActive && (
        <span
          style={{
            width:        "6px",
            height:       "6px",
            borderRadius: "50%",
            background:   "var(--accent-primary)",
            boxShadow:    "0 0 8px var(--accent-primary-glow)",
            flexShrink:   0,
          }}
          aria-hidden="true"
        />
      )}
      {label}
    </Link>
  );
}

// ------------------------------------------------------------
// Navbar — main export.
// Scroll-aware: becomes more opaque + adds bottom border
// after the user scrolls 20px (signals they've left the hero).
// ------------------------------------------------------------
export default function Navbar() {
  const [isMenuOpen,  setIsMenuOpen]  = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  // Scroll detection — switches navbar from transparent to frosted
  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  return (
    <header
      role="banner"
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        right:      0,
        height:     "var(--navbar-height)",
        zIndex:     50,
        // Scroll-aware background transition:
        // transparent on hero → frosted glass after scroll
        background: hasScrolled
          ? "rgba(9,9,15,0.88)"
          : "rgba(9,9,15,0.4)",
        backdropFilter:       "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: hasScrolled
          ? "1px solid var(--border-default)"
          : "1px solid transparent",
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}
    >
      {/* Inner container — flex row, space between */}
      <div
        className="container-app"
        style={{
          height:         "100%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
        }}
      >

        {/* ── LEFT: Logo + Wordmark ── */}
        <Link
          to="/"
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            "0.625rem",
            textDecoration: "none",
            flexShrink:     0,
          }}
          aria-label="CodeSentinel — go to homepage"
        >
          <LogoIcon />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily:  "var(--font-display)",
                fontSize:    "1rem",
                fontWeight:  700,
                background:  "linear-gradient(135deg, #e0e7ff, #c4b5fd)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                backgroundClip:       "text",
                letterSpacing:        "-0.01em",
              }}
            >
              CodeSentinel
            </span>
            <span
              style={{
                fontFamily:  "var(--font-mono)",
                fontSize:    "0.58rem",
                color:       "var(--text-tertiary)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Multi-Agent AI
            </span>
          </div>
        </Link>

        {/* ── CENTER: Desktop Nav Links ── */}
        <nav
          aria-label="Main navigation"
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "2rem",
          }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map((link) => (
            <NavLink key={link.path} {...link} />
          ))}
        </nav>

        {/* ── RIGHT: CTA Button + Hamburger ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>

          {/* Desktop CTA — "Start Review" */}
          <Link
            to="/review"
            className="hidden md:inline-flex"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            "0.4rem",
              padding:        "0.45rem 1.1rem",
              borderRadius:   "9999px",
              background:     "var(--accent-primary-dim)",
              border:         "1px solid var(--border-accent)",
              color:          "var(--text-accent)",
              fontFamily:     "var(--font-body)",
              fontSize:       "0.85rem",
              fontWeight:     500,
              textDecoration: "none",
              transition:     "all var(--transition-base)",
              whiteSpace:     "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background  = "var(--accent-primary)";
              e.currentTarget.style.color        = "#fff";
              e.currentTarget.style.borderColor  = "var(--accent-primary)";
              e.currentTarget.style.boxShadow    = "var(--shadow-glow-accent)";
              e.currentTarget.style.transform    = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background   = "var(--accent-primary-dim)";
              e.currentTarget.style.color         = "var(--text-accent)";
              e.currentTarget.style.borderColor   = "var(--border-accent)";
              e.currentTarget.style.boxShadow     = "none";
              e.currentTarget.style.transform     = "translateY(0)";
            }}
          >
            {/* Pulsing dot — signals "live / active system" */}
            <span
              style={{
                width:        "6px",
                height:       "6px",
                borderRadius: "50%",
                background:   "var(--accent-primary)",
                boxShadow:    "0 0 6px var(--accent-primary-glow)",
                animation:    "pulse-glow 2s ease-in-out infinite",
                flexShrink:   0,
              }}
              aria-hidden="true"
            />
            Start Review
          </Link>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            className="flex md:hidden"
            style={{
              padding:        "0.5rem",
              borderRadius:   "var(--radius-sm)",
              background:     "transparent",
              border:         "none",
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <HamburgerIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div id="mobile-menu">
        <MobileMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
        />
      </div>
    </header>
  );
}