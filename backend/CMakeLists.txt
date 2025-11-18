cmake_minimum_required(VERSION 3.15)
project(PokerEquityBackend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add OMPEval library
add_subdirectory(lib/OMPEval)

# Include directories
include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/lib/OMPEval
)

# Main executable
add_executable(poker_server main.cpp)

# Link OMPEval
target_link_libraries(poker_server omp pthread)

# Enable optimizations
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_compile_options(poker_server PRIVATE -O3)
endif()
