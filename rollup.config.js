import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only';
import babel from 'rollup-plugin-babel';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true,
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    },
  };
}

export default [
  {
    input: 'src/main.ts',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    context: 'window',
    plugins: [
      svelte({
        preprocess: sveltePreprocess({
          sourceMap: !production,
          typescript: {
            compilerOptions: {
              target: 'ES2015',
              module: 'ES2015',
            },
          },
          replace: [[/process\.env\.(\w+)/g, (_, prop) => JSON.stringify(process.env[prop])]],
        }),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      babel({
        extensions: ['.js', '.ts', '.mjs', '.html', '.svelte'],
        runtimeHelpers: true,
        exclude: ['node_modules/@babel/**'],
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { firefox: '48' },
              exclude: [
                '@babel/plugin-transform-regenerator'
              ]
            },
          ],
        ],
        plugins: [
          '@babel/plugin-syntax-dynamic-import',
          [
            '@babel/plugin-transform-runtime',
            {
              "regenerator": false,
              useESModules: true,
            },
          ],
        ],
      }),

      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': !production ? "'development'" : "'production'",
      }),

      json(),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ['svelte'],
        preferBuiltins: false,
      }),
      commonjs(),
      nodePolyfills({
        include: [
          'events'
        ]
      }),
      typescript({
        sourceMap: !production,
        inlineSources: !production,
      }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  },
  {
    input: 'src/idb-worker/index.ts',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'app',
      file: 'public/build/idb-worker.js'
    },
    context: 'self',
    plugins: [
      svelte({
        preprocess: sveltePreprocess({
          sourceMap: !production,
          typescript: {
            compilerOptions: {
              target: 'ES2015',
              module: 'ES2015',
            },
          },
          replace: [[/process\.env\.(\w+)/g, (_, prop) => JSON.stringify(process.env[prop])]],
        }),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      babel({
        extensions: ['.js', '.ts', '.mjs', '.html', '.svelte'],
        runtimeHelpers: true,
        exclude: ['node_modules/@babel/**'],
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { firefox: '48' },
              exclude: [
                '@babel/plugin-transform-regenerator'
              ]
            },
          ],
        ],
        plugins: [
          '@babel/plugin-syntax-dynamic-import',
          [
            '@babel/plugin-transform-runtime',
            {
              "regenerator": false,
              useESModules: true,
            },
          ],
        ],
      }),

      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': !production ? "'development'" : "'production'",
      }),

      json(),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
        inlineSources: !production,
      }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && (function(){})(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  }
];
