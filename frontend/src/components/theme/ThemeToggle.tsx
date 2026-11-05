"use client";

import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2.5 12h2m15 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <path d="M19.2 15.4A8.1 8.1 0 0 1 8.6 4.8 8.25 8.25 0 1 0 19.2 15.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const light = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar tema ${light ? "escuro" : "claro"}`}
      aria-pressed={light}
      title={`Tema ${light ? "claro" : "escuro"}. Clique para alternar.`}
      className={`theme-toggle ${className}`}
      data-theme={theme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" />
        <span className="theme-toggle-icon theme-toggle-sun"><SunIcon /></span>
        <span className="theme-toggle-icon theme-toggle-moon"><MoonIcon /></span>
      </span>
      <span className="theme-toggle-label">{light ? "Claro" : "Escuro"}</span>
    </button>
  );
}
