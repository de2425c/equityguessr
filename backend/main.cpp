#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include "include/httplib.h"
#include "include/json.hpp"
#include "omp/HandEvaluator.h"
#include "omp/EquityCalculator.h"

using json = nlohmann::json;
using namespace omp;

// Helper function to get hand category name
std::string getHandCategory(int ranking) {
    int category = ranking / 4096;
    switch(category) {
        case 0: return "High Card";
        case 1: return "Pair";
        case 2: return "Two Pair";
        case 3: return "Three of a Kind";
        case 4: return "Straight";
        case 5: return "Flush";
        case 6: return "Full House";
        case 7: return "Four of a Kind";
        case 8: return "Straight Flush";
        default: return "Unknown";
    }
}

int main() {
    httplib::Server svr;

    // CORS headers for web access
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "POST, GET, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type"}
    });

    // Handle OPTIONS requests for CORS
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204;
    });

    // Health check endpoint
    svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        json response = {{"status", "ok"}};
        res.set_content(response.dump(), "application/json");
    });

    // Equity calculation endpoint
    svr.Post("/equity", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);

            // Parse hands
            std::vector<std::string> hands;
            if (!body.contains("hands") || !body["hands"].is_array()) {
                res.status = 400;
                res.set_content("{\"error\": \"Missing or invalid 'hands' array\"}", "application/json");
                return;
            }

            for (const auto& hand : body["hands"]) {
                hands.push_back(hand.get<std::string>());
            }

            if (hands.size() < 2 || hands.size() > 6) {
                res.status = 400;
                res.set_content("{\"error\": \"Number of hands must be between 2 and 6\"}", "application/json");
                return;
            }

            // Parse board cards (optional)
            std::string board = body.value("board", "");
            uint64_t boardMask = board.empty() ? 0 : CardRange::getCardMask(board);

            // Parse dead cards (optional)
            std::string dead = body.value("dead", "");
            uint64_t deadMask = dead.empty() ? 0 : CardRange::getCardMask(dead);

            // Parse enumerate_all flag (optional, default true for <= 3 board cards)
            bool enumerateAll = body.value("enumerate_all", board.length() <= 6);

            // Create equity calculator
            EquityCalculator calc;

            // Convert hands to CardRange vector
            std::vector<CardRange> ranges;
            for (const auto& hand : hands) {
                ranges.push_back(CardRange(hand));
            }

            // Start calculation
            calc.start(ranges, boardMask, deadMask, enumerateAll);
            calc.wait();

            // Get results
            auto results = calc.getResults();

            // Build response
            json response;
            response["equities"] = json::array();
            response["wins"] = json::array();
            response["ties"] = json::array();

            for (size_t i = 0; i < hands.size(); i++) {
                response["equities"].push_back(results.equity[i]);
                response["wins"].push_back(results.wins[i]);
                response["ties"].push_back(results.ties[i]);
            }

            response["hands_evaluated"] = results.hands;
            response["speed"] = results.speed;
            response["enumerated_all"] = enumerateAll;

            res.set_content(response.dump(), "application/json");

        } catch (const std::exception& e) {
            res.status = 500;
            json error = {{"error", e.what()}};
            res.set_content(error.dump(), "application/json");
        }
    });

    // Hand evaluation endpoint
    svr.Post("/evaluate", [](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);

            if (!body.contains("hand")) {
                res.status = 400;
                res.set_content("{\"error\": \"Missing 'hand' field\"}", "application/json");
                return;
            }

            std::string handStr = body["hand"].get<std::string>();

            // Parse the hand string into individual cards
            // Format: "AhKhAcKcKs" or "Ah Kh Ac Kc Ks"
            std::vector<std::string> cards;
            std::string card;
            for (size_t i = 0; i < handStr.length(); i++) {
                if (handStr[i] == ' ') continue;

                card += handStr[i];
                if (card.length() == 2) {
                    cards.push_back(card);
                    card.clear();
                }
            }

            if (cards.empty() || cards.size() > 7) {
                res.status = 400;
                res.set_content("{\"error\": \"Hand must contain 0-7 cards\"}", "application/json");
                return;
            }

            // Build hand using OMPEval
            HandEvaluator eval;
            Hand h = Hand::empty();

            for (const auto& cardStr : cards) {
                uint64_t cardMask = CardRange::getCardMask(cardStr);
                // Convert mask to card index (0-51)
                int cardIndex = 0;
                for (int i = 0; i < 52; i++) {
                    if (cardMask & (1ULL << i)) {
                        cardIndex = i;
                        break;
                    }
                }
                h += Hand(cardIndex);
            }

            int ranking = eval.evaluate(h);
            std::string category = getHandCategory(ranking);

            json response = {
                {"ranking", ranking},
                {"category", category},
                {"num_cards", cards.size()}
            };

            res.set_content(response.dump(), "application/json");

        } catch (const std::exception& e) {
            res.status = 500;
            json error = {{"error", e.what()}};
            res.set_content(error.dump(), "application/json");
        }
    });

    std::cout << "Starting poker equity server on http://localhost:8080" << std::endl;
    std::cout << "Endpoints:" << std::endl;
    std::cout << "  POST /equity - Calculate hand equities" << std::endl;
    std::cout << "  POST /evaluate - Evaluate a poker hand" << std::endl;
    std::cout << "  GET  /health - Health check" << std::endl;

    svr.listen("0.0.0.0", 8080);

    return 0;
}
