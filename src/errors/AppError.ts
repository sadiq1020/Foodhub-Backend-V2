export interface IErrorDetail {
  field: string;
  message: string;
}

class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorDetails?: IErrorDetail[];

  constructor(
    statusCode: number,
    message: string,
    errorDetails?: IErrorDetail[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorDetails = errorDetails;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
