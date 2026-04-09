// // ============================================================
// // components/Footer.jsx — Site-wide Footer
// // Persistent bottom section with brand, links, tech stack,
// // and a subtle ambient glow strip at the top edge.
// // ============================================================

// import { Link, useLocation } from "react-router-dom";

// // ------------------------------------------------------------
// // CONSTANTS
// // ------------------------------------------------------------
// const NAV_LINKS = [
//   { label: "Home",   path: "/" },
//   { label: "Review", path: "/review" },
// ];

// const TECH_STACK = [
//   { label: "LangGraph",  color: "var(--accent-primary)",  dim: "var(--accent-primary-dim)",  border: "var(--border-accent)" },
//   { label: "CrewAI",     color: "var(--agent-perf)",      dim: "var(--agent-perf-dim)",      border: "rgba(16,185,129,0.25)" },
//   { label: "Deepseek-coder-v2",     color: "var(--agent-security)",  dim: "var(--agent-security-dim)",  border: "rgba(245,158,11,0.25)" },
//   { label: "FastAPI",    color: "var(--agent-perf)",      dim: "var(--agent-perf-dim)",      border: "rgba(16,185,129,0.25)" },
//   { label: "React",      color: "var(--text-accent)",     dim: "var(--accent-primary-dim)",  border: "var(--border-accent)" },
//   { label: "Docker",     color: "var(--agent-bug)",       dim: "var(--agent-bug-dim)",       border: "rgba(244,63,94,0.25)" },
// ];

// const AGENT_PILLS = [
//   { label: "Bug Detector",       color: "var(--agent-bug)",      dim: "var(--agent-bug-dim)",      border: "rgba(244,63,94,0.25)" },
//   { label: "Security Analyst",   color: "var(--agent-security)", dim: "var(--agent-security-dim)", border: "rgba(245,158,11,0.25)" },
//   { label: "Optimization Advisor", color: "var(--agent-perf)",   dim: "var(--agent-perf-dim)",     border: "rgba(16,185,129,0.25)" },
// ];

// // ------------------------------------------------------------
// // LogoIcon — reused from Navbar (inline, no import needed)
// // ------------------------------------------------------------
// function LogoIcon() {
//   return (
//     <svg
//       width="28"
//       height="28"
//       viewBox="0 0 32 32"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       aria-hidden="true"
//     >
//       <path
//         d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z"
//         stroke="url(#footer-logo-gradient)"
//         strokeWidth="1.5"
//         fill="rgba(99,102,241,0.08)"
//       />
//       <circle cx="16" cy="16" r="3" fill="url(#footer-logo-gradient)" />
//       <line x1="16" y1="7"  x2="16" y2="13" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <line x1="16" y1="19" x2="16" y2="25" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <line x1="8"  y1="11" x2="13" y2="14" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <line x1="19" y1="18" x2="24" y2="21" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <line x1="24" y1="11" x2="19" y2="14" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <line x1="13" y1="18" x2="8"  y2="21" stroke="url(#footer-logo-gradient)" strokeWidth="1" strokeOpacity="0.6" />
//       <defs>
//         <linearGradient id="footer-logo-gradient" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
//           <stop offset="0%"   stopColor="#818cf8" />
//           <stop offset="100%" stopColor="#c084fc" />
//         </linearGradient>
//       </defs>
//     </svg>
//   );
// }

// // ------------------------------------------------------------
// // TechPill — small colored badge for a technology
// // ------------------------------------------------------------
// function TechPill({ label, color, dim, border }) {
//   return (
//     <span
//       style={{
//         display:       "inline-flex",
//         alignItems:    "center",
//         padding:       "0.2em 0.65em",
//         borderRadius:  "var(--radius-full)",
//         fontFamily:    "var(--font-mono)",
//         fontSize:      "0.65rem",
//         fontWeight:    700,
//         letterSpacing: "0.06em",
//         textTransform: "uppercase",
//         background:    dim,
//         color:         color,
//         border:        `1px solid ${border}`,
//         whiteSpace:    "nowrap",
//       }}
//     >
//       {label}
//     </span>
//   );
// }

// // ------------------------------------------------------------
// // FooterNavLink — nav link with active underline
// // ------------------------------------------------------------
// function FooterNavLink({ label, path }) {
//   const location = useLocation();
//   const isActive = location.pathname === path;

//   return (
//     <Link
//       to={path}
//       style={{
//         fontFamily:     "var(--font-body)",
//         fontSize:       "0.85rem",
//         color:          isActive ? "var(--text-accent)" : "var(--text-tertiary)",
//         textDecoration: "none",
//         transition:     "color var(--transition-fast)",
//         letterSpacing:  "0.01em",
//       }}
//       onMouseEnter={(e) => {
//         if (!isActive) e.currentTarget.style.color = "var(--text-secondary)";
//       }}
//       onMouseLeave={(e) => {
//         if (!isActive) e.currentTarget.style.color = "var(--text-tertiary)";
//       }}
//     >
//       {label}
//     </Link>
//   );
// }

