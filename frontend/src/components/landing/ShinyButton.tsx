"use client";

import Link from "next/link";
import { useId, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getServerReducedMotionSnapshot() {
  return false;
}

interface ShinyButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  fillColor?: string;
  labelColor?: string;
  accentColor?: string;
  accentSoftColor?: string;
  sweepDuration?: number;
  easeDuration?: number;
  arcWidth?: number;
  cornerRadius?: number;
  showSpeckle?: boolean;
  showSheen?: boolean;
  speckleOpacity?: number;
}

export default function ShinyButton({
  label = "Começar agora",
  href,
  onClick,
  className = "",
  fillColor = "#10172a",
  labelColor = "#ffffff",
  accentColor = "#8b8eff",
  accentSoftColor = "#d6ccff",
  sweepDuration = 7,
  easeDuration = 0.45,
  arcWidth = 4,
  cornerRadius = 18,
  showSpeckle = false,
  showSheen = false,
  speckleOpacity = 0.2
}: ShinyButtonProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    getServerReducedMotionSnapshot
  );
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scope = `gleam-edge-${instanceId}`;

  const css = `
    @property --gradient-angle-${instanceId} {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @property --gradient-percent-${instanceId} {
      syntax: "<percentage>";
      initial-value: ${arcWidth}%;
      inherits: false;
    }
    @property --gradient-shine-${instanceId} {
      syntax: "<color>";
      initial-value: white;
      inherits: false;
    }

    .${scope} {
      --gleam-base: ${fillColor};
      --gleam-label: ${labelColor};
      --gleam-accent: ${accentColor};
      --gleam-accent-soft: ${accentSoftColor};
      --transition: ${easeDuration}s cubic-bezier(0.25, 1, 0.5, 1);
      isolation: isolate;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      outline-offset: 4px;
      padding: 1rem 1.5rem;
      border: 1px solid transparent;
      border-radius: ${cornerRadius}px;
      color: var(--gleam-label);
      font-family: inherit;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.2;
      text-decoration: none;
      background:
        linear-gradient(var(--gleam-base), var(--gleam-base)) padding-box,
        conic-gradient(
          from var(--gradient-angle-${instanceId}),
          transparent,
          var(--gleam-accent) var(--gradient-percent-${instanceId}),
          var(--gradient-shine-${instanceId}) calc(var(--gradient-percent-${instanceId}) * 2),
          var(--gleam-accent) calc(var(--gradient-percent-${instanceId}) * 3),
          transparent calc(var(--gradient-percent-${instanceId}) * 4)
        ) border-box;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gleam-base) 84%, var(--gleam-label));
      transition: translate var(--transition), box-shadow var(--transition),
        --gradient-percent-${instanceId} var(--transition),
        --gradient-shine-${instanceId} var(--transition);
      animation: gradient-angle-${instanceId} ${sweepDuration}s linear infinite;
    }

    .${scope}::before,
    .${scope}::after,
    .${scope} span::before {
      content: "";
      pointer-events: none;
      position: absolute;
      inset-inline-start: 50%;
      inset-block-start: 50%;
      translate: -50% -50%;
      z-index: -1;
    }

    .${scope}::before {
      width: calc(100% - 8px);
      height: calc(100% - 8px);
      border-radius: inherit;
      background: radial-gradient(circle at 2px 2px, white 0.5px, transparent 1px);
      background-size: 8px 8px;
      opacity: ${showSpeckle ? speckleOpacity : 0};
      animation: gradient-angle-${instanceId} ${sweepDuration}s linear infinite paused;
    }

    .${scope}::after {
      width: 100%;
      aspect-ratio: 1;
      background: linear-gradient(-50deg, transparent, var(--gleam-accent), transparent);
      mask-image: radial-gradient(circle at bottom, transparent 40%, black);
      opacity: ${showSheen ? 0.38 : 0};
      animation: shimmer-${instanceId} ${sweepDuration}s linear infinite paused;
    }

    .${scope} .shiny-button-content {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
    }

    .${scope} .shiny-button-content::before {
      width: calc(100% + 1rem);
      height: calc(100% + 1rem);
      border-radius: inherit;
      box-shadow: inset 0 -1ex 2rem 4px var(--gleam-accent);
      opacity: 0;
      transition: opacity var(--transition);
      animation: breathe-${instanceId} ${sweepDuration}s linear infinite paused;
    }

    .${scope} .shiny-button-arrow {
      transition: transform var(--transition);
    }

    .${scope}:hover,
    .${scope}:focus-visible {
      --gradient-percent-${instanceId}: 19%;
      --gradient-shine-${instanceId}: var(--gleam-accent-soft);
      --gradient-angle-${instanceId}: 95deg;
      translate: 0 -1px;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gleam-base) 84%, var(--gleam-label)),
        0 8px 24px -14px var(--gleam-accent);
    }

    .${scope}:active { translate: 0 0; }

    .${scope}:is(:hover, :focus-visible)::before,
    .${scope}:is(:hover, :focus-visible)::after {
      animation-play-state: running;
    }

    .${scope}:is(:hover, :focus-visible) .shiny-button-content::before {
      opacity: ${showSheen ? 0.7 : 0};
      animation-play-state: running;
    }

    .${scope}:is(:hover, :focus-visible) .shiny-button-arrow {
      transform: translateX(2px);
    }

    @keyframes gradient-angle-${instanceId} {
      to { --gradient-angle-${instanceId}: 360deg; }
    }
    @keyframes shimmer-${instanceId} {
      to { rotate: 360deg; }
    }
    @keyframes breathe-${instanceId} {
      from, to { scale: 1; }
      50% { scale: 1.12; }
    }

    @media (prefers-reduced-motion: reduce) {
      .${scope}, .${scope}::before, .${scope}::after,
      .${scope} .shiny-button-content::before {
        animation: none !important;
        transition: none !important;
      }
    }
  `;

  const content = (
    <span className="shiny-button-content">
      {label}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shiny-button-arrow h-[18px] w-[18px]"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </span>
  );

  return (
    <>
      <style>{css}</style>
      {href ? (
        <Link
          href={href}
          className={`${scope} ${className}`}
          onClick={onClick}
          aria-label={label}
          data-reduced-motion={reducedMotion ? "true" : undefined}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={`${scope} ${className}`}
          onClick={onClick}
          aria-label={label}
          data-reduced-motion={reducedMotion ? "true" : undefined}
        >
          {content}
        </button>
      )}
    </>
  );
}
