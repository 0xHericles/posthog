import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import pkg from './package.json'
import typescript from 'rollup-plugin-typescript2'
import dts from 'rollup-plugin-dts'
import json from '@rollup/plugin-json'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

const external = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.peerDependencies || {}))

export default [
    {
        input: './src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
        },
        external,
        plugins: [
            // Allows node_modules resolution
            resolve({ extensions, preferBuiltins: true, mainFields: ['jsnext', 'module', 'main'] }),
            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs({
                include: 'node_modules/**',
            }),
            json(),
            // Compile TypeScript/JavaScript files
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        module: 'ESNext',
                    },
                },
            }),
            babel({ extensions, include: ['src/**/*'] }),
        ],
    },
    {
        input: './dist/src/index.d.ts',
        output: [{ file: 'dist/index.d.ts', format: 'es' }],
        plugins: [dts()],
    },
]
