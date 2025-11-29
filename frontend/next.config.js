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
        bufferutil: false,
        "utf-8-validate": false,
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
    } else {
      // Server-side: allow bufferutil for WebSocket support
      config.externals = config.externals || [];
      config.externals.push({
        bufferutil: 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
      });
    }
    return config;
  },
};

module.exports = nextConfig

