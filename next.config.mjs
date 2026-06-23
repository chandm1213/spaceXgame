/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  webpack: (config) => {
    // Privy lazily references optional integrations we don't use (fiat onramp,
    // Farcaster mini-app). Stub them out so webpack doesn't fail to resolve them.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stripe/crypto': false,
      '@farcaster/mini-app-solana': false,
    };
    return config;
  },
};

export default nextConfig;
