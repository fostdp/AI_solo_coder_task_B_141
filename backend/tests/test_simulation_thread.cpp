#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "test_utils.h"
#include "simulation_thread.h"
#include <cmath>
#include <algorithm>
#include <chrono>
#include <thread>
#include <vector>
#include <atomic>

using namespace test_utils;

class TestSimulationThread : public DidongyiTestBase {
protected:
    void SetUp() override {
        DidongyiTestBase::SetUp();
    }

    void TearDown() override {
    }
};

TEST_F(TestSimulationThread, Normal_StartStop) {
    SimulationThread thread;

    EXPECT_FALSE(thread.isRunning());
    thread.start();
    EXPECT_TRUE(thread.isRunning());
    thread.stop();
    EXPECT_FALSE(thread.isRunning());
}

TEST_F(TestSimulationThread, Normal_RunSimulationAsyncFuture) {
    SimulationThread thread;
    thread.start();

    SimulationParameters params = defaultParams;
    params.magnitude = 5.0;
    params.distance = 100.0;
    params.duration = 1.0;

    std::future<SimulationResult> future = thread.runSimulation(params);

    auto status = future.wait_for(std::chrono::seconds(5));
    EXPECT_EQ(status, std::future_status::ready);

    SimulationResult result = future.get();
    EXPECT_GE(result.max_angle, 0.0);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_TaskQueueInitiallyEmpty) {
    SimulationThread thread;
    thread.start();

    EXPECT_EQ(thread.pendingTasks(), 0u);
    EXPECT_EQ(thread.completedTasks(), 0u);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_MultipleTasksConcurrent) {
    SimulationThread thread;
    thread.start();

    std::vector<std::future<SimulationResult>> futures;
    const int num_tasks = 5;

    for (int i = 0; i < num_tasks; ++i) {
        SimulationParameters params = defaultParams;
        params.magnitude = 4.0 + i * 0.5;
        params.duration = 0.5;
        futures.push_back(thread.runSimulation(params));
    }

    for (auto& f : futures) {
        auto status = f.wait_for(std::chrono::seconds(10));
        EXPECT_EQ(status, std::future_status::ready);
    }

    EXPECT_GE(thread.completedTasks(), num_tasks);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_RunComparisonAsync) {
    SimulationThread thread;
    thread.start();

    ComparisonRequest request = comparisonRequest;
    request.magnitude_steps = 3;
    request.distance_steps = 3;
    request.monte_carlo_trials = 2;

    std::future<ComparisonResult> future = thread.runComparison(request);

    auto status = future.wait_for(std::chrono::seconds(15));
    EXPECT_EQ(status, std::future_status::ready);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_RunMaterialAnalysisAsync) {
    SimulationThread thread;
    thread.start();

    MaterialAnalysisRequest request = materialAnalysisRequest;
    request.trials = 2;

    std::future<MaterialAnalysisResult> future = thread.runMaterialAnalysis(request);

    auto status = future.wait_for(std::chrono::seconds(10));
    EXPECT_EQ(status, std::future_status::ready);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_RunLocalizationAsync) {
    SimulationThread thread;
    thread.start();

    auto stations = generateTestStations(5);
    auto readings = generateTestReadings(stations, 35.0, 110.0);

    std::future<LocalizationResult> future = thread.runLocalization(stations, readings);

    auto status = future.wait_for(std::chrono::seconds(5));
    EXPECT_EQ(status, std::future_status::ready);

    thread.stop();
}

TEST_F(TestSimulationThread, Normal_CompletedTasksIncrements) {
    SimulationThread thread;
    thread.start();

    SimulationParameters params = defaultParams;
    params.duration = 0.5;

    size_t initial_completed = thread.completedTasks();

    auto future = thread.runSimulation(params);
    future.wait_for(std::chrono::seconds(5));

    EXPECT_GT(thread.completedTasks(), initial_completed);

    thread.stop();
}

TEST_F(TestSimulationThread, Boundary_StartIdempotent) {
    SimulationThread thread;

    thread.start();
    bool first = thread.isRunning();

    thread.start();
    bool second = thread.isRunning();

    EXPECT_EQ(first, second);
    EXPECT_TRUE(second);

    thread.stop();
}

