import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// public/data of the project this file runs in. The file runs from src/utils/
// (dev, tests) and from the server build, where its depth depends on how the
// build splits its files: so the folder is looked for, upward, not counted to.
function findDataDir(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, "public/data");
    if (existsSync(join(candidate, "manifest.json"))) return candidate;
    if (dirname(dir) === dir) break;
  }
  throw new Error(`public/data not found above ${from}`);
}

const DATA_DIR = findDataDir(dirname(fileURLToPath(import.meta.url)));

function readJSON(relativePath) {
  return JSON.parse(readFileSync(join(DATA_DIR, relativePath), "utf-8"));
}

// Cache loaded JSON in memory (avoid re-reading files on every call)
const _cache = new Map();
function cached(key, fn) {
  if (!_cache.has(key)) _cache.set(key, fn());
  return _cache.get(key);
}

export function getPlatforms() {
  return Promise.resolve(cached("platforms", () => readJSON("platforms.json")));
}

export function getCategories() {
  return Promise.resolve(cached("categories", () => readJSON("categories.json")));
}

export function getManifest() {
  return Promise.resolve(cached("manifest", () => readJSON("manifest.json")));
}

export function getPlatformApps(platformId) {
  return Promise.resolve(
    cached(`apps:${platformId}`, () => {
      const data = readJSON(`platforms/${platformId}.json`);
      return data.apps;
    })
  );
}

export async function getAppBySlug(platformId, slug) {
  const apps = await getPlatformApps(platformId);
  return apps.find((a) => a.slug === slug) || null;
}

export async function getOtherPlatforms(slug, currentPlatformId) {
  const data = cached(`platformData:${currentPlatformId}`, () =>
    readJSON(`platforms/${currentPlatformId}.json`)
  );
  return data.otherPlatforms[slug] || [];
}

export function getOtherPlatformsMap(platformId) {
  return Promise.resolve(
    cached(`otherPlatformsMap:${platformId}`, () => {
      const data = readJSON(`platforms/${platformId}.json`);
      return data.otherPlatforms || {};
    })
  );
}
