#!/usr/bin/env python3
"""
API server for fetching poker scenarios from PostgreSQL database.
Provides endpoints for the infinite equity guessing game.
"""

import os
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import math

# Load environment variables
load_dotenv('./.env')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    """Create a new database connection."""
    # Check if running on Cloud Run
    if os.getenv('K_SERVICE'):
        # Running on Cloud Run - use Unix socket
        db_user = "postgres"
        db_pass = "Captain15!"
        db_name = "poker_equity"
        db_socket_dir = "/cloudsql"
        cloud_sql_connection_name = "equityguesser:us-central1:poker-equity-db"

        return psycopg2.connect(
            user=db_user,
            password=db_pass,
            database=db_name,
            host=f"{db_socket_dir}/{cloud_sql_connection_name}",
            cursor_factory=RealDictCursor
        )
    else:
        # Running locally - use TCP connection
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def calculate_target_equity(streak):
    """
    Calculate the target equity range based on the current streak.
    Formula: 0.5 + 0.5 * e^(-0.25 * streak)

    This gives us the equity for the WEAKER hand:
    - Streak 0: 1.0 (100% - very easy, one hand dominates)
    - Streak 5: ~0.71 (71% for weaker hand)
    - Streak 10: ~0.54 (54% for weaker hand)
    - Streak 15: ~0.51 (51% for weaker hand - almost 50/50)
    """
    return 0.5 + 0.5 * math.exp(-0.25 * streak)

def parse_card_code(card_code):
    """Convert card code like 'Ah' to {rank: 'A', suit: 'h', code: 'Ah'}"""
    if len(card_code) != 2:
        return None
    rank = card_code[0]
    suit = card_code[1]
    # Convert T to 10 for display
    display_rank = '10' if rank == 'T' else rank
    return {
        'rank': display_rank,
        'suit': suit,
        'code': card_code
    }

def parse_hand(hand_code):
    """Convert hand like 'AhKh' to array of card objects"""
    if len(hand_code) != 4:
        return []
    card1 = parse_card_code(hand_code[0:2])
    card2 = parse_card_code(hand_code[2:4])
    return [card1, card2] if card1 and card2 else []

def parse_board(board_code):
    """Convert board like '2c4c5h' to array of card objects"""
    cards = []
    for i in range(0, len(board_code), 2):
        if i + 1 < len(board_code):
            card = parse_card_code(board_code[i:i+2])
            if card:
                cards.append(card)
    return cards

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

