# Poker Equity Backend

A lightweight, efficient backend server for calculating poker hand equities and evaluating hands using the OMPEval library.

## Features

- **Equity Calculation**: Calculate equity for 2-6 hands with optional board and dead cards
- **Hand Evaluation**: Evaluate poker hands (0-7 cards) and get rankings
- **Fast Performance**: Built on OMPEval's optimized C++ library
- **Simple REST API**: Easy to integrate with any frontend or application

## Setup

### Prerequisites

- C++ compiler with C++17 support (g++, clang++)
- CMake 3.15+
- curl (for downloading dependencies)
- git

### Installation

1. Run the setup script to download dependencies:

```bash
cd backend
./setup.sh
```

2. Build the project:

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make
```

3. Run the server:

```bash
./poker_server
```

The server will start on `http://localhost:8080`

## API Endpoints

### POST /equity

Calculate equity for multiple hands.

**Request Body:**
```json
{
  "hands": ["AhKh", "QdQc"],
  "board": "2c4c5h",
  "dead": "",
  "enumerate_all": true
}
```

**Parameters:**
- `hands` (required): Array of 2-6 hand strings (e.g., "AhKh", "QQ+", "random")
- `board` (optional): Board cards (0-5 cards, e.g., "2c4c5h")
- `dead` (optional): Dead cards (e.g., "Jc")
- `enumerate_all` (optional): Use exact enumeration (true) or Monte Carlo (false). Default: true if board has ≤3 cards

**Response:**
```json
{
  "equities": [0.4523, 0.5477],
  "wins": [452300, 547700],
  "ties": [0, 0],
  "hands_evaluated": 1000000,
  "speed": 50000000,
  "enumerated_all": true
}
```

**Card Notation:**
- Specific cards: `Ah` (Ace of hearts), `Kd` (King of diamonds), `2c` (2 of clubs), `Ts` (Ten of spades)
- Ranks: `2-9`, `T` (Ten), `J` (Jack), `Q` (Queen), `K` (King), `A` (Ace)
- Suits: `h` (hearts), `d` (diamonds), `c` (clubs), `s` (spades)
- Ranges: `QQ+` (Queens or better pairs), `AKs` (Ace-King suited), `random`

**Example:**
```bash
curl -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{
    "hands": ["AhKh", "QdQc"],
    "board": "2c4c5h"
  }'
```

### POST /evaluate

Evaluate a single poker hand (0-7 cards).

**Request Body:**
```json
{
  "hand": "AhKhAcKcKs"
}
```

**Parameters:**
- `hand` (required): String of cards (can include spaces, e.g., "Ah Kh Ac Kc Ks")

**Response:**
```json
{
  "ranking": 32768,
  "category": "Full House",
  "num_cards": 5
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"hand": "AhKhAcKcKs"}'
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Examples

### Calculate Equity Preflop

```bash
curl -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{"hands": ["AhAc", "KdKs"]}'
```

### Calculate Equity with Flop

```bash
curl -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{
    "hands": ["AhKh", "QdQc"],
    "board": "2h4h5h"
  }'
```

### Calculate Equity with Turn

```bash
curl -X POST http://localhost:8080/equity \
  -H "Content-Type: application/json" \
  -d '{
    "hands": ["AhKh", "QdQc", "JsTd"],
    "board": "2h4h5hTc"
  }'
```

### Evaluate a Full House

```bash
curl -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"hand": "AhAcAdKhKc"}'
```

### Evaluate 7 Cards (Best 5 Used)

```bash
curl -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{"hand": "AhKhQhJhTh9h8h"}'
```

## Hand Rankings

The `ranking` field in the evaluate endpoint returns a 16-bit integer where higher values are better:

- 0-4095: High Card
- 4096-8191: Pair
- 8192-12287: Two Pair
- 12288-16383: Three of a Kind
- 16384-20479: Straight
- 20480-24575: Flush
- 24576-28671: Full House
- 28672-32767: Four of a Kind
- 32768-36863: Straight Flush

## Performance

- Full enumeration for preflop (2 hands): ~1-2ms
- Full enumeration with flop: ~10-50ms
- Monte Carlo for complex scenarios: Configurable speed/accuracy tradeoff
- Multi-threaded for faster calculations

## Troubleshooting

### Build Errors

If you encounter build errors, ensure:
1. You have a C++17 compatible compiler
2. All dependencies were downloaded correctly (check `include/` and `lib/` directories)
3. CMake version is 3.15 or higher

### Port Already in Use

If port 8080 is in use, modify `main.cpp` line with `svr.listen("0.0.0.0", 8080)` to use a different port.

## License

This project uses OMPEval which is licensed under GPL. See the OMPEval repository for details.
