#pragma once

#include <thread>
#include <future>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <functional>
#include <memory>
#include <vector>
#include <string>

#include "simulation_engine.h"
#include "instrument_comparator.h"
#include "material_analyzer.h"
#include "network_localizer.h"

class SimulationThread {
public:
    SimulationThread();
    ~SimulationThread();

    SimulationThread(const SimulationThread&) = delete;
    SimulationThread& operator=(const SimulationThread&) = delete;

    void start();
    void stop();
    bool isRunning() const;

    std::future<SimulationResult> runSimulation(const SimulationParameters& params);
    std::future<ComparisonResult> runComparison(const ComparisonRequest& request);
    std::future<MaterialAnalysisResult> runMaterialAnalysis(const MaterialAnalysisRequest& request);
    std::future<LocalizationResult> runLocalization(
        const std::vector<StationConfig>& stations,
        const std::vector<StationReading>& readings);

    size_t pendingTasks() const;
    size_t completedTasks() const;

private:
    struct TaskBase {
        virtual ~TaskBase() = default;
        virtual void execute() = 0;
    };

    template<typename ResultType>
    struct Task : TaskBase {
        std::promise<ResultType> promise;
        std::function<ResultType()> func;

        Task(std::function<ResultType()> f) : func(std::move(f)) {}

        void execute() override {
            try {
                promise.set_value(func());
            } catch (...) {
                promise.set_exception(std::current_exception());
            }
        }
    };

    mutable std::mutex queue_mutex_;
    std::queue<std::unique_ptr<TaskBase>> task_queue_;
    std::condition_variable condition_;
    std::atomic<bool> running_{false};
    std::atomic<size_t> completed_count_{0};
    std::thread worker_thread_;

    SimulationEngine simulation_engine_;
    InstrumentComparator instrument_comparator_;
    MaterialAnalyzer material_analyzer_;
    NetworkLocalizer network_localizer_;

    void workerLoop();

    template<typename ResultType>
    std::future<ResultType> enqueueTask(std::function<ResultType()> func) {
        auto task = std::make_unique<Task<ResultType>>(std::move(func));
        auto future = task->promise.get_future();
        {
            std::lock_guard<std::mutex> lock(queue_mutex_);
            task_queue_.push(std::move(task));
        }
        condition_.notify_one();
        return future;
    }
};
