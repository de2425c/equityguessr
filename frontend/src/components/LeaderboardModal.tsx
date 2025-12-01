import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getTopScores, addScore, LeaderboardEntry } from '../services/LeaderboardService';

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  score: number;
}

export function LeaderboardModal({ open, onClose, score }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    if (open) {
      setSubmitted(false);
      setName('');
      setError(null);
      fetchLeaderboard();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await addScore(name.trim(), score);
      setSubmitted(true);
      await fetchLeaderboard();
    } catch (err) {
      console.error('Failed to submit score:', err);
      setError('Failed to submit score');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md border-2 border-black">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-center">
            You Made the Leaderboard!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Your streak of <span className="font-bold text-black">{score}</span> earned you a spot!
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        {/* Name Input Form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Enter your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 10))}
                placeholder="Your name"
                maxLength={10}
                className="w-full px-4 py-3 border-2 border-black rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-black"
                disabled={submitting}
                autoFocus
              />
              <div className="text-xs text-gray-500 text-right">
                {name.length}/10 characters
              </div>
            </div>
            <Button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Score'}
            </Button>
          </form>
        ) : (
          <div className="text-center py-2">
            <Badge className="bg-green-500 text-white text-lg px-4 py-2">
              Score Submitted!
            </Badge>
          </div>
        )}

        {/* Leaderboard Display */}
        <div className="mt-4">
          <h3 className="text-lg font-bold mb-3 text-center">Top 10</h3>
          {loading ? (
            <div className="text-center text-gray-500 py-4">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No scores yet</div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
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
        </div>

        {/* Close Button */}
        {submitted && (
          <Button
            onClick={onClose}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 text-lg mt-2"
          >
            Continue
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
