/**
 * Simple structured logger.
 * - Development: colorful, readable output
 * - Production: JSON lines (easy to parse in log aggregators)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const isDev = process.env.NODE_ENV !== "production";

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const prefix = {
      info: "ℹ️ ",
      warn: "⚠️ ",
      error: "❌",
      debug: "🔍",
    }[entry.level];
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    return `${prefix} ${entry.message}${data}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (isDev) console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) =>
    log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) =>
    log("error", message, data),
  debug: (message: string, data?: Record<string, unknown>) =>
    log("debug", message, data),
};
