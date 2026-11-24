/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker usa la salida standalone. Vercel empaqueta con su propio adaptador.
  output: process.env.VERCEL === '1' ? undefined : 'standalone',
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '')
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ]
  },
}

module.exports = nextConfig
