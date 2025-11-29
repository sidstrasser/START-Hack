/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore Node.js modules in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        "node:child_process": false,
        "node:events": false,
        "node:stream": false,
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:crypto": false,
        "node:url": false,
        "node:zlib": false,
        "node:http": false,
        "node:https": false,
        "node:os": false,
        "node:path": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig

