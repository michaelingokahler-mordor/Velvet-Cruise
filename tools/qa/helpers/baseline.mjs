import { execFileSync } from 'node:child_process';
import { posix, resolve } from 'node:path';
import { build } from 'esbuild';

/** Read a committed source tree without checking out or changing player files. */
export async function buildBaseline(ref, contents, outfile) {
  const files = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { encoding: 'utf8' }).trim().split('\n'));
  await build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', outfile: resolve(outfile),
    define: { __DEMO__: 'false', 'import.meta.env.VITE_LOCAL_SERVICES': '"false"' },
    plugins: [{ name: 'committed-baseline', setup(api) {
      api.onResolve({ filter: /^\./ }, args => {
        const root = args.namespace === 'baseline' ? posix.dirname(args.importer) : '';
        const candidate = posix.normalize(posix.join(root, args.path));
        const path = [candidate, candidate + '.ts', candidate + '.json'].find(name => files.has(name));
        if (!path) throw new Error(`Missing baseline source: ${ref}:${candidate}`);
        return { path, namespace: 'baseline' };
      });
      api.onLoad({ filter: /.*/, namespace: 'baseline' }, args => ({
        contents: execFileSync('git', ['show', `${ref}:${args.path}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }),
        loader: args.path.endsWith('.json') ? 'json' : 'ts',
      }));
    } }],
  });
}
