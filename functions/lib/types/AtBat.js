"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeScoredRunners = normalizeScoredRunners;
function normalizeScoredRunners(raw) {
    if (!Array.isArray(raw) || raw.length === 0)
        return [];
    const first = raw[0];
    if (typeof first === 'object' && first !== null && 'runnerId' in first && 'isRBI' in first) {
        return raw;
    }
    return raw.map((runnerId) => ({ runnerId, isRBI: true }));
}
//# sourceMappingURL=AtBat.js.map