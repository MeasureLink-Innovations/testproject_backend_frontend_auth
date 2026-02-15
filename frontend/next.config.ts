import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    reactCompiler: true,
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