@app.route('/scenario', methods=['GET'])
def get_scenario():
    """
    Get a random scenario based on difficulty.
    Query params:
    - streak: current win streak (default 0)
    """
    try:
        streak = int(request.args.get('streak', 0))

        # Calculate target equity for the weaker hand
        target_equity = calculate_target_equity(streak)

        # Create equity range with ±5% window (or tighter for harder levels)
        # As difficulty increases, we want more precise equity matching
        if streak < 10:
            equity_window = 0.05
        elif streak < 20:
            equity_window = 0.03
        else:
            equity_window = 0.02

        min_equity = max(0, target_equity - equity_window)
        max_equity = min(1, target_equity + equity_window)

        # For very easy levels (streak 0-2), we want clear favorites
        if streak <= 2:
            min_equity = 0.70  # Weaker hand has at least 70% chance
            max_equity = 1.0    # Could be up to 100%

        conn = get_db_connection()
        cur = conn.cursor()

        # Query for a random scenario where the WEAKER hand (hand2) is in our equity range
        # We're assuming hand1_equity >= hand2_equity in the database
        # IMPORTANT: Exclude true 50/50 equities (both hands within 0.49-0.51)
        # Bias: 42.5% flop, 42.5% turn, 15% preflop
        rand_val = random.random()
        if rand_val < 0.425:
            # 42.5% chance: flop
            query = """
                SELECT * FROM hand_scenarios
                WHERE stage = 'flop'
                  AND hand2_equity >= %s
                  AND hand2_equity <= %s
                  AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                           AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                ORDER BY RANDOM()
                LIMIT 1;
            """
        elif rand_val < 0.85:
            # 42.5% chance: turn
            query = """
                SELECT * FROM hand_scenarios
                WHERE stage = 'turn'
                  AND hand2_equity >= %s
                  AND hand2_equity <= %s
                  AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                           AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                ORDER BY RANDOM()
                LIMIT 1;
            """
        else:
            # 15% chance: preflop
            query = """
                SELECT * FROM hand_scenarios
                WHERE stage = 'preflop'
                  AND hand2_equity >= %s
                  AND hand2_equity <= %s
                  AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                           AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                ORDER BY RANDOM()
                LIMIT 1;
            """

        cur.execute(query, (min_equity, max_equity))
        result = cur.fetchone()

        if not result:
            # Fallback: get any scenario if none found in range
            # Maintain the same bias: 42.5% flop, 42.5% turn, 15% preflop
            # Still exclude true 50/50 equities
            rand_val = random.random()
            if rand_val < 0.425:
                fallback_query = """
                    SELECT * FROM hand_scenarios
                    WHERE stage = 'flop'
                      AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                               AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                    ORDER BY RANDOM()
                    LIMIT 1;
                """
            elif rand_val < 0.85:
                fallback_query = """
                    SELECT * FROM hand_scenarios
                    WHERE stage = 'turn'
                      AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                               AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                    ORDER BY RANDOM()
                    LIMIT 1;
                """
            else:
                fallback_query = """
                    SELECT * FROM hand_scenarios
                    WHERE stage = 'preflop'
                      AND NOT (hand1_equity >= 0.49 AND hand1_equity <= 0.51
                               AND hand2_equity >= 0.49 AND hand2_equity <= 0.51)
                    ORDER BY RANDOM()
                    LIMIT 1;
                """
            cur.execute(fallback_query)
            result = cur.fetchone()

        cur.close()
        conn.close()

        if not result:
            return jsonify({'error': 'No scenarios found'}), 404

        # Randomly decide which hand to show as hand1 vs hand2 (for variety)
        swap_hands = random.random() < 0.5

        if swap_hands:
            hand1 = parse_hand(result['hand2'])
            hand2 = parse_hand(result['hand1'])
            hand1_equity = result['hand2_equity']
            hand2_equity = result['hand1_equity']
        else:
            hand1 = parse_hand(result['hand1'])
            hand2 = parse_hand(result['hand2'])
            hand1_equity = result['hand1_equity']
            hand2_equity = result['hand2_equity']

        # Parse board cards
        community = parse_board(result['board'])

        response = {
            'hand1': hand1,
            'hand2': hand2,
            'community': community,
            'stage': result['stage'],
            'hand1_equity': float(hand1_equity),
            'hand2_equity': float(hand2_equity),
            'target_equity': target_equity,
            'actual_weaker_equity': min(float(hand1_equity), float(hand2_equity))
        }

        return jsonify(response)

    except Exception as e:
        print(f"Error fetching scenario: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get database statistics."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get total count and breakdown by stage
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN stage = 'preflop' THEN 1 END) as preflop,
                COUNT(CASE WHEN stage = 'flop' THEN 1 END) as flop,
                COUNT(CASE WHEN stage = 'turn' THEN 1 END) as turn
            FROM hand_scenarios;
        """)

        result = cur.fetchone()
        cur.close()
        conn.close()

        return jsonify({
            'total_scenarios': result['total'],
            'preflop_count': result['preflop'],
            'flop_count': result['flop'],
            'turn_count': result['turn']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Get port from environment variable (Cloud Run sets this)
    port = int(os.environ.get('PORT', 8080))

    print("Starting Poker Scenario API Server")
    print(f"Database: {DATABASE_URL.split('@')[1] if DATABASE_URL else 'Not configured'}")
    print("\nEndpoints:")
    print("  GET /scenario?streak=X - Get random scenario for difficulty")
    print("  GET /health - Health check")
    print("  GET /stats - Database statistics")
    print(f"\nServer running on port {port}")

    # Bind to 0.0.0.0 for Cloud Run, disable debug in production
    app.run(host='0.0.0.0', port=port, debug=False)