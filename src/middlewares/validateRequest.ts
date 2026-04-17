import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

// Takes a Zod schema, validates req.body against it.
// On failure → throws to globalErrorHandler (ZodError is caught there).
// On success → replaces req.body with the parsed (sanitized) data and calls next().
const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Forward the ZodError directly to globalErrorHandler
      return next(result.error);
    }

    // Replace req.body with the validated + sanitized data.
    // This strips any extra fields the client sent that aren't in the schema.
    req.body = result.data;

    next();
  };
};

export default validateRequest;
