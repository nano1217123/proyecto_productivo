/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker usa la salida standalone. Vercel empaqueta con su propio adaptador.
  output: process.env.VERCEL === '1' ? undefined : 'standalone',
}

module.exports = nextConfig
