include(FetchContent)

set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
set(BUILD_GMOCK ON CACHE BOOL "" FORCE)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
    GIT_SHALLOW TRUE
)

FetchContent_MakeAvailable(googletest)

include(GoogleTest)

set(TEST_SOURCES_COMMON
    test_main.cpp
)

add_executable(test_instrument_comparison
    ${TEST_SOURCES_COMMON}
    test_instrument_comparison.cpp
)
target_link_libraries(test_instrument_comparison PRIVATE
    gtest_main
    gmock
    didongyi_core
)
gtest_discover_tests(test_instrument_comparison)

add_executable(test_material_analysis
    ${TEST_SOURCES_COMMON}
    test_material_analysis.cpp
)
target_link_libraries(test_material_analysis PRIVATE
    gtest_main
    gmock
    didongyi_core
)
gtest_discover_tests(test_material_analysis)

add_executable(test_network_localizer
    ${TEST_SOURCES_COMMON}
    test_network_localizer.cpp
)
target_link_libraries(test_network_localizer PRIVATE
    gtest_main
    gmock
    didongyi_core
)
gtest_discover_tests(test_network_localizer)

add_executable(test_simulation_engine
    ${TEST_SOURCES_COMMON}
    test_simulation_engine.cpp
)
target_link_libraries(test_simulation_engine PRIVATE
    gtest_main
    gmock
    didongyi_core
)
gtest_discover_tests(test_simulation_engine)