TEST_F(TestSimulationThread, Boundary_StopIdempotent) {
    SimulationThread thread;
    thread.start();
    thread.stop();

    EXPECT_FALSE(thread.isRunning());

    thread.stop();
    EXPECT_FALSE(thread.isRunning());
}

TEST_F(TestSimulationThread, Boundary_StopWithoutStart) {
    SimulationThread thread;

    EXPECT_NO_THROW({
        thread.stop();
    }) << "未启动时stop不应崩溃";

    EXPECT_FALSE(thread.isRunning());
}

TEST_F(TestSimulationThread, Boundary_ManyTasksQueued) {
    SimulationThread thread;
    thread.start();

    const int num_tasks = 20;
    std::vector<std::future<SimulationResult>> futures;
    futures.reserve(num_tasks);

    for (int i = 0; i < num_tasks; ++i) {
        SimulationParameters params = defaultParams;
        params.magnitude = 3.0;
        params.duration = 0.3;
        futures.push_back(thread.runSimulation(params));
    }

    for (auto& f : futures) {
        auto status = f.wait_for(std::chrono::seconds(30));
        EXPECT_EQ(status, std::future_status::ready);
    }

    EXPECT_GE(thread.completedTasks(), num_tasks);

    thread.stop();
}

TEST_F(TestSimulationThread, Boundary_DestructorStopsThread) {
    {
        SimulationThread thread;
        thread.start();
        SimulationParameters params = defaultParams;
        params.duration = 0.5;
        thread.runSimulation(params);
    }

    SUCCEED();
}

TEST_F(TestSimulationThread, Boundary_StartStopRapidStartStop) {
    SimulationThread thread;

    for (int i = 0; i < 5; ++i) {
        thread.start();
        EXPECT_TRUE(thread.isRunning());
        thread.stop();
        EXPECT_FALSE(thread.isRunning());
    }
}

TEST_F(TestSimulationThread, Abnormal_SubmitTaskBeforeStart) {
    SimulationThread thread;

    SimulationParameters params = defaultParams;
    params.duration = 0.5;

    std::future<SimulationResult> future = thread.runSimulation(params);

    thread.start();

    auto status = future.wait_for(std::chrono::seconds(5));
    EXPECT_EQ(status, std::future_status::ready);

    thread.stop();
}

TEST_F(TestSimulationThread, Abnormal_SubmitTaskAfterStop) {
    SimulationThread thread;
    thread.start();
    thread.stop();

    SimulationParameters params = defaultParams;
    params.duration = 0.5;

    std::future<SimulationResult> future = thread.runSimulation(params);

    auto status = future.wait_for(std::chrono::milliseconds(100));
    EXPECT_EQ(status, std::future_status::timeout);

    thread.start();

    status = future.wait_for(std::chrono::seconds(5));
    EXPECT_EQ(status, std::future_status::ready);

    thread.stop();
}

TEST_F(TestSimulationThread, Abnormal_FutureGetWithoutWait) {
    SimulationThread thread;
    thread.start();

    SimulationParameters params = defaultParams;
    params.duration = 0.5;

    std::future<SimulationResult> future = thread.runSimulation(params);

    SimulationResult result = future.get();
    EXPECT_GE(result.max_angle, 0.0);

    thread.stop();
}

TEST_F(TestSimulationThread, Abnormal_DestroyRunningWithPendingTasks) {
    {
        SimulationThread thread;
        thread.start();

        const int num_tasks = 10;
        for (int i = 0; i < num_tasks; ++i) {
            SimulationParameters params = defaultParams;
            params.magnitude = 6.0;
            params.duration = 0.5;
            thread.runSimulation(params);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    SUCCEED();
}

TEST_F(TestSimulationThread, Abnormal_MixedTaskTypes) {
    SimulationThread thread;
    thread.start();

    SimulationParameters sim_params = defaultParams;
    sim_params.duration = 0.5;

    auto f1 = thread.runSimulation(sim_params);

    ComparisonRequest comp_request = comparisonRequest;
    comp_request.magnitude_steps = 2;
    comp_request.distance_steps = 2;
    comp_request.monte_carlo_trials = 1;
    auto f2 = thread.runComparison(comp_request);

    auto f1.wait_for(std::chrono::seconds(10));
    auto f2.wait_for(std::chrono::seconds(15));

    EXPECT_TRUE(f1.valid());
    EXPECT_TRUE(f2.valid());

    thread.stop();
}
