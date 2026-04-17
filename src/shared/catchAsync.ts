import { NextFunction, Request, RequestHandler, Response } from "express";

// Wraps any async route handler.
// If the handler throws (or rejects), the error is forwarded to
// the global error handler via next(error) automatically.
// This means controllers no longer need their own try/catch blocks.
const catchAsync = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
