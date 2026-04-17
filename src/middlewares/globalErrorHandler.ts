import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

const PRISMA_NOT_FOUND_CODES = ["P2025", "P2001", "P2015", "P2018"];
const PRISMA_CONFLICT_CODES = ["P2002"];

const isPrismaError = (err: any): boolean =>
  typeof err?.code === "string" && err.code.startsWith("P");

const handlePrismaError = (err: any) => {
  const code: string = err.code;

  if (PRISMA_CONFLICT_CODES.includes(code)) {
    const field = err.meta?.target
      ? String(err.meta.target).replace(/_/g, " ")
      : "field";
    return {
      statusCode: 409,
      message: `A record with this ${field} already exists.`,
    };
  }

  if (PRISMA_NOT_FOUND_CODES.includes(code)) {
    return {
      statusCode: 404,
      message: err.meta?.cause || "The requested record was not found.",
    };
  }

  if (code === "P2003") {
    const field = err.meta?.field_name || "related record";
    return {
      statusCode: 400,
      message: `Invalid reference: the ${field} does not exist.`,
    };
  }

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

  if (isDev) {
    console.error("🔴 Global Error Handler caught:", err);
  }

  // --- Zod validation errors ---
  if (err instanceof ZodError) {
    const errorDetails = err.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed. Please check your input.",
      errorDetails,
      ...(isDev && { stack: err.stack }),
    });
  }

  // --- Operational errors thrown with AppError ---
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      // include field-level details if present (e.g. from validateRequest)
      ...(err.errorDetails && { errorDetails: err.errorDetails }),
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

  // --- JWT errors ---
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

  // --- Malformed JSON body ---
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
    });
  }

  // --- Unknown errors ---
  return res.status(500).json({
    success: false,
    message: isDev ? err.message : "Something went wrong. Please try again.",
    ...(isDev && { stack: err.stack }),
  });
};

export default globalErrorHandler;
