"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardBody, CardHeader, WorldMap } from "@/components/ui";

const regionActivity = [
  {
    id: "kaduna",
    name: "Kaduna, Nigeria",
    coordinates: [7.4388, 10.5105] as [number, number],
    region: "West Africa",
    crop: "Maize",
    season: "Rainy season",
    farmers: 124,
    deposits: 148000,
    progress: "62% seasonal progress",
  },
  {
    id: "nairobi",
    name: "Nairobi, Kenya",
    coordinates: [36.8219, -1.2921] as [number, number],
    region: "East Africa",
    crop: "Beans",
    season: "Dry season",
    farmers: 82,
    deposits: 91000,
    progress: "48% seasonal progress",
  },
  {
    id: "accra",
    name: "Accra, Ghana",
    coordinates: [-0.187, 5.6037] as [number, number],
    region: "West Africa",
    crop: "Cassava",
    season: "Harvest window",
    farmers: 67,
    deposits: 73500,
    progress: "74% seasonal progress",
  },
  {
    id: "kampala",
    name: "Kampala, Uganda",
    coordinates: [32.5825, 0.3476] as [number, number],
    region: "East Africa",
    crop: "Coffee",
    season: "Early planting",
    farmers: 53,
    deposits: 68000,
    progress: "39% seasonal progress",
  },
];

const filters = {
  region: ["All regions", "West Africa", "East Africa"],
  crop: ["All crops", "Maize", "Beans", "Cassava", "Coffee"],
  season: [
    "All seasons",
    "Rainy season",
    "Dry season",
    "Harvest window",
    "Early planting",
  ],
};

export function FarmActivityMap() {
  const [regionFilter, setRegionFilter] = useState("All regions");
  const [cropFilter, setCropFilter] = useState("All crops");
  const [seasonFilter, setSeasonFilter] = useState("All seasons");
  const [selectedId, setSelectedId] = useState<string>(regionActivity[0].id);

  const filteredActivity = useMemo(() => {
    return regionActivity.filter((item) => {
      const regionMatch =
        regionFilter === "All regions" || item.region === regionFilter;
      const cropMatch = cropFilter === "All crops" || item.crop === cropFilter;
      const seasonMatch =
        seasonFilter === "All seasons" || item.season === seasonFilter;
      return regionMatch && cropMatch && seasonMatch;
    });
  }, [cropFilter, regionFilter, seasonFilter]);

  const selectedRegion =
    filteredActivity.find((item) => item.id === selectedId) ??
    filteredActivity[0] ??
    null;

  return (
    <Card variant="default">
      <CardHeader
        title="Farm Activity Map"
        subtitle="Explore active vault regions, deposit momentum, and seasonal cycle progress."
        action={
          <Badge variant="info">{filteredActivity.length} active markers</Badge>
        }
      />
      <CardBody className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="h-10 rounded-lg border border-gray-300 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-harvest-green-500 focus:ring-2 focus:ring-harvest-green-200 dark:focus:ring-[rgba(74,222,128,0.1)]"
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
          >
            {filters.region.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-gray-300 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-harvest-green-500 focus:ring-2 focus:ring-harvest-green-200 dark:focus:ring-[rgba(74,222,128,0.1)]"
            value={cropFilter}
            onChange={(event) => setCropFilter(event.target.value)}
          >
            {filters.crop.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-gray-300 dark:border-[rgba(141,187,85,0.2)] bg-white dark:bg-[#1a3020] px-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-harvest-green-500 focus:ring-2 focus:ring-harvest-green-200 dark:focus:ring-[rgba(74,222,128,0.1)]"
            value={seasonFilter}
            onChange={(event) => setSeasonFilter(event.target.value)}
          >
            {filters.season.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <WorldMap
            className="min-h-[360px]"
            markers={filteredActivity.map((item) => ({
              id: item.id,
              coordinates: item.coordinates,
              name: item.name,
              activity: "vault",
            }))}
            onMarkerClick={(marker) => setSelectedId(marker.id)}
          />

          <div className="rounded-2xl border border-gray-200 dark:border-[rgba(141,187,85,0.15)] bg-gray-50 dark:bg-[#162a1a] p-5">
            {selectedRegion ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Selected region
                  </p>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedRegion.name}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white dark:bg-[#1a3020] border border-transparent dark:border-[rgba(141,187,85,0.1)] p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active farmers</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedRegion.farmers}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-[#1a3020] border border-transparent dark:border-[rgba(141,187,85,0.1)] p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Vault deposits</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ${selectedRegion.deposits.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Crop focus:
                    </span>{" "}
                    {selectedRegion.crop}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Season:</span>{" "}
                    {selectedRegion.season}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      Progress:
                    </span>{" "}
                    {selectedRegion.progress}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No activity matches the selected filters.
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
