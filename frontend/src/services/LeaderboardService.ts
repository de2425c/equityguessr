import { db } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  createdAt: Timestamp | null;
}

const LEADERBOARD_COLLECTION = 'leaderboard';
const MAX_LEADERBOARD_SIZE = 10;

export async function getTopScores(): Promise<LeaderboardEntry[]> {
  const q = query(
    collection(db, LEADERBOARD_COLLECTION),
    orderBy('score', 'desc'),
    limit(MAX_LEADERBOARD_SIZE)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as LeaderboardEntry));
}

export async function addScore(name: string, score: number): Promise<void> {
  // Validate name (max 10 chars, non-empty)
  const trimmedName = name.trim().slice(0, 10);
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  await addDoc(collection(db, LEADERBOARD_COLLECTION), {
    name: trimmedName,
    score,
    createdAt: serverTimestamp()
  });
}

export async function isScoreEligible(score: number): Promise<boolean> {
  if (score <= 0) return false;

  const topScores = await getTopScores();

  // If less than 10 entries, any positive score qualifies
  if (topScores.length < MAX_LEADERBOARD_SIZE) {
    return true;
  }

  // Check if score beats the lowest on the leaderboard
  const lowestScore = topScores[topScores.length - 1]?.score ?? 0;
  return score > lowestScore;
}
