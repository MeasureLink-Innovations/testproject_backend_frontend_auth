import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,
    // Turbopack now enabled by default; we still use a custom webpack
    // alias above.  To stop the "using Turbopack with a webpack config"
    // error we provide an explicit (empty) turbopack section.
    turbopack: {},
    // Webpack alias needed for path mappings (@/...)
    // Turbopack doesn’t automatically honor tsconfig paths, so we
    // define the same alias here to match `tsconfig.json`.
    webpack(config) {
        if (!config.resolve) config.resolve = {} as any;
        if (!config.resolve.alias) config.resolve.alias = {} as any;
        config.resolve.alias['@'] = __dirname;
        return config;
    },
};

export default nextConfig;
