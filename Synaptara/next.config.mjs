/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) so
  // the Docker image doesn't need to ship node_modules/ or the source tree.
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  // Optional: proxy /api/backend/* → FastAPI so browser calls never need CORS
  // Uncomment if you want same-origin API calls from the browser:
  //
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/backend/:path*",
  //       destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
