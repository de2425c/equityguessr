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
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);

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
    setTimeLeft(10);
  }, [currentScenarioIndex]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing' || gameOver) return;

    if (timeLeft === 0) {
      // Time's up - treat as incorrect
      setGameState('incorrect');
      setGameOver(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, gameOver]);

  const handleHandClick = (handNumber: 1 | 2) => {
    if (gameState !== 'playing' || !equityResult || gameOver) return;

    const hand1Equity = equityResult.equities[0];
    const hand2Equity = equityResult.equities[1];

    const isCorrect =
      (handNumber === 1 && hand1Equity > hand2Equity) ||
      (handNumber === 2 && hand2Equity > hand1Equity);

    setGameState(isCorrect ? 'correct' : 'incorrect');

    if (!isCorrect) {
      // Wrong answer - game over, must restart
      setGameOver(true);
    } else {
      // Correct answer - increment score
      setScore(prev => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
    }
  };

  const handleNextHand = () => {
    if (currentScenarioIndex >= scenarios.length - 1) {
      // Completed all 10 scenarios!
      setGameOver(true);
      return;
    }

    setGameState('playing');
    setCurrentScenarioIndex((prev) => prev + 1);
    setTimeLeft(10);
  };

  const handleRestart = () => {
    setCurrentScenarioIndex(0);
    setGameState('playing');
    setScore({ correct: 0, total: 0 });
    setGameOver(false);
    setTimeLeft(10);
  };

  const accuracy = score.total > 0 ? ((score.correct / score.total) * 100).toFixed(0) : '0';

  // Calculate how many face-down cards to show (5 total community cards)
  const totalCommunityCards = 5;
  const revealedCards = currentScenario.community.length;
  const faceDownCount = totalCommunityCards - revealedCards;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex gap-8 items-center h-screen py-4">
        {/* Main Game Container */}
        <div className="bg-white border-2 border-black h-full flex flex-col" style={{ width: '850px' }}>
          {/* Header Section */}
          <div className="bg-black px-10 py-6 border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-white text-3xl">♠</div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">
                  EquityGuesser
                </h1>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Progress</div>
                  <div className="text-3xl font-bold text-white">{currentScenarioIndex + 1}/10</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Time</div>
                  <div className={cn(
                    "text-3xl font-bold",
                    timeLeft <= 3 ? "text-red-500" : "text-white"
                  )}>{timeLeft}s</div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Cards Section - Moved to Top */}
          <div className="px-10 py-8 bg-white border-b-2 border-black">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest text-center mb-6">
              Community Board
            </div>
            <div className="flex justify-center items-center">
              <div className="flex gap-2">
                {/* Always show exactly 5 cards */}
                {/* Show revealed cards first */}
                {currentScenario.community.map((card, idx) => (
                  <PlayingCard
                    key={`revealed-${idx}`}
                    rank={card.rank}
                    suit={card.suit}
                    size="md"
                  />
                ))}
                {/* Show face-down cards for unrevealed */}
                {Array.from({ length: faceDownCount }).map((_, idx) => (
                  <PlayingCard
                    key={`facedown-${idx}`}
                    faceDown={true}
                    size="md"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hand Selection Section - Horizontal layout */}
          <div className="flex-1 flex flex-col justify-center bg-white px-10">
            <div className="grid grid-cols-3 gap-8 items-center mt-8 mb-12">
              {/* Hand 1 */}
              <div
                className={cn(
                  'cursor-pointer transition-all duration-200 flex flex-col items-center',
                  gameState === 'playing' && 'hover:scale-105'
                )}
                onClick={() => handleHandClick(1)}
              >
                <div className={cn(
                  "flex justify-center gap-1",
                  gameState === 'correct' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'ring-4 ring-black rounded-lg p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'ring-4 ring-black rounded-lg p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[0] < equityResult.equities[1] && 'opacity-40'
                )}>
                  {currentScenario.hand1.map((card, idx) => (
                    <PlayingCard
                      key={idx}
                      rank={card.rank}
                      suit={card.suit}
                      size="md"
                    />
                  ))}
                </div>
                {gameState !== 'playing' && equityResult && (
                  <div className="text-2xl font-bold text-black mt-4">
                    {(equityResult.equities[0] * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">VS</div>
              </div>

              {/* Hand 2 */}
              <div
                className={cn(
                  'cursor-pointer transition-all duration-200 flex flex-col items-center',
                  gameState === 'playing' && 'hover:scale-105'
                )}
                onClick={() => handleHandClick(2)}
              >
                <div className={cn(
                  "flex justify-center gap-1",
                  gameState === 'correct' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'ring-4 ring-black rounded-lg p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'ring-4 ring-black rounded-lg p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[1] < equityResult.equities[0] && 'opacity-40'
                )}>
                  {currentScenario.hand2.map((card, idx) => (
                    <PlayingCard
                      key={idx}
                      rank={card.rank}
                      suit={card.suit}
                      size="md"
                    />
                  ))}
                </div>
                {gameState !== 'playing' && equityResult && (
                  <div className="text-2xl font-bold text-black mt-4">
                    {(equityResult.equities[1] * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Instructions/Feedback */}
            <div className="text-center py-4">
              {gameState === 'playing' && !gameOver && (
                <p className="text-sm text-gray-600 font-medium">
                  Click on the hand you think has more equity
                </p>
              )}
              {gameState === 'correct' && !gameOver && (
                <div className="space-y-4">
                  <div className="text-2xl text-green-600 font-bold">
                    ✓ Correct!
                  </div>
                  <Button
                    onClick={handleNextHand}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold border-2 border-black px-8 py-6"
                  >
                    {currentScenarioIndex >= scenarios.length - 1 ? 'Finish' : 'Next →'}
                  </Button>
                </div>
              )}
              {gameState === 'incorrect' && gameOver && (
                <div className="space-y-4">
                  <p className="text-3xl text-red-600 font-bold">
                    Game Over!
                  </p>
                  <p className="text-lg text-gray-600">
                    {timeLeft === 0 ? "Time's up!" : currentScenario.description}
                  </p>
                  <p className="text-xl font-bold text-black">
                    You got {score.correct} out of 10 correct
                  </p>
                  <Button
                    onClick={handleRestart}
                    size="lg"
                    className="bg-black hover:bg-gray-900 text-white text-lg font-bold border-2 border-black px-8 py-6"
                  >
                    Restart
                  </Button>
                </div>
              )}
              {gameState === 'correct' && gameOver && currentScenarioIndex >= scenarios.length - 1 && (
                <div className="space-y-4">
                  <p className="text-3xl text-green-600 font-bold">
                    🎉 Perfect! You got all 10 correct!
                  </p>
                  <Button
                    onClick={handleRestart}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold border-2 border-black px-8 py-6"
                  >
                    Play Again
                  </Button>
                </div>
              )}
              {loading && (
                <p className="text-sm text-gray-500 animate-pulse">Calculating equity...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
