import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { ApiError } from '../assessments.js';

export function checksum(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
export class PrivateStorage {
  private root: string;
  constructor(root: string) { this.root = resolve(root); }
  private path(key: string) {
    if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(key)) throw new ApiError(500, 'Invalid stored file reference.');
    const path = resolve(this.root, key);
    if (dirname(path) !== this.root) throw new ApiError(500, 'Invalid stored file reference.');
    return path;
  }
  async put(key: string, bytes: Buffer) {
    await mkdir(this.root, {recursive:true});
    await writeFile(this.path(key), bytes, {flag:'wx',mode:0o600});
  }
  async get(key: string, sha256: string) {
    let bytes: Buffer;
    try { bytes = await readFile(this.path(key)); }
    catch (error: any) { if (error.code === 'ENOENT') throw new ApiError(410, 'The original file is unavailable. Restore it from backup.'); throw error; }
    if (checksum(bytes) !== sha256) throw new ApiError(409, 'The original file failed its integrity check.');
    return bytes;
  }
  async remove(key: string) { await unlink(this.path(key)); }
}
