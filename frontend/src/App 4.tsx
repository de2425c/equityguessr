import React, { useState, useEffect } from 'react';
import { PlayingCardSVG as PlayingCard } from './components/PlayingCardSVG';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50 py-4 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Info Bar Header */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-6 py-4 mb-4">
          <div className="grid grid-cols-3 items-center gap-4">
            {/* Left: Title */}
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                EquityGuessr
              </h1>
            </div>

            {/* Center: Community Cards */}
            <div className="flex flex-col items-center">
              {currentScenario.community.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">BOARD</div>
                  <div className="flex justify-center gap-2">
                    {currentScenario.community.map((card, idx) => (
                      <PlayingCard
                        key={idx}
                        rank={card.rank}
                        suit={card.suit}
                        size="md"
                      />
                    ))}
                  </div>
                </>
              )}
              {currentScenario.community.length === 0 && (
                <div className="text-sm text-slate-400 font-medium">Pre-Flop</div>
              )}
            </div>

            {/* Right: Score */}
            <div className="text-right">
              <div className="text-sm text-slate-500 font-medium">Score</div>
              <div className="text-2xl font-bold text-slate-900">{score.correct}/{score.total}</div>
            </div>
          </div>
        </div>

        {/* Hands */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Hand 1 */}
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-md h-full',
              gameState === 'playing' && 'hover:shadow-xl hover:border-emerald-400',
              gameState === 'correct' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'border-emerald-500 border-[3px] shadow-xl ring-2 ring-emerald-200',
              gameState === 'incorrect' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'border-emerald-500 border-[3px] shadow-xl ring-2 ring-emerald-200',
              gameState === 'incorrect' && equityResult && equityResult.equities[0] < equityResult.equities[1] && 'opacity-60'
            )}
            onClick={() => handleHandClick(1)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="flex items-center justify-between w-full mb-4">
                <h3 className="text-lg font-bold text-slate-700">
                  Hand 1
                </h3>
                {gameState !== 'playing' && equityResult && (
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-600">
                      {(equityResult.equities[0] * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3 flex-1 items-center">
                {currentScenario.hand1.map((card, idx) => (
                  <PlayingCard
                    key={idx}
                    rank={card.rank}
                    suit={card.suit}
                    size="lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hand 2 */}
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-md h-full',
              gameState === 'playing' && 'hover:shadow-xl hover:border-emerald-400',
              gameState === 'correct' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'border-emerald-500 border-[3px] shadow-xl ring-2 ring-emerald-200',
              gameState === 'incorrect' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'border-emerald-500 border-[3px] shadow-xl ring-2 ring-emerald-200',
              gameState === 'incorrect' && equityResult && equityResult.equities[1] < equityResult.equities[0] && 'opacity-60'
            )}
            onClick={() => handleHandClick(2)}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="flex items-center justify-between w-full mb-4">
                <h3 className="text-lg font-bold text-slate-700">
                  Hand 2
                </h3>
                {gameState !== 'playing' && equityResult && (
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-600">
                      {(equityResult.equities[1] * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3 flex-1 items-center">
                {currentScenario.hand2.map((card, idx) => (
                  <PlayingCard
                    key={idx}
                    rank={card.rank}
                    suit={card.suit}
                    size="lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions/Feedback */}
        <div className="text-center">
          {gameState === 'playing' && (
            <p className="text-sm text-slate-600 font-medium bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-200 inline-block">
              👆 Click on the hand you think has more equity
            </p>
          )}
          {gameState === 'correct' && (
            <div className="space-y-2 bg-emerald-50 py-3 px-4 rounded-xl border-2 border-emerald-200 inline-block">
              <p className="text-xl text-emerald-600 font-bold">
                ✓ Correct!
              </p>
              <Button onClick={handleNextHand} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-sm">
                Next Hand →
              </Button>
            </div>
          )}
          {gameState === 'incorrect' && (
            <div className="space-y-2 bg-red-50 py-3 px-4 rounded-xl border-2 border-red-200 inline-block max-w-md">
              <p className="text-xl text-red-600 font-bold">
                ✗ Incorrect
              </p>
              <p className="text-sm text-slate-700 font-medium">
                {currentScenario.description}
              </p>
              <Button onClick={handleNextHand} size="sm" className="bg-slate-600 hover:bg-slate-700 text-sm">
                Next Hand →
              </Button>
            </div>
          )}
          {loading && (
            <p className="text-sm text-slate-500 animate-pulse">Calculating equity...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
