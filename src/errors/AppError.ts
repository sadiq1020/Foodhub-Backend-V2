class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks this as an expected/handled error

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