// // ------------------------------------------------------------
// // Footer — main export
// // ------------------------------------------------------------
// export default function Footer() {
//   const year = new Date().getFullYear();

//   return (
//     <footer
//       role="contentinfo"
//       style={{
//         position:   "relative",
//         background: "var(--bg-base)",
//         borderTop:  "1px solid var(--border-subtle)",
//       }}
//     >
//       {/* Ambient glow strip at the very top edge */}
//       <div
//         aria-hidden="true"
//         style={{
//           position:   "absolute",
//           top:        0,
//           left:       "50%",
//           transform:  "translateX(-50%)",
//           width:      "60%",
//           height:     "1px",
//           background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5) 30%, rgba(167,139,250,0.5) 70%, transparent)",
//           pointerEvents: "none",
//         }}
//       />

//       {/* Main footer content */}
//       <div
//         className="container-app"
//         style={{
//           paddingTop:    "3rem",
//           paddingBottom: "2rem",
//           display:       "flex",
//           flexDirection: "column",
//           gap:           "2.5rem",
//         }}
//       >

//         {/* ── Top row: Brand + Nav + CTA ── */}
//         <div
//           className="footer-top"
//           style={{
//             display:        "flex",
//             alignItems:     "flex-start",
//             justifyContent: "space-between",
//             gap:            "2rem",
//             flexWrap:       "wrap",
//           }}
//         >
//           {/* Brand block */}
//           <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "300px" }}>
//             <Link
//               to="/"
//               style={{
//                 display:        "inline-flex",
//                 alignItems:     "center",
//                 gap:            "0.55rem",
//                 textDecoration: "none",
//               }}
//               aria-label="CodeSentinel — go to homepage"
//             >
//               <LogoIcon />
//               <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
//                 <span
//                   style={{
//                     fontFamily:           "var(--font-display)",
//                     fontSize:             "0.95rem",
//                     fontWeight:           700,
//                     background:           "linear-gradient(135deg, #e0e7ff, #c4b5fd)",
//                     WebkitBackgroundClip: "text",
//                     WebkitTextFillColor:  "transparent",
//                     backgroundClip:       "text",
//                     letterSpacing:        "-0.01em",
//                   }}
//                 >
//                   CodeSentinel
//                 </span>
//                 <span
//                   style={{
//                     fontFamily:    "var(--font-mono)",
//                     fontSize:      "0.55rem",
//                     color:         "var(--text-tertiary)",
//                     letterSpacing: "0.12em",
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   Multi-Agent AI
//                 </span>
//               </div>
//             </Link>

//             <p
//               style={{
//                 fontFamily:  "var(--font-body)",
//                 fontSize:    "0.8rem",
//                 color:       "var(--text-tertiary)",
//                 lineHeight:  1.65,
//                 maxWidth:    "26ch",
//               }}
//             >
//               Three specialized AI agents review your code for bugs,
//               security flaws, and performance issues — in parallel.
//             </p>

//             {/* Agent pills */}
//             <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.1rem" }}>
//               {AGENT_PILLS.map((pill) => (
//                 <TechPill key={pill.label} {...pill} />
//               ))}
//             </div>
//           </div>

//           {/* Right cluster: Nav + CTA */}
//           <div
//             style={{
//               display:   "flex",
//               gap:       "3rem",
//               flexWrap:  "wrap",
//               alignItems: "flex-start",
//             }}
//           >
//             {/* Navigation column */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
//               <p
//                 style={{
//                   fontFamily:    "var(--font-mono)",
//                   fontSize:      "0.62rem",
//                   color:         "var(--text-accent)",
//                   letterSpacing: "0.1em",
//                   textTransform: "uppercase",
//                   marginBottom:  "0.6rem",
//                   maxWidth:      "none",
//                 }}
//               >
//                 Pages
//               </p>
//               {NAV_LINKS.map((link) => (
//                 <FooterNavLink key={link.path} {...link} />
//               ))}
//             </div>

//             {/* Stack column */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
//               <p
//                 style={{
//                   fontFamily:    "var(--font-mono)",
//                   fontSize:      "0.62rem",
//                   color:         "var(--text-accent)",
//                   letterSpacing: "0.1em",
//                   textTransform: "uppercase",
//                   marginBottom:  "0.6rem",
//                   maxWidth:      "none",
//                 }}
//               >
//                 Tech Stack
//               </p>
//               <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
//                 {TECH_STACK.map((t) => (
//                   <TechPill key={t.label} {...t} />
//                 ))}
//               </div>
//             </div>

