import React from 'react';
import { Card, RANKS, SUITS } from 'react-playing-cards';

export const CardDemo: React.FC = () => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Playing Cards Demo</h2>

      <div className="mb-8">
        <h3 className="text-xl mb-4">Single Cards</h3>
        <div className="flex gap-4 flex-wrap">
          <Card rank={RANKS.ACE} suit={SUITS.SPADES} size={150} />
          <Card rank={RANKS.KING} suit={SUITS.HEARTS} size={150} />
          <Card rank={RANKS.QUEEN} suit={SUITS.DIAMONDS} size={150} />
          <Card rank={RANKS.JACK} suit={SUITS.CLUBS} size={150} />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl mb-4">Poker Hand Example</h3>
        <div className="flex gap-2">
          <Card rank={RANKS.ACE} suit={SUITS.SPADES} size={120} />
          <Card rank={RANKS.ACE} suit={SUITS.HEARTS} size={120} />
          <Card rank={RANKS.KING} suit={SUITS.SPADES} size={120} />
          <Card rank={RANKS.KING} suit={SUITS.HEARTS} size={120} />
          <Card rank={RANKS.QUEEN} suit={SUITS.SPADES} size={120} />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl mb-4">All Ranks (Spades)</h3>
        <div className="flex gap-2 flex-wrap">
          {Object.values(RANKS).map((rank) => (
            <Card key={rank} rank={rank} suit={SUITS.SPADES} size={100} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl mb-4">All Suits (Aces)</h3>
        <div className="flex gap-4">
          {Object.values(SUITS).map((suit) => (
            <Card key={suit} rank={RANKS.ACE} suit={suit} size={120} />
          ))}
        </div>
      </div>
    </div>
  );
};
