import { Logger, LogLevel } from "./logger.js";

export class ConsoleLogger implements Logger {
    private _logLevel: LogLevel = LogLevel.Debug; // Default log level

    private redText = "\u001b[1;31m"
    private greenText = "\u001b[1;32m"
    private yellowText = "\u001b[1;33m"
    private blueText = "\u001b[1;34m"
    private purpleText = "\u001b[1;35m"
    private cyanText = "\u001b[1;36m"

    private redBgnd = "\u001b[1;41m"
    private greenBgnd = "\u001b[1;42m"
    private yellowBgnd = "\u001b[1;43m"
    private blueBgnd = "\u001b[1;44m"
    private purpleBgnd = "\u001b[1;45m"
    private cyanBgnd = "\u001b[1;46m"

    // Resets text and background to default
    private defaultStyle = "\u001b[0m"

    constructor(logLevel: LogLevel = LogLevel.Debug) {
        this._logLevel = logLevel
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this._logLevel;
    }

    debug(message?: any, ...optionalParams: any[]): void {
        if (this.shouldLog(LogLevel.Debug)) {
            console.debug(this.purpleText + message + this.defaultStyle, ...optionalParams);
        }
    }

    log(message?: any, ...optionalParams: any[]): void {
        if (this.shouldLog(LogLevel.Log)) {
            console.log(this.blueText + message + this.defaultStyle, ...optionalParams);
        }
    }

    info(message?: any, ...optionalParams: any[]): void {
        if (this.shouldLog(LogLevel.Log)) {
            console.info(this.greenText + message + this.defaultStyle, ...optionalParams);
        }
    }

    warn(message?: any, ...optionalParams: any[]): void {
        if (this.shouldLog(LogLevel.Warn)) {
            console.warn(this.yellowText + message + this.defaultStyle, ...optionalParams);
        }
    }

    error(message?: any, ...optionalParams: any[]): void {
        if (this.shouldLog(LogLevel.Error)) {
            console.error(this.redText + message + this.defaultStyle, ...optionalParams);
        }
    }
}