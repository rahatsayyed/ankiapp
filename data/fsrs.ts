import { createEmptyCard, fsrs, generatorParameters, Rating, State, Card, ReviewLog, RecordLog } from 'ts-fsrs';

export { Rating, State, Card, ReviewLog, RecordLog };

const params = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
});

const f = fsrs(params);

export interface DBCard {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  created_at: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

export const convertDBCardToFSRS = (dbCard: DBCard): Card => {
  const card = createEmptyCard(new Date(dbCard.due));
  card.due = new Date(dbCard.due);
  card.stability = dbCard.stability;
  card.difficulty = dbCard.difficulty;
  card.elapsed_days = dbCard.elapsed_days;
  card.scheduled_days = dbCard.scheduled_days;
  card.reps = dbCard.reps;
  card.lapses = dbCard.lapses;
  card.state = dbCard.state as State;
  card.last_review = dbCard.last_review ? new Date(dbCard.last_review) : undefined;
  return card;
};

export const convertFSRSCardToDB = (card: Card): Partial<DBCard> => {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
};

export const createInitialCard = (now: Date = new Date()): Card => {
  return createEmptyCard(now);
};

export const reviewCard = (card: Card, now: Date = new Date()): RecordLog => {
  return f.repeat(card, now);
};

export const reviewCardWithRating = (
  card: Card,
  rating: Rating,
  now: Date = new Date()
): { card: Card; log: ReviewLog } => {
  const recordLog = f.repeat(card, now);
  const ratingKey = rating.toString() as '1' | '2' | '3' | '4';
  return recordLog[ratingKey];
};

export type DifficultyBand = 'Very Hard' | 'Hard' | 'Medium' | 'Easy' | 'Any';

export const computeCardDifficultyBand = (card: Card, now: Date = new Date()): DifficultyBand => {
  const dueDate = new Date(card.due);
  const msUntilDue = dueDate.getTime() - now.getTime();
  const daysUntilDue = msUntilDue / (1000 * 60 * 60 * 24);
  const isOverdue = daysUntilDue < 0;
  const daysOverdue = Math.abs(daysUntilDue);

  if (card.stability < 3 || (isOverdue && daysOverdue > 5)) {
    return 'Very Hard';
  }

  if (card.stability < 7 || isOverdue) {
    return 'Hard';
  }

  if (card.stability >= 7 && card.stability <= 30 && daysUntilDue <= 7) {
    return 'Medium';
  }

  if (card.stability > 30 && daysUntilDue > 7) {
    return 'Easy';
  }

  return 'Medium';
};
