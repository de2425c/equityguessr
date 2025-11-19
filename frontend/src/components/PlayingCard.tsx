import React from 'react';
import { cn } from '../lib/utils';

interface PlayingCardProps {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  size?: 'sm' | 'md' | 'lg';
}

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-black',
  spades: 'text-black',
};

export function PlayingCard({ rank, suit, size = 'md' }: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-16 h-24 text-2xl',
    md: 'w-20 h-32 text-3xl',
    lg: 'w-28 h-40 text-4xl',
  };

  const symbol = suitSymbols[suit];
  const color = suitColors[suit];

  return (
    <div
      className={cn(
        'bg-white rounded-lg border-2 border-gray-300 shadow-md flex flex-col justify-between p-2',
        sizeClasses[size],
        color
      )}
    >
      <div className="flex flex-col items-start leading-none">
        <div className="font-bold">{rank}</div>
        <div className="-mt-1">{symbol}</div>
      </div>
      <div className="flex justify-center items-center flex-1">
        <div className="text-5xl">{symbol}</div>
      </div>
      <div className="flex flex-col items-end leading-none rotate-180">
        <div className="font-bold">{rank}</div>
        <div className="-mt-1">{symbol}</div>
      </div>
    </div>
  );
}