//             {/* CTA column */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
//               <p
//                 style={{
//                   fontFamily:    "var(--font-mono)",
//                   fontSize:      "0.62rem",
//                   color:         "var(--text-accent)",
//                   letterSpacing: "0.1em",
//                   textTransform: "uppercase",
//                   marginBottom:  "0.1rem",
//                   maxWidth:      "none",
//                 }}
//               >
//                 Get Started
//               </p>
//               <Link
//                 to="/review"
//                 style={{
//                   display:        "inline-flex",
//                   alignItems:     "center",
//                   gap:            "0.4rem",
//                   padding:        "0.55rem 1.1rem",
//                   borderRadius:   "var(--radius-full)",
//                   background:     "var(--accent-primary)",
//                   color:          "#fff",
//                   fontFamily:     "var(--font-body)",
//                   fontSize:       "0.82rem",
//                   fontWeight:     500,
//                   textDecoration: "none",
//                   transition:     "all var(--transition-base)",
//                   whiteSpace:     "nowrap",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.background  = "#4f52e0";
//                   e.currentTarget.style.boxShadow   = "var(--shadow-glow-accent)";
//                   e.currentTarget.style.transform   = "translateY(-1px)";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.background  = "var(--accent-primary)";
//                   e.currentTarget.style.boxShadow   = "none";
//                   e.currentTarget.style.transform   = "translateY(0)";
//                 }}
//               >
//                 <span
//                   style={{
//                     width:        "6px",
//                     height:       "6px",
//                     borderRadius: "50%",
//                     background:   "#fff",
//                     opacity:      0.8,
//                     animation:    "pulse-glow 2s ease-in-out infinite",
//                     flexShrink:   0,
//                   }}
//                   aria-hidden="true"
//                 />
//                 Analyze Code
//               </Link>
//             </div>
//           </div>
//         </div>

//         {/* ── Divider ── */}
//         <hr className="divider" style={{ marginBlock: 0 }} />

//         {/* ── Bottom row: copyright + pipeline status ── */}
//         <div
//           className="footer-bottom"
//           style={{
//             display:        "flex",
//             alignItems:     "center",
//             justifyContent: "space-between",
//             gap:            "1rem",
//             flexWrap:       "wrap",
//           }}
//         >
//           {/* Copyright */}
//           <p
//             style={{
//               fontFamily:  "var(--font-body)",
//               fontSize:    "0.75rem",
//               color:       "var(--text-disabled)",
//               maxWidth:    "none",
//             }}
//           >
//             © {year} CodeSentinel. Built with LangGraph &amp; CrewAI.
//           </p>

//           {/* Pipeline status strip */}
//           <div
//             style={{
//               display:    "flex",
//               alignItems: "center",
//               gap:        "0.5rem",
//               flexWrap:   "wrap",
//             }}
//             aria-label="Agent pipeline status"
//           >
//             {[
//               { label: "Bug",      color: "var(--agent-bug)" },
//               { label: "Security", color: "var(--agent-security)" },
//               { label: "Perf",     color: "var(--agent-perf)" },
//             ].map((agent, i) => (
//               <span
//                 key={agent.label}
//                 style={{
//                   display:     "inline-flex",
//                   alignItems:  "center",
//                   gap:         "0.35rem",
//                   fontFamily:  "var(--font-mono)",
//                   fontSize:    "0.62rem",
//                   color:       "var(--text-disabled)",
//                   letterSpacing: "0.05em",
//                 }}
//               >
//                 {/* Live dot */}
//                 <span
//                   style={{
//                     width:        "5px",
//                     height:       "5px",
//                     borderRadius: "50%",
//                     background:   agent.color,
//                     opacity:      0.7,
//                     animation:    `pulse-glow ${2 + i * 0.4}s ease-in-out infinite`,
//                     flexShrink:   0,
//                   }}
//                   aria-hidden="true"
//                 />
//                 {agent.label}
//               </span>
//             ))}

//             <span
//               style={{
//                 fontFamily:    "var(--font-mono)",
//                 fontSize:      "0.62rem",
//                 color:         "var(--text-disabled)",
//                 letterSpacing: "0.05em",
//                 paddingLeft:   "0.3rem",
//                 borderLeft:    "1px solid var(--border-subtle)",
//               }}
//             >
//               Agents Online
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Responsive overrides */}
//       <style>{`
//         @media (max-width: 680px) {
//           .footer-top    { flex-direction: column !important; }
//           .footer-bottom { flex-direction: column !important; align-items: flex-start !important; }
//         }
//       `}</style>
//     </footer>
//   );
// }