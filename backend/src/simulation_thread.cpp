#include "simulation_thread.h"

SimulationThread::SimulationThread() = default;

SimulationThread::~SimulationThread() {
    stop();
}

void SimulationThread::start() {
    if (running_.exchange(true)) {
        return;
    }
    worker_thread_ = std::thread(&SimulationThread::workerLoop, this);
}

void SimulationThread::stop() {
    if (!running_.exchange(false)) {
        return;
    }
    condition_.notify_all();
    if (worker_thread_.joinable()) {
        worker_thread_.join();
    }
}

bool SimulationThread::isRunning() const {
    return running_.load();
}

size_t SimulationThread::pendingTasks() const {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    return task_queue_.size();
}

size_t SimulationThread::completedTasks() const {
    return completed_count_.load();
}

void SimulationThread::workerLoop() {
    while (running_.load()) {
        std::unique_ptr<TaskBase> task;
        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            condition_.wait(lock, [this] {
                return !task_queue_.empty() || !running_.load();
            });
            if (!running_.load() && task_queue_.empty()) {
                break;
            }
            task = std::move(task_queue_.front());
            task_queue_.pop();
        }
        if (task) {
            task->execute();
            completed_count_++;
        }
    }
}

std::future<SimulationResult> SimulationThread::runSimulation(
    const SimulationParameters& params) {

    return enqueueTask<SimulationResult>([this, params]() {
        return simulation_engine_.runSimulation(params);
    });
}

std::future<ComparisonResult> SimulationThread::runComparison(
    const ComparisonRequest& request) {

    return enqueueTask<ComparisonResult>([this, request]() {
        return instrument_comparator_.runInstrumentComparison(request);
    });
}

std::future<MaterialAnalysisResult> SimulationThread::runMaterialAnalysis(
    const MaterialAnalysisRequest& request) {

    return enqueueTask<MaterialAnalysisResult>([this, request]() {
        return material_analyzer_.runMaterialAnalysis(request);
    });
}

std::future<LocalizationResult> SimulationThread::runLocalization(
    const std::vector<StationConfig>& stations,
    const std::vector<StationReading>& readings) {

    return enqueueTask<LocalizationResult>([this, stations, readings]() {
        return network_localizer_.localize(stations, readings);
    });
}
