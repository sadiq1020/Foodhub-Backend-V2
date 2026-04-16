import { NextFunction, Request, Response } from "express";
import { auth as betterAuth } from "../lib/auth";
import { UserRole } from "../shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        emailVerified: boolean;
      };
    }
  }
}

const auth = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await betterAuth.api.getSession({
        headers: req.headers as any,
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please log in.",
        });
      }

      // Block unverified users from ALL protected routes
      if (!session.user.emailVerified) {
        return res.status(403).json({
          success: false,
          message:
            "Email not verified. Please check your inbox for the OTP and verify your email first.",
        });
      }

      // Block suspended/deactivated users
      if (session.user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact support.",
        });
      }

      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role as UserRole,
        emailVerified: session.user.emailVerified,
      };

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. This action requires the ${roles.join(" or ")} role.`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
