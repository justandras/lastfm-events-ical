import pino, { Logger as PinoLogger } from "pino";

/**
 * Application logger abstraction. Wraps pino for consistent logging.
 */
export class Logger {
  private readonly _pino: PinoLogger;

  public constructor(level: string = process.env.LOG_LEVEL ?? "info") {
    this._pino = pino({
      level,
      ...(process.env.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
    });
  }

  public info(msg: string): void;
  public info(obj: object, msg?: string): void;
  public info(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === "string") {
      this._pino.info(objOrMsg);
    } else {
      this._pino.info(objOrMsg, msg);
    }
  }

  public warn(msg: string): void;
  public warn(obj: object, msg?: string): void;
  public warn(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === "string") {
      this._pino.warn(objOrMsg);
    } else {
      this._pino.warn(objOrMsg, msg);
    }
  }

  public error(msg: string): void;
  public error(obj: object, msg?: string): void;
  public error(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === "string") {
      this._pino.error(objOrMsg);
    } else {
      this._pino.error(objOrMsg, msg);
    }
  }

  public fatal(obj: object, msg: string): void {
    this._pino.fatal(obj, msg);
  }
}
