#!/usr/bin/env python3
"""
Precompute poker equity scenarios and store in PostgreSQL.

Usage:
    python precompute.py --total 3000000 --batch-size 1000

Arguments:
    --total: Total number of scenarios to generate (default: 3000000)
    --batch-size: Number of scenarios per DB insert (default: 1000)
"""

import argparse
import os
import random
import sys
import requests
import psycopg2
from psycopg2.extras import execute_batch
from tqdm import tqdm
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8080')

# All 52 cards in the deck
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
SUITS = ['h', 'd', 'c', 's']
DECK = [rank + suit for rank in RANKS for suit in SUITS]


def generate_random_scenario(stage):
    """
    Generate a random poker scenario.

    Args:
        stage: 'preflop', 'flop', or 'turn'

    Returns:
        tuple: (hand1, hand2, board, stage)
    """
    if stage == 'preflop':
        cards = random.sample(DECK, 4)
        hand1 = ''.join(cards[0:2])
        hand2 = ''.join(cards[2:4])
        board = ''
    elif stage == 'flop':
        cards = random.sample(DECK, 7)
        hand1 = ''.join(cards[0:2])
        hand2 = ''.join(cards[2:4])
        board = ''.join(cards[4:7])
    elif stage == 'turn':
        cards = random.sample(DECK, 8)
        hand1 = ''.join(cards[0:2])
        hand2 = ''.join(cards[2:4])
        board = ''.join(cards[4:8])
    else:
        raise ValueError(f"Invalid stage: {stage}")

    return (hand1, hand2, board, stage)


def calculate_equity(hand1, hand2, board):
    """
    Call the backend equity calculator.

    Args:
        hand1: First hand (e.g., "AhKh")
        hand2: Second hand (e.g., "QdQc")
        board: Board cards (e.g., "2c4c5h" or "")

    Returns:
        dict: Equity results from backend
    """
    payload = {
        'hands': [hand1, hand2],
        'board': board if board else ''
    }

    try:
        response = requests.post(f'{BACKEND_URL}/equity', json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"\nError calling backend: {e}")
        print(f"Payload: {payload}")
        raise


def insert_batch(conn, scenarios_data):
    """
    Bulk insert scenarios into PostgreSQL.

    Args:
        conn: psycopg2 connection
        scenarios_data: List of tuples (hand1, hand2, board, stage, h1_eq, h2_eq, h1_wins, h2_wins, ties)
    """
    query = """
        INSERT INTO hand_scenarios
        (hand1, hand2, board, stage, hand1_equity, hand2_equity, hand1_wins, hand2_wins, ties)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    with conn.cursor() as cursor:
        execute_batch(cursor, query, scenarios_data)
    conn.commit()


def test_backend():
    """Test if backend is running."""
    try:
        response = requests.get(f'{BACKEND_URL}/health', timeout=5)
        response.raise_for_status()
        print(f"✓ Backend is running at {BACKEND_URL}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"✗ Cannot connect to backend at {BACKEND_URL}")
        print(f"  Error: {e}")
        print(f"  Make sure your C++ server is running on localhost:8080")
        return False


def test_database():
    """Test database connection."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.close()
        print(f"✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Cannot connect to database")
        print(f"  Error: {e}")
        print(f"  Check your .env file and DATABASE_URL")
        return False


def get_current_count(conn):
    """Get current number of scenarios in database."""
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM hand_scenarios")
        return cursor.fetchone()[0]


def main():
    parser = argparse.ArgumentParser(description='Precompute poker equity scenarios')
    parser.add_argument('--total', type=int, default=3000000,
                        help='Total number of scenarios to generate (default: 3000000)')
    parser.add_argument('--batch-size', type=int, default=1000,
                        help='Number of scenarios per DB insert (default: 1000)')
    args = parser.parse_args()

    total_scenarios = args.total
    batch_size = args.batch_size

    # Validate inputs
    if total_scenarios < 3:
        print("Error: --total must be at least 3 (one per stage)")
        sys.exit(1)

    if batch_size < 1:
        print("Error: --batch-size must be at least 1")
        sys.exit(1)

    print("=" * 60)
    print("Poker Equity Precomputation Script")
    print("=" * 60)
    print(f"Total scenarios: {total_scenarios:,}")
    print(f"Batch size: {batch_size:,}")
    print(f"Distribution: 1/3 preflop, 1/3 flop, 1/3 turn")
    print("=" * 60)

    # Check environment variables
    if not DATABASE_URL:
        print("\nError: DATABASE_URL not found in .env file")
        print("Please create a .env file with your database connection string")
        print("See .env.example for template")
        sys.exit(1)

    # Test connections
    print("\nTesting connections...")
    if not test_backend():
        sys.exit(1)
    if not test_database():
        sys.exit(1)

    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)

    # Check current count
    current_count = get_current_count(conn)
    if current_count > 0:
        print(f"\n⚠ Warning: Database already contains {current_count:,} scenarios")
        response = input("Continue and add more scenarios? (y/n): ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(0)

    print("\nStarting precomputation...\n")

    # Calculate scenarios per stage (1/3 each)
    scenarios_per_stage = total_scenarios // 3
    stages = ['preflop', 'flop', 'turn']

    # Adjust for any remainder
    stage_counts = {
        'preflop': scenarios_per_stage,
        'flop': scenarios_per_stage,
        'turn': scenarios_per_stage + (total_scenarios % 3)  # Add remainder to turn
    }

    total_processed = 0

    # Process each stage
    for stage in stages:
        count = stage_counts[stage]
        print(f"\n{'=' * 60}")
        print(f"Processing {stage.upper()} scenarios ({count:,})")
        print(f"{'=' * 60}")

        batch = []

        # Progress bar for this stage
        with tqdm(total=count, desc=f"{stage.capitalize()}", unit="scenarios") as pbar:
            for i in range(count):
                # Generate random scenario
                hand1, hand2, board, stage_name = generate_random_scenario(stage)

                # Calculate equity
                try:
                    result = calculate_equity(hand1, hand2, board)
                except Exception as e:
                    print(f"\nFailed to calculate equity, skipping scenario")
                    continue

                # Extract results
                h1_equity = result['equities'][0]
                h2_equity = result['equities'][1]
                h1_wins = result['wins'][0]
                h2_wins = result['wins'][1]
                ties = result['ties'][0]

                # Add to batch
                batch.append((
                    hand1, hand2, board, stage_name,
                    h1_equity, h2_equity,
                    h1_wins, h2_wins, ties
                ))

                # Insert batch when full
                if len(batch) >= batch_size:
                    insert_batch(conn, batch)
                    total_processed += len(batch)
                    batch = []
                    pbar.update(batch_size)

            # Insert remaining scenarios
            if batch:
                insert_batch(conn, batch)
                total_processed += len(batch)
                pbar.update(len(batch))

    # Close database connection
    conn.close()

    print(f"\n{'=' * 60}")
    print(f"✓ Precomputation complete!")
    print(f"  Total scenarios processed: {total_processed:,}")
    print(f"  Scenarios in database: {current_count + total_processed:,}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
