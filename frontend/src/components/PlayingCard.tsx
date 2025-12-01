import React, { useEffect, useState } from 'react';

interface PlayingCardProps {
  rank?: string;
  suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
}

// Preload all card images once
const preloadedImages = new Set<string>();
const preloadImage = (src: string) => {
  if (preloadedImages.has(src)) return;
  const img = new Image();
  img.src = src;
  preloadedImages.add(src);
};

// Preload all 52 cards on module load
const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
ranks.forEach(rank => {
  suits.forEach(suit => {
    preloadImage(`/SVG-cards-1.3/${rank}_of_${suit}.svg`);
  });
});

// Map rank and suit to SVG filename
const getCardFilename = (rank: string, suit: string): string => {
  const rankMap: { [key: string]: string } = {
    'A': 'ace',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'T': '10',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king',
  };

  const suitMap: { [key: string]: string } = {
    'hearts': 'hearts',
    'diamonds': 'diamonds',
    'clubs': 'clubs',
    'spades': 'spades',
  };

  const mappedRank = rankMap[rank.toUpperCase()] || rank.toLowerCase();
  const mappedSuit = suitMap[suit] || suit;

  return `${mappedRank}_of_${mappedSuit}.svg`;
};

const sizeMap = {
  sm: { width: 80, height: 112 },   // Small cards for community board
  md: { width: 100, height: 140 },  // Medium cards
  lg: { width: 120, height: 168 },  // Large cards for hand selection
};

export function PlayingCard({ rank, suit, size = 'md', faceDown = false }: PlayingCardProps) {
  const dimensions = sizeMap[size];

  // Render face-down card
  if (faceDown) {
    return (
      <div
        className="inline-block rounded-lg overflow-hidden shadow-lg border-2 border-gray-800"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
          position: 'relative'
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(248, 113, 113, 0.1) 10px,
                rgba(248, 113, 113, 0.1) 20px
              )
            `
          }}
        >
          <div className="w-[70%] h-[85%] border-2 border-red-800/40 rounded-md" />
        </div>
      </div>
    );
  }

  // Render face-up card
  if (!rank || !suit) {
    console.error('PlayingCard requires rank and suit when not face-down');
    return null;
  }

  const filename = getCardFilename(rank, suit);
  const cardUrl = `/SVG-cards-1.3/${filename}`;

  return (
    <img
      src={cardUrl}
      alt={`${rank} of ${suit}`}
      className="inline-block rounded-md shadow-lg border-2 border-gray-300"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        objectFit: 'contain'
      }}
    />
  );
}
