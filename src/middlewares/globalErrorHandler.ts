import { NextFunction, Request, Response } from "express";

// Prisma error codes we care about
// Full list: https://www.prisma.io/docs/orm/reference/error-reference
const PRISMA_NOT_FOUND_CODES = ["P2025", "P2001", "P2015", "P2018"];
const PRISMA_CONFLICT_CODES = ["P2002"];

const isPrismaError = (err: any): boolean =>
  typeof err?.code === "string" && err.code.startsWith("P");

const handlePrismaError = (err: any) => {
  const code: string = err.code;

  // Unique constraint violation (e.g. duplicate email, duplicate slug)
  if (PRISMA_CONFLICT_CODES.includes(code)) {
    const field = err.meta?.target
      ? String(err.meta.target).replace(/_/g, " ")
      : "field";
    return {
      statusCode: 409,
      message: `A record with this ${field} already exists.`,
    };
  }

  // Record not found
  if (PRISMA_NOT_FOUND_CODES.includes(code)) {
    return {
      statusCode: 404,
      message: err.meta?.cause || "The requested record was not found.",
    };
  }

  // Foreign key constraint (e.g. referencing a category/provider that doesn't exist)
  if (code === "P2003") {
    const field = err.meta?.field_name || "related record";
    return {
      statusCode: 400,
      message: `Invalid reference: the ${field} does not exist.`,
    };
  }

  // Fallback for other Prisma errors
  return {
    statusCode: 500,
    message: "A database error occurred.",
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const isDev = process.env.NODE_ENV === "development";

  // Log every error in development for debugging
  if (isDev) {
    console.error("🔴 Global Error Handler caught:", err);
  }

  // --- Operational errors thrown with AppError (e.g. "Meal not found") ---
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  // --- Prisma errors ---
  if (isPrismaError(err)) {
    const { statusCode, message } = handlePrismaError(err);
    return res.status(statusCode).json({
      success: false,
      message,
      ...(isDev && { prismaCode: err.code, stack: err.stack }),
    });
  }

  // --- JWT errors (in case you add custom JWT later) ---
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });
  }

  // --- SyntaxError from express.json() (malformed JSON body) ---
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
    });
  }

  // --- Unknown/unexpected errors ---
  // In production: hide internal details from the client
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : "Something went wrong. Please try again.",
    ...(isDev && { stack: err.stack }),
  });
};

export default globalErrorHandler;
