cmake_minimum_required(VERSION 3.15)
project(PokerEquityBackend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/lib/OMPEval
)

# OMPEval source files
set(OMPEVAL_SRCS
    lib/OMPEval/omp/CardRange.cpp
    lib/OMPEval/omp/CombinedRange.cpp
    lib/OMPEval/omp/EquityCalculator.cpp
    lib/OMPEval/omp/HandEvaluator.cpp
)

# Create OMPEval static library
add_library(ompeval STATIC ${OMPEVAL_SRCS})
target_include_directories(ompeval PUBLIC ${CMAKE_SOURCE_DIR}/lib/OMPEval)

# Enable optimizations for OMPEval
target_compile_options(ompeval PRIVATE -O3 -Wall)

# Main executable
add_executable(poker_server main.cpp)

# Link libraries
find_package(Threads REQUIRED)
target_link_libraries(poker_server ompeval Threads::Threads)

# Enable optimizations for main server
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_options(poker_server PRIVATE -O3)
endif()
