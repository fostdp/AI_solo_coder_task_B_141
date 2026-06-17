#pragma once

#include "instrument_comparator.h"
#include "material_analyzer.h"

class InstrumentComparisonEngine {
public:
    InstrumentComparisonEngine() = default;

    ComparisonResult runInstrumentComparison(const ComparisonRequest& request) {
        return comparator_.runInstrumentComparison(request);
    }

    MaterialAnalysisResult runMaterialAnalysis(const MaterialAnalysisRequest& request) {
        return analyzer_.runMaterialAnalysis(request);
    }

private:
    InstrumentComparator comparator_;
    MaterialAnalyzer analyzer_;
};
