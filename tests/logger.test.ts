import { Logger, LogLevel } from "../src/utils/logger";

describe("Logger", () => {
  const originalEnv = process.env;

  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };

    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  // ────────────────────────────────────────────────────────────────
  // parseLogLevel
  // ────────────────────────────────────────────────────────────────
  test("parseLogLevel: resolves known levels correctly", () => {
    process.env.LOG_LEVEL = "DEBUG";
    const logger = new Logger("Test");

    // @ts-ignore - accessing private for test
    expect(logger["parseLogLevel"]("DEBUG")).toBe(LogLevel.DEBUG);
    expect(logger["parseLogLevel"]("INFO")).toBe(LogLevel.INFO);
    expect(logger["parseLogLevel"]("WARN")).toBe(LogLevel.WARN);
  });

  test("parseLogLevel: defaults to ERROR for unknown values", () => {
    const logger = new Logger("Test");

    // @ts-ignore
    expect(logger["parseLogLevel"]("nope")).toBe(LogLevel.ERROR);
    // @ts-ignore
    expect(logger["parseLogLevel"](undefined)).toBe(LogLevel.ERROR);
  });

  // ────────────────────────────────────────────────────────────────
  // getNumLogLevel
  // ────────────────────────────────────────────────────────────────
  test("getNumLogLevel: maps levels to numeric values", () => {
    const logger = new Logger("X");

    // @ts-ignore
    expect(logger["getNumLogLevel"](LogLevel.DEBUG)).toBe(0);
    // @ts-ignore
    expect(logger["getNumLogLevel"](LogLevel.INFO)).toBe(1);
    // @ts-ignore
    expect(logger["getNumLogLevel"](LogLevel.WARN)).toBe(2);
    // @ts-ignore
    expect(logger["getNumLogLevel"](LogLevel.ERROR)).toBe(3);
  });

  // ────────────────────────────────────────────────────────────────
  // log() behavior depending on LOG_LEVEL
  // ────────────────────────────────────────────────────────────────
  test("DEBUG level: logs everything", () => {
    process.env.LOG_LEVEL = "DEBUG";
    const logger = new Logger("ModuleA");

    logger.log("hello", LogLevel.DEBUG);
    logger.log("info msg", LogLevel.INFO);
    logger.log("warn msg", LogLevel.WARN);
    logger.log("err msg", LogLevel.ERROR);

    expect(debugSpy).toHaveBeenCalledWith("[DEBUG] |ModuleA| hello");
    expect(infoSpy).toHaveBeenCalledWith("[INFO] |ModuleA| info msg");
    expect(warnSpy).toHaveBeenCalledWith("[WARNING] |ModuleA| warn msg");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR] |ModuleA| err msg");
  });

  test("INFO level: suppresses debug, logs info/warn/error", () => {
    process.env.LOG_LEVEL = "INFO";
    const logger = new Logger("ModuleB");

    logger.log("hello", LogLevel.DEBUG); // should NOT log
    logger.log("info", LogLevel.INFO);
    logger.log("warn", LogLevel.WARN);
    logger.log("err", LogLevel.ERROR);

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[INFO] |ModuleB| info");
    expect(warnSpy).toHaveBeenCalledWith("[WARNING] |ModuleB| warn");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR] |ModuleB| err");
  });

  test("WARN level: logs warn/error only", () => {
    process.env.LOG_LEVEL = "WARN";
    const logger = new Logger("ModuleC");

    logger.log("debug", LogLevel.DEBUG);
    logger.log("info", LogLevel.INFO);
    logger.log("warn", LogLevel.WARN);
    logger.log("err", LogLevel.ERROR);

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledWith("[WARNING] |ModuleC| warn");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR] |ModuleC| err");
  });

  test("ERROR level: logs ONLY error", () => {
    process.env.LOG_LEVEL = "ERROR";
    const logger = new Logger("ModuleD");

    logger.log("debug", LogLevel.DEBUG);
    logger.log("info", LogLevel.INFO);
    logger.log("warn", LogLevel.WARN);
    logger.log("err", LogLevel.ERROR);

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    expect(errorSpy).toHaveBeenCalledWith("[ERROR] |ModuleD| err");
  });

  // ────────────────────────────────────────────────────────────────
  // default behaviors
  // ────────────────────────────────────────────────────────────────
  test("uses INFO as default level when none provided", () => {
    process.env.LOG_LEVEL = "DEBUG";
    const logger = new Logger("Auto");

    logger.log("msg");

    expect(infoSpy).toHaveBeenCalledWith("[INFO] |Auto| msg");
  });
});
