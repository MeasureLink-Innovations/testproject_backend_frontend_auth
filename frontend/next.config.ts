import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,
    // Turbopack now enabled by default; we still use a custom webpack
    // alias above.  Configure resolveAlias explicitly so Turbopack knows
    // how to handle `@/...` imports during the default build.
    turbopack: {
        resolveAlias: {
            '@': path.resolve(__dirname),
        },
    },
    // Webpack alias needed for path mappings (@/...)
    // Turbopack doesn’t automatically honor tsconfig paths, so we
    // define the same alias here to match `tsconfig.json`.
    webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.node = {
        fs: 'empty'
      }
    }
    return config;
    },
};

export default nextConfig;
