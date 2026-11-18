/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverComponentsExternalPackages: ["unpdf", "pdfjs-dist", "mammoth"],
};

export default nextConfig;
