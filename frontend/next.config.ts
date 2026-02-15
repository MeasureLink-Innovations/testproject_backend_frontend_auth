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
    webpack(config) {
        if (!config.resolve) config.resolve = {} as any;
        if (!config.resolve.alias) config.resolve.alias = {} as any;
        config.resolve.alias['@'] = __dirname;

        config.resolve.fallback = {
            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,
            fs: false, // the solution
        };

        return config;
    },
};

export default nextConfig;
