export interface ErrorLogger {
  warn(context: object, message: string): void
  error(context: object, message: string): void
}
