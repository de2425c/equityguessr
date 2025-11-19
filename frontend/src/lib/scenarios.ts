export interface Card {
  rank: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  code: string; // e.g., "Ah" for Ace of hearts
}

export interface Scenario {
  hand1: Card[];
  hand2: Card[];
  community: Card[];
  description: string;
}

const createCard = (code: string): Card => {
  const rank = code[0];
  const suitCode = code[1];
  const suitMap: { [key: string]: 'hearts' | 'diamonds' | 'clubs' | 'spades' } = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades',
  };
  return {
    rank: rank === 'T' ? '10' : rank,
    suit: suitMap[suitCode],
    code,
  };
};

export const scenarios: Scenario[] = [
  {
    hand1: [createCard('Ac'), createCard('9d')],
    hand2: [createCard('5h'), createCard('Jh')],
    community: [createCard('Js'), createCard('Qd'), createCard('2h')],
    description: 'Top pair vs Ace high',
  },
  {
    hand1: [createCard('Ah'), createCard('Ac')],
    hand2: [createCard('Kd'), createCard('Ks')],
    community: [],
    description: 'Aces vs Kings preflop',
  },
  {
    hand1: [createCard('Ah'), createCard('Kh')],
    hand2: [createCard('Qd'), createCard('Qc')],
    community: [createCard('2h'), createCard('4h'), createCard('5h')],
    description: 'Flush draw vs overpair',
  },
  {
    hand1: [createCard('Ts'), createCard('9s')],
    hand2: [createCard('Ad'), createCard('Ah')],
    community: [createCard('8s'), createCard('7s'), createCard('2c')],
    description: 'Open-ended straight flush draw vs overpair',
  },
  {
    hand1: [createCard('Kh'), createCard('Kd')],
    hand2: [createCard('As'), createCard('Ks')],
    community: [createCard('Ah'), createCard('9c'), createCard('3d')],
    description: 'Set vs two pair',
  },
  {
    hand1: [createCard('Jh'), createCard('Th')],
    hand2: [createCard('9d'), createCard('9c')],
    community: [createCard('8h'), createCard('7h'), createCard('2s')],
    description: 'Straight draw + flush draw vs pair',
  },
  {
    hand1: [createCard('Qc'), createCard('Qd')],
    hand2: [createCard('Jc'), createCard('Tc')],
    community: [createCard('9c'), createCard('8c'), createCard('2h')],
    description: 'Overpair vs flush draw + straight draw',
  },
  {
    hand1: [createCard('As'), createCard('Ac')],
    hand2: [createCard('7h'), createCard('6h')],
    community: [createCard('8h'), createCard('9h'), createCard('Th')],
    description: 'Aces vs made straight flush',
  },
  {
    hand1: [createCard('Kd'), createCard('Qd')],
    hand2: [createCard('3h'), createCard('3c')],
    community: [createCard('Ks'), createCard('Qh'), createCard('3s')],
    description: 'Two pair vs set',
  },
  {
    hand1: [createCard('Ah'), createCard('Qh')],
    hand2: [createCard('Tc'), createCard('Ts')],
    community: [createCard('Jh'), createCard('Kh'), createCard('2d')],
    description: 'Nut straight draw + nut flush draw vs overpair',
  },
];
