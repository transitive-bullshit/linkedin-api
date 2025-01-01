export interface Logger {
    debug(message?: any, ...optionalParams: any[]): void
    log(message?: any, ...optionalParams: any[]): void
    log(message?: any, ...optionalParams: any[]): void
    warn(message?: any, ...optionalParams: any[]): void
    error(message?: any, ...optionalParams: any[]): void
}

export enum LogLevel {
    Debug,
    Log,
    Warn,
    Error,
}