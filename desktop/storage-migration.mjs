import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { tableKeys } from './leveldb-keys.mjs';
import { spawnSync } from 'node:child_process';

export const gameKey = key => typeof key === 'string' && (key === 'sunset-coast-run' || key.startsWith('sunset-coast-run.'));

export function mergeStorage(storage, entries) {
  let copied = 0, preserved = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (!gameKey(key) || typeof value !== 'string') continue;
    if (storage.getItem(key) !== null) { preserved++; continue; }
    storage.setItem(key, value); copied++;
  }
  return { copied, preserved };
}

// Only inspect bounded local-storage databases. Never parse or report save values.
// The origin is found by its exact game host, independent of the previous publisher.
export function discoverProfiles({ roots, gameId, exclude }) {
  const found = [], visited = new Set();
  const needle='://'+gameId;
  function collectOrigins(text, origins) {
    // Search the exact identity first. A greedy scheme regex over arbitrary
    // stored values can otherwise take quadratic time on long plain text.
    let at=0;
    while((at=text.indexOf(needle,at))!==-1) {
      const end=at+needle.length;
      if(!/[a-z0-9-]/i.test(text[end] || '')) {
        let start=at;
        while(start>0 && /[a-z0-9+.-]/i.test(text[start-1]))start--;
        const protocol=text.slice(start,at);
        if(/^[a-z][a-z0-9+.-]*$/.test(protocol))origins.add(protocol+needle);
      }
      at=end;
    }
  }
  const excluded = exclude ? path.resolve(exclude).toLowerCase() : '';
  function walk(dir, depth) {
    const absolute = path.resolve(dir).toLowerCase();
    if (visited.has(absolute) || (excluded && (absolute === excluded || absolute.startsWith(excluded + path.sep)))) return;
    visited.add(absolute);
    let children; try { children = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const db = path.join(dir, 'Local Storage', 'leveldb');
    if (fs.existsSync(db)) {
      const origins = new Set(); let ownsGame = false, remaining = 128 * 1024 * 1024;
      try {
        for (const name of fs.readdirSync(db)) {
          if (!/\.(?:ldb|log|sst)$/.test(name)) continue;
          const file = path.join(db, name), size = fs.statSync(file).size;
          if (size > 64 * 1024 * 1024 || size > remaining) continue;
          remaining -= size;
          const bytes = fs.readFileSync(file);
          let text = bytes.toString('latin1');
          if (/\.(?:ldb|sst)$/.test(name)) {
            try { text = tableKeys(bytes).map(key=>key.toString('latin1')).join('\n'); } catch { continue; }
          }
          if (text.includes('sunset-coast-run')) ownsGame = true;
          collectOrigins(text,origins);
        }
      } catch { return; }
      const modified = Math.max(...fs.readdirSync(db).map(name=>{try{return fs.statSync(path.join(db,name)).mtimeMs;}catch{return 0;}}));
      if (ownsGame) for (const origin of origins) found.push({ profile: dir, origin, modified, id: createHash('sha256').update(path.resolve(dir).toLowerCase() + '\0' + origin).digest('hex') });
    }
    if (depth > 0) for (const child of children) if (child.isDirectory() && !child.isSymbolicLink() && !['Cache', 'Code Cache', 'GPUCache', 'Local Storage', 'node_modules'].includes(child.name)) walk(path.join(dir, child.name), depth - 1);
  }
  for (const root of roots) walk(root, 4);
  return found.sort((a,b)=>b.modified-a.modified || a.profile.localeCompare(b.profile));
}

export function snapshotProfile(source, target) {
  const db = path.join(source, 'Local Storage', 'leveldb');
  if(process.platform!=='win32')throw new Error('Exclusive profile snapshot is unavailable on this system.');
  // Chromium's byte-range lock does not prevent CopyFile. Hold an exclusive
  // read handle instead, across the entire copy, so a running source is
  // rejected and another source process cannot start midway through copying.
  // Fixed code receives paths via environment variables, never shell text.
  const script = `$ErrorActionPreference='Stop'; $lease=$null; try {
    $lease=[IO.File]::Open([IO.Path]::Combine($env:VELVET_SNAPSHOT_SOURCE,'LOCK'),[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None);
    [IO.Directory]::CreateDirectory($env:VELVET_SNAPSHOT_DESTINATION) | Out-Null;
    Get-ChildItem -LiteralPath $env:VELVET_SNAPSHOT_SOURCE -File | Where-Object { $_.Name -ne 'LOCK' } | ForEach-Object { [IO.File]::Copy($_.FullName,[IO.Path]::Combine($env:VELVET_SNAPSHOT_DESTINATION,$_.Name),$false) };
    [IO.File]::WriteAllBytes([IO.Path]::Combine($env:VELVET_SNAPSHOT_DESTINATION,'LOCK'),[byte[]]@());
    exit 0;
  } catch { exit 1 } finally { if($lease){$lease.Dispose()} }`;
  const result=spawnSync(path.join(process.env.SystemRoot || 'C:/Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{
    env:{...process.env,VELVET_SNAPSHOT_SOURCE:db,VELVET_SNAPSHOT_DESTINATION:path.join(target,'Local Storage','leveldb')},
    stdio:'ignore',windowsHide:true,timeout:15000,
  });
  if(result.status!==0)throw new Error('Previous profile is active or unavailable.');
}
