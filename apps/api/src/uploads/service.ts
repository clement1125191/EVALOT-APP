import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import type { StudentScript, UploadedDocument } from '@evalot/contracts';
import { studentReferenceInput } from '@evalot/contracts';
import { ApiError } from '../assessments.js';
import { transaction, type Database, type Store } from '../db.js';
import { PrivateStorage, checksum } from './storage.js';
import { validateFile } from './validation.js';

type Kind = 'script' | 'document';
const columns = `id,assessment_id AS "assessmentId",original_name AS "originalName",mime_type AS "mimeType",byte_size AS "byteSize",page_count AS "pageCount",sha256,created_at AS "createdAt"`;
export class Uploads {
  constructor(private db: Store, private storage: PrivateStorage) {}
  async authorize(owner: string, assessmentId: string, kind?: Kind, db: Database = this.db, lock = false) {
    const row = (await db.query(`SELECT status FROM assessments WHERE id=$1 AND teacher_id=$2${lock ? ' FOR UPDATE' : ''}`, [assessmentId,owner])).rows[0];
    if (!row) throw new ApiError(404, 'Assessment not found.');
    if (kind === 'script' && row.status !== 'READY') throw new ApiError(409, 'Complete the marking guide before uploading student scripts.');
    if (kind === 'document' && row.status !== 'DRAFT') throw new ApiError(409, 'Assessment reference uploads are only available during draft setup.');
  }
  async scripts(owner: string, assessmentId: string): Promise<StudentScript[]> {
    await this.authorize(owner, assessmentId);
    return (await this.db.query(`SELECT ${columns},student_reference AS "studentReference",status FROM scripts WHERE assessment_id=$1 ORDER BY created_at,id`, [assessmentId])).rows;
  }
  async document(owner: string, assessmentId: string): Promise<UploadedDocument | null> {
    await this.authorize(owner, assessmentId);
    return (await this.db.query(`SELECT ${columns} FROM assessment_documents WHERE assessment_id=$1`, [assessmentId])).rows[0] ?? null;
  }
  async upload(owner: string, assessmentId: string, kind: Kind, file: {buffer:Buffer;originalname:string}, studentReference?: string) {
    await this.authorize(owner, assessmentId, kind);
    const reference = kind === 'script' ? studentReferenceInput.parse(studentReference) : undefined;
    const format = await validateFile(file.buffer);
    const id = randomUUID(); const key = `${id}.${format.extension}`; const sha256 = checksum(file.buffer);
    const suppliedName = basename(file.originalname.replaceAll('\\','/')).replace(/[\x00-\x1f\x7f]/g,'');
    const stem = basename(suppliedName,extname(suppliedName)).slice(0,180) || 'scan';
    const originalName = `${stem}.${format.extension}`;
    await this.storage.put(key, file.buffer);
    try {
      return await transaction(this.db, async db => {
        await this.authorize(owner, assessmentId, kind, db, true);
        const values = [id,assessmentId,key,sha256,format.mimeType,originalName,file.buffer.length,format.pageCount];
        let row;
        if (kind === 'script') {
          row = (await db.query(`INSERT INTO scripts(id,assessment_id,storage_key,sha256,mime_type,original_name,byte_size,page_count,student_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${columns},student_reference AS "studentReference",status`, [...values,reference])).rows[0];
        } else {
          row = (await db.query(`INSERT INTO assessment_documents(id,assessment_id,storage_key,sha256,mime_type,original_name,byte_size,page_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${columns}`, values)).rows[0];
        }
        await db.query('INSERT INTO audit_events(id,assessment_id,teacher_id,action,payload) VALUES($1,$2,$3,$4,$5)', [randomUUID(),assessmentId,owner,kind === 'script' ? 'SCRIPT_UPLOADED' : 'ASSESSMENT_DOCUMENT_UPLOADED',JSON.stringify({id,studentReference:reference,originalName,sha256,pageCount:format.pageCount,byteSize:file.buffer.length})]);
        return row as StudentScript | UploadedDocument;
      });
    } catch (error: any) {
      // If COMMIT's result was ambiguous, never remove a file referenced by a committed row.
      const table = kind === 'script' ? 'scripts' : 'assessment_documents';
      try { if (!(await this.db.query(`SELECT id FROM ${table} WHERE id=$1`, [id])).rows.length) await this.storage.remove(key); }
      catch { console.error('Upload cleanup deferred', {id}); }
      if (error.code === '23505') throw new ApiError(409, kind === 'script' ? 'This student reference or scanned file is already uploaded for this assessment.' : 'An assessment reference is already uploaded.');
      throw error;
    }
  }
  async original(owner: string, assessmentId: string, kind: Kind, id?: string) {
    await this.authorize(owner, assessmentId);
    const row = kind === 'script'
      ? (await this.db.query('SELECT storage_key,sha256,mime_type,original_name FROM scripts WHERE assessment_id=$1 AND id=$2', [assessmentId,id])).rows[0]
      : (await this.db.query('SELECT storage_key,sha256,mime_type,original_name FROM assessment_documents WHERE assessment_id=$1', [assessmentId])).rows[0];
    if (!row) throw new ApiError(404, 'Original file not found.');
    return {bytes:await this.storage.get(row.storage_key,row.sha256),mimeType:row.mime_type as string,originalName:row.original_name as string};
  }
}
