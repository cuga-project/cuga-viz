// @ts-nocheck
import React, { useState, useEffect } from "react";
import { fetchDataTable, fetchStatsTables } from "../services/api";
import { AccuracyChart, StatsSection, ResultsTable } from "./dashboard/index";
import Header from "./Header";
import WebArenaStatistics from "./dashboard/WebArena";
import { Link, useNavigate } from "react-router-dom";

// Enhanced Accuracy Chart that conditionally renders based on URL parameter
const MyChart = ({ data, isLoading }) => {
  const [showWebArena, setShowWebArena] = useState(false);

  useEffect(() => {
    // Check URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const benchmark = urlParams.get("benchmark");
    setShowWebArena(benchmark === "webarena");
  }, []);

  // If benchmark=webarena is in URL, show WebArena statistics
  if (showWebArena) {
    return <WebArenaStatistics />;
  }

  // Otherwise, show the original accuracy chart
  return <AccuracyChart data={data} isLoading={isLoading} />;
};

/**
 * Main dashboard component that orchestrates the different sections
 */
const ResultsDashboard = () => {
  const navigate = useNavigate();
  // Primary state
  const [historyData, setHistoryData] = useState([]);
  const [resultsData, setResultsData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [statsTables, setStatsTables] = useState([]);
  const [columnConfig, setColumnConfig] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Generate dummy history data for the chart
        const startDate = new Date("2023-09-01");
        const dummyHistoryData = generateHistoryData(startDate);
        setHistoryData(dummyHistoryData);

        const params = new URLSearchParams(window.location.search);
        const experimentName = params.get("experiment") || undefined;

        // Fetch actual data from API
        const response = await fetchDataTable(experimentName);

        // Assume the API response includes both data and column configuration
        const { data, columnConfig, columns: apiColumns } = response;

        setResultsData(data);
        setColumnConfig(columnConfig || {}); // Set column config from API
        setColumns(apiColumns || Object.keys(data[0] || {}));

        const statsTablesData = await fetchStatsTables(experimentName);
        setStatsTables(statsTablesData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const experimentName = new URLSearchParams(window.location.search).get("experiment");

  return (
    <div className="App">
      <div className="bg-gray-50 min-h-screen p-6">
        <Header currentView="Dashboard" />
        
        {experimentName && (
          <div
            style={{
              margin: "12px 0",
              padding: "16px 20px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Experiment
                </div>
                <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827", marginTop: "2px" }}>
                  {experimentName}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "12px 0 16px 0",
            padding: "10px 12px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 10px",
              backgroundColor: "#fff",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <nav style={{ fontSize: "0.9rem", color: "#374151" }}>
            <Link to="/" style={{ color: "#2563eb", textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 8px", color: "#9ca3af" }}>/</span>
            <span>Dashboard</span>
            {experimentName && (
              <>
                <span style={{ margin: "0 8px", color: "#9ca3af" }}>/</span>
                <span>{experimentName}</span>
              </>
            )}
          </nav>
        </div>
        <div className="max-w-9xl mx-auto">
          {/* <h1 className="text-3xl font-bold text-gray-800 mb-8">Cuga Visualizer</h1> */}

          {/* Accuracy Chart Section */}
          {/* <div className="bg-white p-6 rounded-lg shadow-md mb-8"> */}
          {/* <h2 className="text-xl font-semibold text-gray-700 mb-4">Accuracy Over Time</h2> */}

          {/* <MyChart data={historyData} isLoading={isLoading} /> */}

          {/* <StatsSection statsTables={statsTables} /> */}
          {/* </div> */}

          {/* Results Table Section */}
          <ResultsTable
            data={resultsData}
            columns={columns}
            isLoading={isLoading}
            columnConfig={columnConfig} // Pass the column config here
            experimentName={new URLSearchParams(window.location.search).get("experiment") || undefined}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Generates dummy history data for the chart
 */
function generateHistoryData(startDate) {
  const newDate = (date, increase) => {
    const currentDate = new Date(date);
    currentDate.setDate(date.getDate() + increase * 24);
    return currentDate.toISOString();
  };

  return [
    { timestamp: newDate(startDate, 2), accuracy: 0.12, sample_size: 15 },
    { timestamp: newDate(startDate, 5), accuracy: 0.15, sample_size: 30 },
    { timestamp: newDate(startDate, 4), accuracy: 0.22, sample_size: 44 },
    { timestamp: newDate(startDate, 3), accuracy: 0.5, sample_size: 44 },
    { timestamp: newDate(startDate, 5), accuracy: 0.65, sample_size: 44 },
    { timestamp: newDate(startDate, 3), accuracy: 0.4, sample_size: 90 },
    { timestamp: newDate(startDate, 4), accuracy: 0.5, sample_size: 90 },
    { timestamp: newDate(startDate, 3), accuracy: 0.63, sample_size: 90 },
    { timestamp: newDate(startDate, 5), accuracy: 0.38, sample_size: 812 },
    { timestamp: newDate(startDate, 3), accuracy: 0.4, sample_size: 812 },
    { timestamp: newDate(startDate, 5), accuracy: 0.41, sample_size: 812 },
    { timestamp: newDate(startDate, 4), accuracy: 0.45, sample_size: 812 },
    { timestamp: newDate(startDate, 5), accuracy: 0.5, sample_size: 812 },
    { timestamp: newDate(startDate, 6), accuracy: 0.53, sample_size: 812 },
    { timestamp: newDate(startDate, 8), accuracy: 0.55, sample_size: 812 },
    { timestamp: newDate(startDate, 9), accuracy: 0.617, sample_size: 812 },
  ];
}

export default ResultsDashboard;
