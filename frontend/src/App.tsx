import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { PlayingCard } from './components/PlayingCard';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { Skeleton } from './components/ui/skeleton';
import { Separator } from './components/ui/separator';
import { cn } from './lib/utils';
import { ScenarioCache } from './services/ScenarioCache';
import { Leaderboard } from './components/Leaderboard';

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

type GameState = 'not-started' | 'loading' | 'playing' | 'correct' | 'incorrect';

// Get API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

// Hook to detect mobile screen
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

function App() {
  const isMobile = useIsMobile();
  const cardSize = isMobile ? 'sm' : 'md';

  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [gameState, setGameState] = useState<GameState>('not-started');
  const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    // Load high score from localStorage
    const saved = localStorage.getItem('pokerEquityHighScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [scenarioId, setScenarioId] = useState(0);
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  // Initialize scenario cache
  const scenarioCacheRef = useRef<ScenarioCache | null>(null);
  if (!scenarioCacheRef.current) {
    scenarioCacheRef.current = new ScenarioCache(API_URL);
  }

  // Calculate difficulty based on streak
  const calculateDifficulty = (streak: number) => {
    // Formula: 0.5 + 0.5 * e^(-0.25 * streak)
    // This gives the equity for the WEAKER hand
    return 0.5 + 0.5 * Math.exp(-0.25 * streak);
  };

  // Calculate time limit based on streak
  // Decreases asymptotically from 10s to 5s, reaching ~6s at streak 15
  const calculateTimeLimit = (streak: number) => {
    // Formula: 5 + 5 * e^(-0.107 * streak)
    // At streak 0: 10 seconds
    // At streak 15: ~6 seconds
    // Asymptote: 5 seconds
    return Math.round(5 + 5 * Math.exp(-0.107 * streak));
  };

  // Fetch a new scenario using the cache
  const fetchScenario = async () => {
    setGameState('loading');
    try {
      // Get scenario from cache (it will handle prefetching automatically)
      const { scenario, equityResult } = await scenarioCacheRef.current!.getScenario(streak);

      if (!scenario) {
        throw new Error('Failed to fetch scenario');
      }

      setCurrentScenario(scenario);
      setScenarioId(prev => prev + 1);

      // Use equity from scenario (already embedded in API response)
      if (equityResult) {
        setEquityResult(equityResult);
      } else if (scenario.hand1_equity !== undefined && scenario.hand2_equity !== undefined) {
        setEquityResult({
          equities: [scenario.hand1_equity, scenario.hand2_equity],
          wins: [0, 0],
          ties: [0],
          hands_evaluated: 0,
          speed: 0,
          enumerated_all: true
        });
      }

      setTimeLeft(calculateTimeLimit(streak));
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
        stage: 'preflop',
        hand1_equity: 0.65,
        hand2_equity: 0.35
      });
      setEquityResult({
        equities: [0.65, 0.35],
        wins: [0, 0],
        ties: [0],
        hands_evaluated: 0,
        speed: 0,
        enumerated_all: true
      });
      setGameState('playing');
    }
  };

  // Fetch initial scenario when game starts
  useEffect(() => {
    if (!gameStarted) return;
    // Just fetch first scenario - cache should already have it from mount prefetch
    fetchScenario();
  }, [gameStarted]);

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

  // Auto-progress after correct answer
  useEffect(() => {
    if (gameState === 'correct' && !gameOver) {
      const timer = setTimeout(() => {
        setGameState('loading');
        fetchScenario();
      }, 1500); // 1.5 second delay to show the result

      return () => clearTimeout(timer);
    }
  }, [gameState, gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setStreak(prev => {
        const newStreak = prev + 1;

        // Prefetch just the next level ahead
        scenarioCacheRef.current!.prefetchMultipleLevels(newStreak + 1, 1).catch(err =>
          console.debug('Post-answer prefetch:', err)
        );

        return newStreak;
      });
    }
  };

  const handleRestart = () => {
    setStreak(0);
    setGameState('not-started');
    setGameOver(false);
    setTimeLeft(10);
    setGameStarted(false);
    setCurrentScenario(null);
    setEquityResult(null);
  };

  const handleStartGame = () => {
    setGameStarted(true);
    setGameState('loading');
  };

  // Prefetch first 3 levels on mount (while user reads instructions)
  useEffect(() => {
    if (!scenarioCacheRef.current) return;

    // Prefetch levels 0, 1, 2 - just 3 scenarios total
    scenarioCacheRef.current.prefetchMultipleLevels(0, 3).catch(err =>
      console.debug('Background prefetch:', err)
    );
  }, []);

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

  // Show start screen if game hasn't started
  if (gameState === 'not-started') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4">
        <Card className="border-2 sm:border-4 border-black w-full max-w-md sm:max-w-2xl shadow-2xl">
          <CardHeader className="text-center pb-4 sm:pb-8 px-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <div className="text-3xl sm:text-6xl">♠</div>
              <CardTitle className="text-2xl sm:text-5xl font-extrabold tracking-tight uppercase">
                EquityGuesser
              </CardTitle>
              <div className="text-3xl sm:text-6xl">♣</div>
            </div>
            <CardDescription className="text-sm sm:text-lg text-gray-600 font-semibold">
              Test your poker hand evaluation skills!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-6 px-3 sm:px-6">

            {/* Leaderboard & How to Play Accordions */}
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="leaderboard" className="border sm:border-2 border-gray-200">
                <AccordionTrigger className="text-base sm:text-xl font-bold hover:no-underline px-3 sm:px-6 py-2">
                  Leaderboard
                </AccordionTrigger>
                <AccordionContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <Leaderboard compact />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="how-to-play" className="border sm:border-2 border-gray-200">
                <AccordionTrigger className="text-base sm:text-xl font-bold hover:no-underline px-3 sm:px-6 py-2">
                  How to Play
                </AccordionTrigger>
                <AccordionContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <ol className="space-y-1 sm:space-y-3 text-left text-xs sm:text-base">
                    <li className="flex gap-2 sm:gap-3">
                      <span className="font-bold">1.</span>
                      <span className="text-gray-700">Click the hand with higher equity (better chance of winning).</span>
                    </li>
                    <li className="flex gap-2 sm:gap-3">
                      <span className="font-bold">2.</span>
                      <span className="text-gray-700">Time decreases as your streak grows.</span>
                    </li>
                    <li className="flex gap-2 sm:gap-3">
                      <span className="font-bold">3.</span>
                      <span className="text-gray-700">Wrong answer or timeout ends the game.</span>
                    </li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* High Score Display */}
            {highScore > 0 && (
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600">Your Best Streak</p>
                <Badge className="mt-1 sm:mt-2 text-lg sm:text-2xl px-3 sm:px-4 py-1 sm:py-2 bg-yellow-500 hover:bg-yellow-600">
                  {highScore}
                </Badge>
              </div>
            )}

            {/* Start Button */}
            <div className="text-center pt-2 sm:pt-4">
              <Button
                onClick={handleStartGame}
                size="lg"
                className="bg-black hover:bg-gray-900 text-white text-lg sm:text-xl font-bold border-2 border-black px-8 sm:px-12 py-5 sm:py-8 uppercase tracking-wider transform hover:scale-105 transition-all"
              >
                Start Game
              </Button>
            </div>

            {/* Bottom decoration */}
            <div className="flex justify-center gap-2 pt-2 sm:pt-4 text-lg sm:text-2xl">
              <span>♥</span>
              <span>♦</span>
              <span>♣</span>
              <span>♠</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-2 sm:p-4">
        <Card className="border-2 border-black w-full max-w-4xl">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
              <Skeleton className="h-8 w-32 sm:h-10 sm:w-48" />
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex justify-center gap-1 sm:gap-2">
              <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
            </div>
            <Separator />
            <div className="flex justify-around">
              <div className="flex gap-1 sm:gap-2">
                <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
                <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
                <Skeleton className="h-20 w-14 sm:h-28 sm:w-20 rounded-lg" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold animate-pulse">Loading game...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <Analytics />
    <div className="min-h-screen bg-white flex items-center justify-center p-1 sm:p-4">
      {/* Main Game Container */}
      <Card className="border-2 sm:border-4 border-black w-full max-w-5xl shadow-2xl">
        {/* Header Section */}
        <CardHeader className="bg-black rounded-t-none border-b-2 border-black px-2 sm:px-6 py-3 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="text-white text-xl sm:text-3xl">♠</div>
              <CardTitle className="text-base sm:text-3xl font-extrabold text-white tracking-tight uppercase">
                EquityGuesser
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="text-center">
                <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-2">Streak</div>
                <Badge variant="secondary" className="text-lg sm:text-2xl px-2 sm:px-4 py-1 sm:py-2 bg-white text-black">
                  {streak}
                </Badge>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Best</div>
                <Badge className="text-xl px-3 py-1 bg-yellow-500 hover:bg-yellow-600">
                  {highScore}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider sm:tracking-widest mb-1 sm:mb-2">Time</div>
                <Badge
                  variant={timeLeft <= 3 ? "destructive" : "secondary"}
                  className={cn(
                    "text-lg sm:text-2xl px-2 sm:px-4 py-1 sm:py-2",
                    timeLeft <= 3 ? "" : "bg-white text-black"
                  )}
                >
                  {timeLeft}s
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Difficulty Indicator */}
        <div className="px-2 sm:px-8 py-2 sm:py-4 bg-gray-100 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="outline" className="text-[10px] sm:text-xs font-bold uppercase">
                {getStageDisplay()}
              </Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs font-bold uppercase">
                {difficultyPercent}%
              </Badge>
            </div>
            <Progress
              value={difficultyPercent}
              className="w-16 sm:w-32 h-2"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {/* Community Cards Section */}
          <div className="px-2 sm:px-10 py-4 sm:py-8 bg-white border-b-2 border-black">
            <div className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-widest text-center mb-3 sm:mb-6">
              Community Board
            </div>
            <div className="flex justify-center items-center">
              <div key={`community-${scenarioId}`} className="flex gap-1 sm:gap-2">
                {/* Always show exactly 5 cards */}
                {/* Show revealed cards first */}
                {currentScenario.community.map((card, idx) => (
                  <PlayingCard
                    key={`revealed-${idx}`}
                    rank={card.rank}
                    suit={mapSuit(card.suit)}
                    size={cardSize}
                  />
                ))}
                {/* Show face-down cards for unrevealed */}
                {Array.from({ length: faceDownCount }).map((_, idx) => (
                  <PlayingCard
                    key={`facedown-${idx}`}
                    faceDown={true}
                    size={cardSize}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hand Selection Section - Horizontal layout */}
          <div className="flex-1 flex flex-col justify-center bg-white px-2 sm:px-10">
            <div className="grid grid-cols-3 gap-2 sm:gap-8 items-center mt-4 sm:mt-8 mb-6 sm:mb-12">
              {/* Hand 1 */}
              <div
                className={cn(
                  'cursor-pointer transition-all duration-200 flex flex-col items-center',
                  gameState === 'playing' && 'hover:scale-105 active:scale-95'
                )}
                onClick={() => handleHandClick(1)}
              >
                <div
                  key={`hand1-${scenarioId}`}
                  className={cn(
                  "flex justify-center gap-0.5 sm:gap-1",
                  gameState === 'correct' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'ring-2 sm:ring-4 ring-black rounded-lg p-0.5 sm:p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[0] > equityResult.equities[1] && 'ring-2 sm:ring-4 ring-black rounded-lg p-0.5 sm:p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[0] < equityResult.equities[1] && 'opacity-40'
                )}>
                  {currentScenario.hand1.map((card, idx) => (
                    <PlayingCard
                      key={idx}
                      rank={card.rank}
                      suit={mapSuit(card.suit)}
                      size={cardSize}
                    />
                  ))}
                </div>
                {gameState !== 'playing' && gameState !== 'loading' && equityResult && (
                  <div className="text-base sm:text-2xl font-bold text-black mt-2 sm:mt-4">
                    {(equityResult.equities[0] * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-gray-400">VS</div>
              </div>

              {/* Hand 2 */}
              <div
                className={cn(
                  'cursor-pointer transition-all duration-200 flex flex-col items-center',
                  gameState === 'playing' && 'hover:scale-105 active:scale-95'
                )}
                onClick={() => handleHandClick(2)}
              >
                <div
                  key={`hand2-${scenarioId}`}
                  className={cn(
                  "flex justify-center gap-0.5 sm:gap-1",
                  gameState === 'correct' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'ring-2 sm:ring-4 ring-black rounded-lg p-0.5 sm:p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[1] > equityResult.equities[0] && 'ring-2 sm:ring-4 ring-black rounded-lg p-0.5 sm:p-1',
                  gameState === 'incorrect' && equityResult && equityResult.equities[1] < equityResult.equities[0] && 'opacity-40'
                )}>
                  {currentScenario.hand2.map((card, idx) => (
                    <PlayingCard
                      key={idx}
                      rank={card.rank}
                      suit={mapSuit(card.suit)}
                      size={cardSize}
                    />
                  ))}
                </div>
                {gameState !== 'playing' && gameState !== 'loading' && equityResult && (
                  <div className="text-base sm:text-2xl font-bold text-black mt-2 sm:mt-4">
                    {(equityResult.equities[1] * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>

            {/* Instructions/Feedback */}
            <div className="text-center py-2 sm:py-4 px-2 sm:px-10">
              {gameState === 'loading' && (
                <Alert className="border-gray-300 bg-gray-50">
                  <AlertDescription className="text-center animate-pulse">
                    Loading next hand...
                  </AlertDescription>
                </Alert>
              )}
              {gameState === 'playing' && !gameOver && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-center font-medium">
                    Click on the hand you think has more equity
                  </AlertDescription>
                </Alert>
              )}
              {gameState === 'correct' && !gameOver && (
                <Alert className="border-green-500 bg-green-50">
                  <AlertTitle className="text-center text-lg sm:text-2xl text-green-600">
                    Correct!
                  </AlertTitle>
                </Alert>
              )}
              {gameState === 'incorrect' && gameOver && (
                <div className="space-y-3 sm:space-y-4">
                  <Alert variant="destructive" className="border-2">
                    <AlertTitle className="text-center text-xl sm:text-3xl mb-2 sm:mb-4">
                      Game Over!
                    </AlertTitle>
                    <AlertDescription className="space-y-3 sm:space-y-4">
                      <p className="text-sm sm:text-lg text-center">
                        {timeLeft === 0 ? "Time's up!" : "Wrong choice!"}
                      </p>
                      <div className="text-center space-y-2">
                        <Badge variant="outline" className="text-base sm:text-xl px-3 sm:px-4 py-1 sm:py-2">
                          Final Streak: {streak}
                        </Badge>
                        {streak > highScore && (
                          <div>
                            <Badge className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 bg-green-600">
                              New High Score!
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-center pt-1 sm:pt-2">
                        <Button
                          onClick={handleRestart}
                          size="lg"
                          className="bg-black hover:bg-gray-900 text-white text-base sm:text-lg font-bold border-2 border-black px-6 sm:px-8 py-4 sm:py-6"
                        >
                          Restart
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                  <Leaderboard
                    key={leaderboardKey}
                    currentScore={streak}
                    showSubmitForm={true}
                    onScoreSubmitted={() => setLeaderboardKey(prev => prev + 1)}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

export default App;