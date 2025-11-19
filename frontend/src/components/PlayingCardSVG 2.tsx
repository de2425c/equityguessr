import React from 'react';
import { Card, RANKS, SUITS } from 'react-playing-cards';

interface PlayingCardSVGProps {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  size?: 'sm' | 'md' | 'lg';
}

// Map your suit names to the library's SUITS enum
const suitMap: Record<string, SUITS> = {
  hearts: SUITS.HEARTS,
  diamonds: SUITS.DIAMONDS,
  clubs: SUITS.CLUBS,
  spades: SUITS.SPADES,
};

// Map your rank names to the library's RANKS enum
const rankMap: Record<string, RANKS> = {
  'A': RANKS.ACE,
  '2': RANKS.TWO,
  '3': RANKS.THREE,
  '4': RANKS.FOUR,
  '5': RANKS.FIVE,
  '6': RANKS.SIX,
  '7': RANKS.SEVEN,
  '8': RANKS.EIGHT,
  '9': RANKS.NINE,
  '10': RANKS.TEN,
  'T': RANKS.TEN,
  'J': RANKS.JACK,
  'Q': RANKS.QUEEN,
  'K': RANKS.KING,
};

// Map size to pixel values
const sizeMap = {
  sm: 100,
  md: 130,
  lg: 160,
};

export function PlayingCardSVG({ rank, suit, size = 'md' }: PlayingCardSVGProps) {
  const libraryRank = rankMap[rank.toUpperCase()];
  const librarySuit = suitMap[suit.toLowerCase()];
  const pixelSize = sizeMap[size];

  if (!libraryRank || !librarySuit) {
    console.error(`Invalid card: ${rank} of ${suit}`);
    return null;
  }

  return (
    <Card
      rank={libraryRank}
      suit={librarySuit}
      size={pixelSize}
    />
  );
}
