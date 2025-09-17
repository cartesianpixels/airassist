"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Theme = "light" | "dark" | "system";

export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<Theme>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Get theme from localStorage or default to system
    const savedTheme = localStorage.getItem("theme") as Theme || "system";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    }
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const getNextTheme = (): Theme => {
    if (theme === "light") return "dark";
    if (theme === "dark") return "system";
    return "light";
  };

  const getCurrentIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "System";
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full bg-surface-hover border border-border animate-pulse" />
    );
  }

  const Icon = getCurrentIcon();

  return (
    <motion.button
      onClick={() => changeTheme(getNextTheme())}
      className="relative group w-10 h-10 rounded-full glass-strong hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary overflow-hidden"
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", damping: 15, stiffness: 300 }}
      aria-label={`Switch to ${getNextTheme()} theme`}
      title={`Current: ${getThemeLabel()}`}
    >
      {/* Background gradient that changes with theme */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: theme === "light"
            ? "linear-gradient(135deg, hsl(var(--brand-primary) / 0.1), hsl(var(--brand-secondary) / 0.1))"
            : theme === "dark"
            ? "linear-gradient(135deg, hsl(var(--brand-primary) / 0.2), hsl(var(--brand-secondary) / 0.2))"
            : "linear-gradient(135deg, hsl(var(--info) / 0.1), hsl(var(--brand-accent) / 0.1))"
        }}
      />

      {/* Icon container */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
          >
            <Icon
              className="w-5 h-5 text-foreground group-hover:text-brand-primary transition-colors"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 rounded-full bg-brand-primary opacity-0"
        initial={false}
        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
        transition={{ duration: 0.6 }}
        key={`ripple-${theme}`}
      />

      {/* Tooltip */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-surface-elevated border border-border rounded-lg px-2 py-1 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
        {getThemeLabel()}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-surface-elevated border-l border-t border-border rotate-45"></div>
      </div>
    </motion.button>
  );
}

// Compact version for mobile/smaller spaces
export function ThemeSwitcherCompact() {
  const [theme, setTheme] = React.useState<Theme>("system");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme || "system";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    }
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) {
    return <div className="w-8 h-8 rounded-lg bg-surface-hover animate-pulse" />;
  }

  const themes = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "Auto" },
  ] as const;

  return (
    <div className="flex rounded-lg p-1 glass-strong">
      {themes.map(({ value, icon: Icon, label }) => (
        <motion.button
          key={value}
          onClick={() => changeTheme(value)}
          className={`relative px-2 py-1 rounded-md text-xs font-medium transition-all ${
            theme === value
              ? "text-white bg-brand-primary shadow-md"
              : "text-foreground-muted hover:text-foreground hover:bg-surface-hover"
          }`}
          whileTap={{ scale: 0.95 }}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon className="w-3 h-3" />
          {theme === value && (
            <motion.div
              layoutId="activeTheme"
              className="absolute inset-0 bg-brand-primary rounded-md -z-10"
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}