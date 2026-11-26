/** @type {import('next').NextConfig} */
const nextConfig = {
  // One less response header on every request.
  poweredByHeader: false,
  images: {
    // AVIF first (smaller than WebP for the logo lockup where browsers
    // support it); WebP remains the fallback.
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;
