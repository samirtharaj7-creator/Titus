/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
