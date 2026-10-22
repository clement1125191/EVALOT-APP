import { randomUUID } from 'node:crypto';
import { readinessProblems, type Assessment, type AssessmentInput, type AssessmentDetail, type QuestionInput } from '@evalot/contracts';
import { transaction, type Store, type Database } from './db.js';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const columns = `(SELECT count(*)::int FROM questions WHERE questions.assessment_id=assessments.id) AS "questionCount",id, kind, title, subject, class_name AS "className", total_marks AS "totalMarks", status, revision, created_at AS "createdAt"`;
const qColumns = `id, position, type, prompt, max_marks AS "maxMarks", options, expected_answer AS "expectedAnswer", rubric`;
export class Assessments {
  constructor(private db: Store) {}
  async list(owner: string): Promise<Assessment[]> { return (await this.db.query(`SELECT ${columns} FROM assessments WHERE teacher_id=$1 ORDER BY created_at DESC`, [owner])).rows; }
  async detail(owner: string, id: string, db: Database = this.db, lock = false): Promise<AssessmentDetail> {
    const a = (await db.query(`SELECT ${columns} FROM assessments WHERE teacher_id=$1 AND id=$2${lock ? ' FOR UPDATE' : ''}`, [owner, id])).rows[0];
    if (!a) throw new ApiError(404, 'Assessment not found.');
    const questions = (await db.query(`SELECT ${qColumns} FROM questions WHERE assessment_id=$1 ORDER BY position`, [id])).rows;
    return {...a, questions};
  }
  private async audit(db: Database, owner: string, id: string, action: string, payload: unknown) {
    await db.query('INSERT INTO audit_events(id,assessment_id,teacher_id,action,payload) VALUES($1,$2,$3,$4,$5)', [randomUUID(), id, owner, action, JSON.stringify(payload)]);
  }
  async create(owner: string, input: AssessmentInput) {
    return transaction(this.db, async db => {
      const id = randomUUID();
      await db.query('INSERT INTO assessments(id,teacher_id,title,subject,class_name,total_marks,kind) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, owner, input.title, input.subject, input.className, input.totalMarks,input.kind??'ASSESSMENT']);
      await this.audit(db, owner, id, 'ASSESSMENT_CREATED', input);
      return this.detail(owner, id, db);
    });
  }
  async saveQuestions(owner: string, id: string, revision: number, questions: QuestionInput[]) {
    return transaction(this.db, async db => {
      const a = await this.detail(owner, id, db, true);
      this.assertEditable(a, revision);
      if (questions.reduce((s, q) => s + q.maxMarks, 0) > a.totalMarks) throw new ApiError(422, 'Question marks exceed the assessment total.');
      await db.query('DELETE FROM questions WHERE assessment_id=$1', [id]);
      for (const q of questions) await db.query('INSERT INTO questions(id,assessment_id,position,type,prompt,max_marks,options,expected_answer,rubric) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [randomUUID(), id, q.position, q.type, q.prompt, q.maxMarks, JSON.stringify(q.options), q.expectedAnswer, JSON.stringify(q.rubric)]);
      await db.query('UPDATE assessments SET revision=revision+1 WHERE id=$1', [id]);
      await this.audit(db, owner, id, 'QUESTIONS_REPLACED', {before: a.questions, after: questions, revision: revision + 1});
      return this.detail(owner, id, db);
    });
  }
  async ready(owner: string, id: string, revision: number) {
    return transaction(this.db, async db => {
      const a = await this.detail(owner, id, db, true); this.assertEditable(a, revision);
      const problems = readinessProblems(a, a.questions);
      if (problems.length) throw new ApiError(422, problems.join(' '));
      await db.query("UPDATE assessments SET status='READY',revision=revision+1 WHERE id=$1", [id]);
      await this.audit(db, owner, id, 'ASSESSMENT_READY', {revision: revision + 1});
      return this.detail(owner, id, db);
    });
  }
  private assertEditable(a: Assessment, revision: number) {
    if (a.revision !== revision) throw new ApiError(409, 'This assessment changed. Reload before saving.');
    if (a.status !== 'DRAFT') throw new ApiError(409, 'The marking guide is locked after setup is completed.');
  }
  async history(owner: string, id: string) {
    await this.detail(owner, id);
    return (await this.db.query('SELECT id,action,payload,created_at AS "createdAt" FROM audit_events WHERE assessment_id=$1 ORDER BY created_at,id', [id])).rows;
  }
}
