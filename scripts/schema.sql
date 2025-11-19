-- Poker Equity Scenarios Database Schema
-- Drop table if exists (for fresh runs)
DROP TABLE IF EXISTS hand_scenarios;

-- Main table for storing precomputed equity scenarios
CREATE TABLE hand_scenarios (
    id BIGSERIAL PRIMARY KEY,

    -- Hand representations (compact format)
    hand1 VARCHAR(4) NOT NULL,      -- e.g., "AhKh"
    hand2 VARCHAR(4) NOT NULL,      -- e.g., "QdQc"
    board VARCHAR(10) NOT NULL,     -- e.g., "" (preflop), "2c4c5h" (flop), "2c4c5h7d" (turn)

    -- Equity results (what we need for lookups)
    hand1_equity DECIMAL(6,4) NOT NULL,  -- e.g., 0.4523
    hand2_equity DECIMAL(6,4) NOT NULL,  -- e.g., 0.5477

    -- Metadata for filtering
    stage VARCHAR(10) NOT NULL,     -- 'preflop', 'flop', 'turn'

    -- Additional stats (optional but useful)
    hand1_wins BIGINT,
    hand2_wins BIGINT,
    ties BIGINT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Critical indexes for fast equity-based lookups
CREATE INDEX idx_stage ON hand_scenarios(stage);
CREATE INDEX idx_hand1_equity_desc ON hand_scenarios(hand1_equity DESC);
CREATE INDEX idx_hand2_equity_desc ON hand_scenarios(hand2_equity DESC);

-- Composite index for stage + equity queries (most common query pattern)
CREATE INDEX idx_stage_equity ON hand_scenarios(stage, hand1_equity DESC);

-- Index for exact scenario lookups (if needed)
CREATE INDEX idx_hands_board ON hand_scenarios(hand1, hand2, board);

-- Optional: Index for random sampling queries
CREATE INDEX idx_random_id ON hand_scenarios(id);
