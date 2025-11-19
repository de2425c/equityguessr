import React, { useState, useEffect } from 'react';
import { PlayingCard } from './components/PlayingCard';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { scenarios, type Scenario, type Card as CardType } from './lib/scenarios';
import { cn } from './lib/utils';

interface EquityResult {
  equities: number[];
  wins: number[];
  ties: number[];
  hands_evaluated: number;
  speed: number;
  enumerated_all: boolean;
}

type GameState = 'playing' | 'correct' | 'incorrect';

function App() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const currentScenario = scenarios[currentScenarioIndex];

  const calculateEquity = async (scenario: Scenario) => {
    setLoading(true);
    try {
      const hand1Code = scenario.hand1.map(c => c.code).join('');
      const hand2Code = scenario.hand2.map(c => c.code).join('');
      const boardCode = scenario.community.map(c => c.code).join('');

      const response = await fetch('http://localhost:8080/equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hands: [hand1Code, hand2Code],
          board: boardCode || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate equity');
      }

      const data = await response.json();
      setEquityResult(data);
    } catch (err) {
      console.error('Error calculating equity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateEquity(currentScenario);
  }, [currentScenarioIndex]);

  const handleHandClick = (handNumber: 1 | 2) => {
    if (gameState !== 'playing' || !equityResult) return;

    const hand1Equity = equityResult.equities[0];
    const hand2Equity = equityResult.equities[1];

    const isCorrect =
      (handNumber === 1 && hand1Equity > hand2Equity) ||
      (handNumber === 2 && hand2Equity > hand1Equity);

    setGameState(isCorrect ? 'correct' : 'incorrect');
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const handleNextHand = () => {
    setGameState('playing');
    setCurrentScenarioIndex((prev) => (prev + 1) % scenarios.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            EquityGuessr
          </h1>
          <div className="flex justify-center gap-8 text-lg">
            <div className="text-slate-600">
              Score: <span className="font-bold text-slate-900">{score.correct}/{score.total}</span>
            </div>
            <div className="text-slate-600">
              Accuracy: <span className="font-bold text-slate-900">
                {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Community Cards */}
        {currentScenario.community.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">
              Community Cards
            </h2>
            <div className="flex justify-center gap-3">
              {currentScenario.community.map((card, idx) => (
                <PlayingCard
                  key={idx}
                  rank={card.rank}
                  suit={card.suit}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {/* Hands */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Hand 1 */}
          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:scale-105',
              gameState === 'playing' && 'hover:shadow-xl hover:border-blue-400',
              gameState === 'correct' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'border-green-500 border-4 shadow-xl',
              gameState === 'incorrect' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'border-green-500 border-4 shadow-xl',
              gameState === 'incorrect' && equityResult && equityResult.equities[0] < equityResult.equities[1] && 'opacity-50'
            )}
            onClick={() => handleHandClick(1)}
          >
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-center mb-6 text-slate-800">
                Hand 1
              </h3>
              <div className="flex justify-center gap-4">
                {currentScenario.hand1.map((card, idx) => (
                  <PlayingCard
                    key={idx}
                    rank={card.rank}
                    suit={card.suit}
                    size="lg"
                  />
                ))}
              </div>
              {gameState !== 'playing' && equityResult && (
                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold text-slate-900">
                    {(equityResult.equities[0] * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600">equity</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hand 2 */}
          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:scale-105',
              gameState === 'playing' && 'hover:shadow-xl hover:border-blue-400',
              gameState === 'correct' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'border-green-500 border-4 shadow-xl',
              gameState === 'incorrect' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'border-green-500 border-4 shadow-xl',
              gameState === 'incorrect' && equityResult && equityResult.equities[1] < equityResult.equities[0] && 'opacity-50'
            )}
            onClick={() => handleHandClick(2)}
          >
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-center mb-6 text-slate-800">
                Hand 2
              </h3>
              <div className="flex justify-center gap-4">
                {currentScenario.hand2.map((card, idx) => (
                  <PlayingCard
                    key={idx}
                    rank={card.rank}
                    suit={card.suit}
                    size="lg"
                  />
                ))}
              </div>
              {gameState !== 'playing' && equityResult && (
                <div className="mt-6 text-center">
                  <div className="text-3xl font-bold text-slate-900">
                    {(equityResult.equities[1] * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600">equity</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions/Feedback */}
        <div className="text-center mb-8">
          {gameState === 'playing' && (
            <p className="text-2xl text-slate-700 font-medium">
              Click on the hand you think has more equity
            </p>
          )}
          {gameState === 'correct' && (
            <div className="space-y-4">
              <p className="text-3xl text-green-600 font-bold animate-bounce">
                ✓ Correct!
              </p>
              <Button onClick={handleNextHand} size="lg" className="text-lg px-8">
                Next Hand →
              </Button>
            </div>
          )}
          {gameState === 'incorrect' && (
            <div className="space-y-4">
              <p className="text-3xl text-red-600 font-bold">
                ✗ Incorrect
              </p>
              <p className="text-lg text-slate-600">
                {currentScenario.description}
              </p>
              <Button onClick={handleNextHand} size="lg" className="text-lg px-8">
                Next Hand →
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center text-slate-600">
            <p>Calculating equity...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
