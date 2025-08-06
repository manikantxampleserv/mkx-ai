import { createLogger, format, transports, Logger } from "winston";
import { Logger as WinstonLogger } from "winston";

export interface CustomLogger extends WinstonLogger {
  success: (msg: string) => void;
}

const COLORS: Record<string, string> = {
  info: "\x1b[34m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  success: "\x1b[32m",
  debug: "\x1b[36m",
  default: "\x1b[37m",
};
const RESET = "\x1b[0m";

const { combine, timestamp, printf, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  const color = COLORS[level] || COLORS.default;
  const coloredLevel = `${color}${level.toUpperCase()}${RESET}`;
  return `[${timestamp}] [${coloredLevel}]: ${stack || message}`;
});

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    success: "green",
    info: "blue",
    debug: "cyan",
  },
};

const logger: CustomLogger = createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [new transports.Console()],
  exitOnError: false,
}) as CustomLogger;

logger.success = function (msg: string) {
  this.log({ level: "success", message: msg });
};

export default logger;
