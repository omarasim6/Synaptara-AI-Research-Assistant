import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** FastAPI JWT — passed to all backend API calls */
      accessToken?: string;
    };
  }

  interface User {
    id: string;
    accessToken?: string;
    backendId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken?: string;
  }
}
