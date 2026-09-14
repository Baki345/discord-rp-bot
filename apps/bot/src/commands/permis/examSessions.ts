/**
 * In-memory exam progress — a license exam is a single short-lived,
 * sequential button flow (a handful of questions, answered within
 * minutes), not data anyone needs to query later, so it doesn't need a DB
 * table. Keyed by "guildId:discordUserId" — one exam in flight at a time
 * per member.
 */
export interface ExamQuestion {
  id: string;
  question: string;
  choices: string[];
}

export interface ExamSession {
  licenseId: string;
  licenseName: string;
  characterId: string;
  questions: ExamQuestion[];
  answers: number[];
  currentIndex: number;
}

const sessions = new Map<string, ExamSession>();

export function sessionKey(guildId: string, discordUserId: string): string {
  return `${guildId}:${discordUserId}`;
}

export function startExamSession(key: string, session: ExamSession): void {
  sessions.set(key, session);
}

export function getExamSession(key: string): ExamSession | undefined {
  return sessions.get(key);
}

export function endExamSession(key: string): void {
  sessions.delete(key);
}
