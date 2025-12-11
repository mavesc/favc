import { match } from "matchixir";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARNING",
  ERROR = "ERROR",
}

export class Logger {
  private module = "";
  private numLogLevel = 0;

  constructor(module: string = "") {
    this.module = module;
    this.numLogLevel = this.getNumLogLevel(
      this.parseLogLevel(process.env.LOG_LEVEL)
    );
  }

  public log(message: string, level: LogLevel = LogLevel.INFO) {
    const output = `[${level}] |${this.module}| ${message}`;
    match(level)
      .with(LogLevel.DEBUG, () => {
        if (this.numLogLevel === this.getNumLogLevel(LogLevel.DEBUG))
          console.debug(output);
      })
      .with(LogLevel.INFO, () => {
        if (this.numLogLevel <= this.getNumLogLevel(LogLevel.INFO))
          console.info(output);
      })
      .with(LogLevel.WARN, () => {
        if (this.numLogLevel <= this.getNumLogLevel(LogLevel.WARN))
          console.warn(output);
      })
      .with(LogLevel.ERROR, () => {
        if (this.numLogLevel <= this.getNumLogLevel(LogLevel.ERROR))
          console.error(output);
      });
  }

  private getNumLogLevel(logLevel: LogLevel): number {
    return match(logLevel)
      .with(LogLevel.DEBUG, () => 0)
      .with(LogLevel.INFO, () => 1)
      .with(LogLevel.WARN, () => 2)
      .none(() => 3);
  }

  private parseLogLevel(logLevel: string | undefined): LogLevel {
    return match(logLevel)
      .with("DEBUG", () => LogLevel.DEBUG)
      .with("INFO", () => LogLevel.INFO)
      .with("WARN", () => LogLevel.WARN)
      .none(() => LogLevel.ERROR);
  }
}
