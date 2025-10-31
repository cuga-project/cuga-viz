// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  Legend,
} from "recharts";

const AccuracyChart = ({ experiments = [] }) => {
  // Sample data if none provided
  const sampleData = [
    {
      timestamp: "2025-05-15",
      name: "initial_tests",
      metrics: { success_rate: 0.03, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 5,
    },
    {
      timestamp: "2025-05-17",
      name: "initial_tests_v2",
      metrics: { success_rate: 0.2, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 10,
    },
    {
      timestamp: "2025-05-22",
      name: "initial_tests_v2",
      metrics: { success_rate: 0.15, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 10,
    },
    {
      timestamp: "2025-06-01",
      name: "micro",
      metrics: { success_rate: 0.3, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 12,
    },
    {
      timestamp: "2025-06-8",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.1, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 25,
    },
    {
      timestamp: "2025-06-9",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.25, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-9",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.3, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-09T15:30:00+03:00",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.3, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-10T13:30:00+03:00",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.38, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-13T13:30:00+03:00",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.67, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-14T13:30:00+03:00",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.75, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-14T18:30:00+03:00",
      name: "spotify_single_easy",
      metrics: { success_rate: 0.84, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 24,
    },
    {
      timestamp: "2025-06-18T18:30:00+03:00",
      name: "train_single_easy",
      metrics: { success_rate: 0.88, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 36,
    },
    {
      timestamp: "2025-06-20T18:30:00+03:00",
      name: "train_medium",
      metrics: { success_rate: 0.1, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 36,
    },
    {
      timestamp: "2025-06-22T22:30:00+03:00",
      name: "train_medium",
      metrics: { success_rate: 0.25, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 36,
    },
    {
      timestamp: "2025-06-27T22:30:00+03:00",
      name: "train_medium",
      description: "Train medium level tasks of total 36 tasks with multi apps",
      metrics: { success_rate: 0.75, completion_rate: 0.0, task_completion_rate: 0.0, conversion_rate: 0.0 },
      number_of_items: 36,
    },
  ];

  const data = experiments.length > 0 ? experiments : sampleData;

  // Get all available metrics dynamically
  const availableMetrics = useMemo(() => {
    if (data.length === 0) return [];
    const allMetrics = new Set();
    data.forEach((experiment) => {
      Object.keys(experiment.metrics).forEach((metric) => allMetrics.add(metric));
    });
    return Array.from(allMetrics);
  }, [data]);

  const [selectedMetric, setSelectedMetric] = useState(availableMetrics[0] || "success_rate");

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return data
      .filter((experiment) => experiment.metrics[selectedMetric] !== undefined)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((experiment, index) => ({
        ...experiment,
        date: new Date(experiment.timestamp).getTime(),
        dateFormatted: new Date(experiment.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
        selectedMetricValue: experiment.metrics[selectedMetric] * 100, // Convert to percentage
        size: experiment.number_of_items,
        color: `hsl(${(index / Math.max(data.length - 1, 1)) * 280}, 65%, 55%)`,
        index,
      }));
  }, [data, selectedMetric]);

  // Format functions
  const formatMetricName = (metric) => {
    return metric
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatMetric = (value) => {
    if (value === undefined || value === null) return "N/A";
    return typeof value === "number" ? `${value.toFixed(1)}%` : value;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-6 max-w-lg">
          <div className="font-bold text-gray-800 text-lg mb-8">{data.name}</div>
          <div className="text-sm text-gray-600 mb-2">
            <strong>Date:</strong>{" "}
            {new Date(data.timestamp).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="text-sm text-gray-600 mb-3">
            <strong>Sample Size:</strong> {data.number_of_items.toLocaleString()} items
          </div>

          <div className="border-t pt-2">
            <div className="text-sm font-semibold text-gray-800 mb-2">All Metrics:</div>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div
                  key={key}
                  className={`text-sm flex justify-between ${
                    selectedMetric === key ? "font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded" : "text-gray-600"
                  }`}
                >
                  <span>{formatMetricName(key)}:</span>
                  <span>{formatMetric(value * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot component for scatter plot
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;

    // Scale the size based on number_of_items
    const maxSize = Math.max(...chartData.map((d) => d.size));
    const minSize = Math.min(...chartData.map((d) => d.size));
    const sizeRange = maxSize - minSize || 1;
    const radius = 8 + ((payload.size - minSize) / sizeRange) * 20;

    return (
      <g>
        {/* Glow effect */}
        <circle cx={cx} cy={cy} r={radius + 3} fill={payload.color} opacity="0.2" />
        {/* Main bubble */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={payload.color}
          stroke={payload.color}
          strokeWidth="2"
          style={{
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
            cursor: "pointer",
          }}
        />
        {/* Experiment name label */}
        <text
          x={cx}
          y={cy - radius - 8}
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-700 pointer-events-none"
          style={{ textShadow: "0 1px 2px rgba(255,255,255,0.8)" }}
        >
          {payload.name.length > 15 ? payload.name.substring(0, 15) + "..." : payload.name}
        </text>
      </g>
    );
  };

  // Custom axis formatters
  const formatXAxisTick = (tickItem) => {
    return new Date(tickItem).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatYAxisTick = (tickItem) => {
    return `${tickItem.toFixed(1)}%`;
  };

  return (
    <div className="">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Cuga Experiments Visualizer</h2>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-gray-600 mr-3">Y-Axis Metric:</span>
          {availableMetrics.map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedMetric === metric
                  ? "bg-blue-500 text-white shadow-md transform scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
              }`}
            >
              {formatMetricName(metric)}
            </button>
          ))}
        </div>
      </div>

      {/* Combined Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData} margin={{ top: 40, right: 40, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />

            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatXAxisTick}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#9ca3af", strokeWidth: 2 }}
              tickLine={{ stroke: "#9ca3af" }}
            />

            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tickFormatter={formatYAxisTick}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#9ca3af", strokeWidth: 2 }}
              tickLine={{ stroke: "#9ca3af" }}
              label={{
                value: formatMetricName(selectedMetric),
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "#374151", fontWeight: "bold" },
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Trend Line */}
            <Line
              type="monotone"
              dataKey="selectedMetricValue"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={false}
            />

            {/* Scatter points for bubbles */}
            <Line
              type="monotone"
              dataKey="selectedMetricValue"
              stroke="transparent"
              strokeWidth={0}
              dot={<CustomDot />}
              activeDot={false}
            />

            {/* Gradient definition for line */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      {/* Current Experiment Title with Animation */}
      {chartData.length > 0 && chartData[chartData.length - 1].description && (
        <div className="mb-6 relative" style={{ marginTop: "15px" }}>
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 p-0.5 rounded-xl animate-pulse">
            <div className="bg-white rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Current Experiment: {chartData[chartData.length - 1].description}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600 mb-1">Total Experiments</div>
          <div className="text-2xl font-bold text-blue-800">{chartData.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600 mb-1">Current {formatMetricName(selectedMetric)}</div>
          <div className="text-2xl font-bold text-green-800">
            {chartData.length > 0 ? `${chartData[chartData.length - 1].selectedMetricValue}%` : "N/A"}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600 mb-1">Total Sample Size</div>
          <div className="text-2xl font-bold text-purple-800">
            {chartData.reduce((sum, d) => sum + d.size, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
              <span>Bubble size = Sample size</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
              <span>Trend line shows metric progression</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full border">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span>Hover bubbles for detailed metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccuracyChart;
