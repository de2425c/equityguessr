import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { getTopScores, addScore, isScoreEligible, LeaderboardEntry } from '../services/LeaderboardService';

interface LeaderboardProps {
  currentScore?: number;
  onScoreSubmitted?: () => void;
  showSubmitForm?: boolean;
  compact?: boolean;
}

export function Leaderboard({ currentScore, onScoreSubmitted, showSubmitForm = false, compact = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const scores = await getTopScores();
      setEntries(scores);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (showSubmitForm && currentScore !== undefined && currentScore > 0) {
      isScoreEligible(currentScore).then(setEligible).catch(() => setEligible(false));
    }
  }, [showSubmitForm, currentScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || currentScore === undefined || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await addScore(name.trim(), currentScore);
      setSubmitted(true);
      await fetchLeaderboard();
      onScoreSubmitted?.();
    } catch (err) {
      console.error('Failed to submit score:', err);
      setError('Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    const content = (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );

    if (compact) return content;

    return (
      <Card className="border-2 border-black">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold text-center">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  const content = (
    <>
      {error && (
        <div className="text-red-500 text-sm text-center mb-3">{error}</div>
      )}

      {/* Submit Form */}
      {showSubmitForm && eligible && !submitted && currentScore !== undefined && currentScore > 0 && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <div className="text-center mb-2">
            <Badge className="bg-yellow-500 text-black">
              You made the top 10!
            </Badge>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 10))}
              placeholder="Your name"
              maxLength={10}
              className="flex-1 px-3 py-2 border-2 border-black rounded text-sm font-medium"
              disabled={submitting}
              autoFocus
            />
            <Button
              type="submit"
              disabled={!name.trim() || submitting}
              className="bg-black hover:bg-gray-800 text-white font-bold"
            >
              {submitting ? '...' : 'Submit'}
            </Button>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            {name.length}/10 characters
          </div>
        </form>
      )}

      {submitted && (
        <div className="mb-4 p-3 bg-green-50 border-2 border-green-400 rounded-lg text-center">
          <span className="text-green-700 font-bold">Score submitted!</span>
        </div>
      )}

      {/* Leaderboard Table */}
      {entries.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No scores yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between px-3 py-2 rounded ${
                index === 0 ? 'bg-yellow-100 border border-yellow-400' :
                index === 1 ? 'bg-gray-100 border border-gray-300' :
                index === 2 ? 'bg-orange-50 border border-orange-300' :
                'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg w-6 text-center ${
                  index === 0 ? 'text-yellow-600' :
                  index === 1 ? 'text-gray-500' :
                  index === 2 ? 'text-orange-500' :
                  'text-gray-400'
                }`}>
                  {index + 1}
                </span>
                <span className="font-medium truncate max-w-[120px]">
                  {entry.name}
                </span>
              </div>
              <Badge
                variant={index < 3 ? 'default' : 'outline'}
                className={
                  index === 0 ? 'bg-yellow-500 hover:bg-yellow-600' :
                  index === 1 ? 'bg-gray-400 hover:bg-gray-500' :
                  index === 2 ? 'bg-orange-400 hover:bg-orange-500' :
                  ''
                }
              >
                {entry.score}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (compact) return content;

  return (
    <Card className="border-2 border-black">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-center">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
