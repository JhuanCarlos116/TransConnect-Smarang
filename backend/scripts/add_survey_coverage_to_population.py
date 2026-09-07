"""Tags each kelurahan polygon in kelurahan_population.geojson with how many
of the team's 42 surveyed halte fall inside it.

This exists so the dashboard can flag Tandang -- the one kelurahan (of the 9
in scope) with zero surveyed points, a real gap in field coverage, not a
bug -- directly on the population popup that already shows per-kelurahan
info. Recomputed from halte-survey.geojson rather than hardcoded so it stays
correct if/when the survey expands.

Usage:
    python scripts/add_survey_coverage_to_population.py
"""

import json
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HALTE_SURVEY = REPO_ROOT / "frontend" / "public" / "data" / "halte-survey.geojson"
POPULATION_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "kelurahan_population.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "kelurahan_population.geojson",
]


def main() -> None:
    halte = json.loads(HALTE_SURVEY.read_text(encoding="utf-8"))
    counts = Counter(f["properties"]["kelurahan"] for f in halte["features"])
    print(f"Surveyed halte per kelurahan: {dict(counts)}")

    population = json.loads(POPULATION_PATHS[0].read_text(encoding="utf-8"))
    zero_coverage = []
    for feature in population["features"]:
        name = feature["properties"]["kelurahan"]
        count = counts.get(name, 0)
        feature["properties"]["halte_survey_count"] = count
        if count == 0:
            zero_coverage.append(name)

    if zero_coverage:
        print(f"Zero survey coverage: {zero_coverage}")

    for out_path in POPULATION_PATHS:
        out_path.write_text(json.dumps(population, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
