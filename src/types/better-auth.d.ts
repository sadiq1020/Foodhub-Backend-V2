// Extends Better Auth's session user type with your custom fields
import { DefaultSession } from "better-auth";

declare module "better-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      role: string;
      isActive: boolean;
      phone?: string | null;
    };
  }
}
