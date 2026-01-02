type EventItem = { title: string; year: number; url?: string; thumbnail?: string };
type LoadError = { message: string; status?: number; statusText?: string; url?: string };
type ScoreEntry = {
  score: number;
  elapsedMs: number;
  correct: number;
  attempts: number;
  bestStreak: number;
  finishedAt: string;
};

export type { EventItem, LoadError, ScoreEntry };
