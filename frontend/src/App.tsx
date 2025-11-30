import React, { useState, useEffect, useRef } from 'react';
import { PlayingCard } from './components/PlayingCard';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { ScenarioCache } from './services/ScenarioCache';

interface CardType {
  rank: string;
  suit: string;
  code: string;
}

interface Scenario {
  hand1: CardType[];
  hand2: CardType[];
  community: CardType[];
  stage: string;
  hand1_equity?: number;
  hand2_equity?: number;
}

interface EquityResult {
  equities: number[];
  wins: number[];
  ties: number[];
  hands_evaluated: number;
  speed: number;
  enumerated_all: boolean;
}

type GameState = 'loading' | 'playing' | 'correct' | 'incorrect';

// Get API URLs from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

// Map single-letter suit codes to full names
const mapSuit = (suit: string): 'hearts' | 'diamonds' | 'clubs' | 'spades' => {
  const suitMap: { [key: string]: 'hearts' | 'diamonds' | 'clubs' | 'spades' } = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades',
    'hearts': 'hearts',
    'diamonds': 'diamonds',
    'clubs': 'clubs',
    'spades': 'spades',
  };
  return suitMap[suit.toLowerCase()] || 'hearts';
};

function App() {
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    // Load high score from localStorage
    const saved = localStorage.getItem('pokerEquityHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);

  // Initialize scenario cache
  const scenarioCacheRef = useRef<ScenarioCache | null>(null);
  if (!scenarioCacheRef.current) {
    scenarioCacheRef.current = new ScenarioCache(API_URL);
  }

  // Calculate difficulty based on streak
  const calculateDifficulty = (streak: number) => {
    // Formula: 0.5 + 0.5 * e^(-0.1 * streak)
    // This gives the equity for the WEAKER hand
    return 0.5 + 0.5 * Math.exp(-0.25 * streak);
  };

  // Fetch a new scenario using the cache
  const fetchScenario = async () => {
    setLoading(true);
    setGameState('loading');
    try {
      // Get scenario from cache (it will handle prefetching automatically)
      const data = await scenarioCacheRef.current!.getScenario(streak);

      if (!data) {
        throw new Error('Failed to fetch scenario');
      }

      setCurrentScenario(data);

      // Calculate equity for this scenario
      await calculateEquity(data);

      setTimeLeft(10);
      setGameState('playing');
    } catch (err) {
      console.error('Error fetching scenario:', err);
      // Fallback to a simple scenario if API fails
      setCurrentScenario({
        hand1: [
          { rank: 'A', suit: 'h', code: 'Ah' },
          { rank: 'K', suit: 'h', code: 'Kh' }
        ],
        hand2: [
          { rank: 'Q', suit: 'd', code: 'Qd' },
          { rank: 'Q', suit: 'c', code: 'Qc' }
        ],
        community: [],
        stage: 'preflop'
      });
      setGameState('playing');
    } finally {
      setLoading(false);
    }
  };

  const calculateEquity = async (scenario: Scenario) => {
    try {
      const hand1Code = scenario.hand1.map(c => c.code).join('');
      const hand2Code = scenario.hand2.map(c => c.code).join('');
      const boardCode = scenario.community.map(c => c.code).join('');

      const response = await fetch(`${BACKEND_URL}/equity`, {
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
      // Use precomputed equity if available
      if (scenario.hand1_equity && scenario.hand2_equity) {
        setEquityResult({
          equities: [scenario.hand1_equity, scenario.hand2_equity],
          wins: [0, 0],
          ties: [0],
          hands_evaluated: 0,
          speed: 0,
          enumerated_all: false
        });
      }
    }
  };

  // Fetch initial scenario on mount and prefetch upcoming levels
  useEffect(() => {
    const initializeGame = async () => {
      // Start prefetching for the first few levels in the background
      // This runs in parallel with the first scenario fetch
      scenarioCacheRef.current!.prefetchMultipleLevels(0, 5).catch(err =>
        console.error('Error prefetching initial scenarios:', err)
      );

      // Fetch the first scenario
      await fetchScenario();
    };

    initializeGame();
  }, []);

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
      // Wrong answer - game over
      setGameOver(true);

      // Check if new high score
      if (streak > highScore) {
        setHighScore(streak);
        localStorage.setItem('pokerEquityHighScore', streak.toString());
      }
    } else {
      // Correct answer - increment streak
      setStreak(prev => prev + 1);
    }
  };

  const handleNextHand = () => {
    setGameState('loading');
    fetchScenario();
  };

  const handleRestart = () => {
    setStreak(0);
    setGameState('loading');
    setGameOver(false);
    setTimeLeft(10);
    fetchScenario();
  };

  // Calculate difficulty display
  const currentDifficulty = calculateDifficulty(streak);
  const difficultyPercent = Math.round((1 - currentDifficulty) * 200); // Convert to 0-100% scale

  // Calculate how many face-down cards to show (5 total community cards)
  const totalCommunityCards = 5;
  const revealedCards = currentScenario?.community.length || 0;
  const faceDownCount = totalCommunityCards - revealedCards;

  // Get stage display name
  const getStageDisplay = () => {
    if (!currentScenario) return '';
    switch (currentScenario.stage) {
      case 'preflop': return 'Pre-Flop';
      case 'flop': return 'Flop';
      case 'turn': return 'Turn';
      default: return '';
    }
  };

  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl font-bold animate-pulse">Loading game...</div>
      </div>
    );
  }

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
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Streak</div>
                  <div className="text-3xl font-bold text-white">{streak}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Best</div>
                  <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
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

          {/* Difficulty Indicator */}
          <div className="px-10 py-3 bg-gray-100 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stage: {getStageDisplay()}</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Difficulty: {difficultyPercent}%
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                  style={{ width: `${difficultyPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Community Cards Section */}
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
                    suit={mapSuit(card.suit)}
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
                      suit={mapSuit(card.suit)}
                      size="md"
                    />
                  ))}
                </div>
                {gameState !== 'playing' && gameState !== 'loading' && equityResult && (
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
                      suit={mapSuit(card.suit)}
                      size="md"
                    />
                  ))}
                </div>
                {gameState !== 'playing' && gameState !== 'loading' && equityResult && (
                  <div className="text-2xl font-bold text-black mt-4">
                    {(equityResult.equities[1] * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Instructions/Feedback */}
            <div className="text-center py-4">
              {gameState === 'loading' && (
                <p className="text-sm text-gray-500 animate-pulse">Loading next hand...</p>
              )}
              {gameState === 'playing' && !gameOver && (
                <p className="text-sm text-gray-600 font-medium">
                  Click on the hand you think has more equity
                </p>
              )}
              {gameState === 'correct' && !gameOver && (
                <div className="flex items-center justify-center gap-6 -mt-4">
                  <div className="text-2xl text-green-600 font-bold">
                    ✓ Correct!
                  </div>
                  <Button
                    onClick={handleNextHand}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold border-2 border-black px-8 py-6"
                  >
                    Next →
                  </Button>
                </div>
              )}
              {gameState === 'incorrect' && gameOver && (
                <div className="space-y-4">
                  <p className="text-3xl text-red-600 font-bold">
                    Game Over!
                  </p>
                  <p className="text-lg text-gray-600">
                    {timeLeft === 0 ? "Time's up!" : "Wrong choice!"}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-black">
                      Streak: {streak}
                    </p>
                    {streak > highScore && (
                      <p className="text-lg text-green-600 font-bold">
                        🎉 New High Score!
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleRestart}
                    size="lg"
                    className="bg-black hover:bg-gray-900 text-white text-lg font-bold border-2 border-black px-8 py-6"
                  >
                    Restart
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;