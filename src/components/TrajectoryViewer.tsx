// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchTrajectoryData, fetchConfig, echoQuestion, updateConfig } from "../services/api";
import StepView from "./StepView";
import Header from "./Header";
import SequenceFlow from "./ProcessSummary";
import { parseJsonSafely } from "../utils/renderHelpers";

// Helper function to extract interesting values from JSON data
const extractInterestingValues = (jsonData: any, interestingKeysConfig: string[]) => {
  if (!jsonData || typeof jsonData !== "object" || !interestingKeysConfig || interestingKeysConfig.length === 0) {
    return [];
  }

  const foundKeys = [];
  const findKeys = (obj: any, path: string = "") => {
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      if (interestingKeysConfig.includes(key) || interestingKeysConfig.includes(currentPath)) {
        if (value !== null) {
          foundKeys.push({ key: key, path: currentPath, value: value });
        }
      }
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        findKeys(value, currentPath);
      }
    });
  };

  findKeys(jsonData);
  return foundKeys;
};

// Helper function to get the first non-null string value from step-specific keys
const getProcessNameFromStep = (stepData: any, stepName: string, processConfig: any) => {
  console.log("stepData", stepData);
  if (!stepData || !processConfig || !stepName) {
    return stepData?.name || "Unknown Step";
  }
  console.log("processConfig", processConfig);
  console.log("stepName", stepName);
  // Get the specific keys for this step type
  const stepKeysConfig = processConfig[stepName];
  if (!stepKeysConfig || !Array.isArray(stepKeysConfig)) {
    return null;
  }
  const json_text = parseJsonSafely(stepData.data);

  const interestingValues = extractInterestingValues(json_text, stepKeysConfig);
  console.log("interesting values: ", interestingValues);
  // Find the first string value that's not empty
  for (const item of interestingValues) {
    if (typeof item.value === "string" && item.value.trim()) {
      // If it's a long string, truncate it for the process name
      return item.value;
    }
  }

  // Fallback to step name
  return null;
};

function TrajectoryViewer() {
  const { taskId, experiment } = useParams();
  const navigate = useNavigate();
  const [trajectoryData, setTrajectoryData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState<any>({});

  // Process summary panel state
  const [showProcessSummary, setShowProcessSummary] = useState(false);

  // Generic filter state
  const [filters, setFilters] = useState({
    stepTypes: [],
    hideImages: false,
  });

  // Track expanded image IDs
  const [expandedImages, setExpandedImages] = useState(new Set());

  // Track collapsed steps (steps that should be collapsed)
  const [collapsedSteps, setCollapsedSteps] = useState(new Set());

  // Handle image toggle
  const toggleImage = (imageId: string) => {
    setExpandedImages((prevExpanded) => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(imageId)) {
        newExpanded.delete(imageId);
      } else {
        newExpanded.add(imageId);
      }
      return newExpanded;
    });
  };

  // Handle step collapse toggle
  const toggleStepCollapse = (stepIndex: number) => {
    setCollapsedSteps((prevCollapsed) => {
      const newCollapsed = new Set(prevCollapsed);
      if (newCollapsed.has(stepIndex)) {
        newCollapsed.delete(stepIndex);
      } else {
        newCollapsed.add(stepIndex);
      }
      return newCollapsed;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch both trajectory data and configuration in parallel
        const [data, configData] = await Promise.all([fetchTrajectoryData(taskId + "", experiment as string | undefined), fetchConfig()]);
        console.log(data);
        setTrajectoryData(data);
        setConfig(configData);

        // Initialize step type filters if data exists
        if (data && data.steps) {
          const uniqueStepTypes = [...new Set(data.steps.map((step: any) => step.name))];
          setFilters((prev: any) => ({
            ...prev,
            stepTypes: uniqueStepTypes, // Initially show all step types
          }));

          // Collapse all api_response steps by default
          const apiResponseIndices = new Set(
            data.steps
              .map((step: any, index: number) => (step.name === "api_response" ? index : null))
              .filter((index: number | null) => index !== null)
          );
          setCollapsedSteps(apiResponseIndices);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, [taskId, experiment]);

  // Function to update configuration
  const handleConfigUpdate = async (stepType: string, configChanges: any) => {
    try {
      // Update local state first for immediate feedback
      const newConfig = {
        ...config,
        stepsConfig: {
          ...config.stepsConfig,
          [stepType]: {
            ...config.stepsConfig?.[stepType],
            ...configChanges,
          },
        },
      };

      setConfig(newConfig);

      // Then persist to the server
      await updateConfig(newConfig);
    } catch (err) {
      console.error("Failed to update configuration:", err);
      // Optionally show an error message to the user
    }
  };

  // Generic filter handling
  const toggleStepTypeFilter = (stepType: string) => {
    setFilters((prev: any) => {
      const currentStepTypes = prev.stepTypes;
      const newStepTypes = currentStepTypes.includes(stepType)
        ? currentStepTypes.filter((type: string) => type !== stepType)
        : [...currentStepTypes, stepType];

      return {
        ...prev,
        stepTypes: newStepTypes,
      };
    });
  };

  const toggleAllStepTypes = (allStepTypes: any) => {
    setFilters((prev: any) => {
      // If all are currently selected, deselect all; otherwise select all
      const newStepTypes = prev.stepTypes.length === allStepTypes.length ? [] : [...allStepTypes];

      return {
        ...prev,
        stepTypes: newStepTypes,
      };
    });
  };

  // Chat assistant state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Function to handle question submission
  const handleQuestionSubmit = async (e: any) => {
    e.preventDefault();

    if (!question.trim()) return;

    const userQuestion = question.trim();
    setQuestion("");

    // Add user message to chat
    //@ts-ignore
    setChatHistory((prev: any) => [...prev, { role: "user", content: userQuestion }]);

    // Call API
    setIsLoading(true);
    try {
      const response = await echoQuestion(userQuestion, taskId + "");

      // Add assistant response to chat
      // @ts-ignore
      setChatHistory((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      console.error("Error getting response:", error);
      // @ts-ignore
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom of chat when history updates
  useEffect(() => {
    // @ts-ignore
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Toggle chat panel
  const toggleChatPanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Generate process names from trajectory data for SequenceFlow using processConfig
  const getProcessNames = () => {
    if (!trajectoryData?.steps) return [];

    const processConfig = config?.processConfig || {};

    return trajectoryData.steps
      .map((step: any) => getProcessNameFromStep(step, step.name, processConfig))
      .filter((name) => name !== null && name !== undefined);
  };

  // Render interesting keys function (extracted from your original code)

  if (loading) return <div className="loading">Loading trajectory data...</div>;
  if (error) return <div className="error">Error loading trajectory: {error}</div>;
  if (!trajectoryData) return <div className="error">No trajectory data found</div>;

  // Get all available step types for filtering UI
  //@ts-ignore
  const allStepTypes = trajectoryData.steps
    ? //@ts-ignore
      [...new Set(trajectoryData.steps.map((step) => step.name))]
    : [];

  // Filter steps based on selected types
  //@ts-ignore
  const filteredSteps = trajectoryData.steps.filter((step) =>
    //@ts-ignore
    filters.stepTypes.includes(step.name)
  );

  return (
    <div className="App">
      <div className="tbg-gray-50 min-h-screen p-6" style={{ display: "flex", width: "100%" }}>
        {/* Main content area */}
        <div
          style={{
            flex: showProcessSummary ? "1" : "1",
            width: showProcessSummary ? "70%" : "100%",
            transition: "all 0.3s ease",
            overflow: "auto",
          }}
        >
          <Header currentView={`Trajectory Viewer${experiment ? ` — ${experiment}` : ""}`} />
          
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
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              {experiment && (
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
                      {experiment}
                    </div>
                  </div>
                </div>
              )}
              
              {experiment && taskId && (
                <div
                  style={{
                    width: "1px",
                    height: "40px",
                    backgroundColor: "#e5e7eb",
                  }}
                />
              )}
              
              {taskId && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: "#10b981",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Task ID
                    </div>
                    <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827", marginTop: "2px" }}>
                      {taskId}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "0 0 12px 0",
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
              <Link to={`/dashboard${experiment ? `?experiment=${encodeURIComponent(experiment)}` : ""}`} style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
              {experiment && (
                <>
                  <span style={{ margin: "0 8px", color: "#9ca3af" }}>/</span>
                  <span>{experiment}</span>
                </>
              )}
              {taskId && (
                <>
                  <span style={{ margin: "0 8px", color: "#9ca3af" }}>/</span>
                  <span>Task {taskId}</span>
                </>
              )}
            </nav>
          </div>
          <div className="trajectory-viewer">
            <div
              style={{
                marginBottom: "24px",
                padding: "24px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#6b7280",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    📋 Task Intent
                  </label>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1.125rem",
                      fontWeight: "500",
                      color: "#111827",
                      lineHeight: "1.75",
                      wordWrap: "break-word",
                    }}
                  >
                    {trajectoryData?.intent || "No intent specified"}
                  </p>
                </div>

                {/* Process Summary Button */}
                <button
                  onClick={() => setShowProcessSummary(!showProcessSummary)}
                  style={{
                    flexShrink: 0,
                    padding: "10px 20px",
                    backgroundColor: showProcessSummary ? "#22c55e" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: showProcessSummary
                      ? "0 1px 3px rgba(34, 197, 94, 0.3)"
                      : "0 1px 3px rgba(59, 130, 246, 0.3)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = showProcessSummary
                      ? "0 4px 8px rgba(34, 197, 94, 0.3)"
                      : "0 4px 8px rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = showProcessSummary
                      ? "0 1px 3px rgba(34, 197, 94, 0.3)"
                      : "0 1px 3px rgba(59, 130, 246, 0.3)";
                  }}
                >
                  {showProcessSummary ? "Hide Process Summary" : "Show Process Summary"}
                </button>
              </div>
            </div>

            {/* Generic Filter Panel */}
            <div
              className="filter-panel"
              style={{
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Filters
                </h3>

                <button
                  onClick={() => toggleAllStepTypes(allStepTypes)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    backgroundColor: filters.stepTypes.length === allStepTypes.length ? "#f3f4f6" : "#3b82f6",
                    color: filters.stepTypes.length === allStepTypes.length ? "#374151" : "#ffffff",
                    border: "1px solid",
                    borderColor: filters.stepTypes.length === allStepTypes.length ? "#d1d5db" : "#3b82f6",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {filters.stepTypes.length === allStepTypes.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Step Types
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {allStepTypes.map((stepType, index) => {
                    const isSelected = filters.stepTypes.includes(stepType);
                    return (
                      <label
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "10px 12px",
                          backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                          border: "1px solid",
                          borderColor: isSelected ? "#3b82f6" : "#d1d5db",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          color: isSelected ? "#1e40af" : "#374151",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = "#f9fafb";
                            e.target.style.borderColor = "#9ca3af";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = "#ffffff";
                            e.target.style.borderColor = "#d1d5db";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStepTypeFilter(stepType)}
                          style={{
                            marginRight: "8px",
                            accentColor: "#3b82f6",
                            transform: "scale(1.1)",
                          }}
                        />
                        {stepType}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Configuration controls */}
            {false && (
              <div className="config-panel" style={{ marginBottom: "20px" }}>
                <details>
                  <summary>Step Configuration</summary>
                  <div
                    className="config-form"
                    style={{
                      padding: "15px",
                      backgroundColor: "#f8f8f8",
                      borderRadius: "5px",
                    }}
                  >
                    <h4>Step Type Styling</h4>
                    <div>
                      {Object.entries(config?.stepsConfig || {})
                        .filter(([key]) => key !== "default")
                        .map(([stepType, stepConfig]: [string, any]) => (
                          <div
                            key={stepType}
                            style={{
                              marginBottom: "15px",
                              padding: "10px",
                              border: "1px solid #ddd",
                              borderRadius: "5px",
                            }}
                          >
                            <h5>{stepType}</h5>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "10px",
                              }}
                            >
                              {/* Background Color */}
                              <div>
                                <label htmlFor={`${stepType}-bg-color`}>Background Color:</label>
                                <input
                                  id={`${stepType}-bg-color`}
                                  type="color"
                                  value={stepConfig.backgroundColor || "#ffffff"}
                                  onChange={(e) =>
                                    handleConfigUpdate(stepType, {
                                      backgroundColor: e.target.value,
                                    })
                                  }
                                  style={{ marginLeft: "10px" }}
                                />
                              </div>

                              {/* Expandable Toggle */}
                              <div>
                                <label htmlFor={`${stepType}-expandable`}>
                                  <input
                                    id={`${stepType}-expandable`}
                                    type="checkbox"
                                    checked={stepConfig.expandable || false}
                                    onChange={(e) =>
                                      handleConfigUpdate(stepType, {
                                        expandable: e.target.checked,
                                      })
                                    }
                                    style={{ marginRight: "10px" }}
                                  />
                                  Expandable Text
                                </label>
                              </div>

                              {/* Show Image (for PlannerAgent) */}
                              {stepType === "PlannerAgent" && (
                                <div>
                                  <label htmlFor={`${stepType}-render-image`}>
                                    <input
                                      id={`${stepType}-render-image`}
                                      type="checkbox"
                                      checked={stepConfig.renderImage || false}
                                      onChange={(e) =>
                                        handleConfigUpdate(stepType, {
                                          renderImage: e.target.checked,
                                        })
                                      }
                                      style={{ marginRight: "10px" }}
                                    />
                                    Show Images
                                  </label>
                                </div>
                              )}

                              {/* Show URL (for PlannerAgent) */}
                              {stepType === "PlannerAgent" && (
                                <div>
                                  <label htmlFor={`${stepType}-show-url`}>
                                    <input
                                      id={`${stepType}-show-url`}
                                      type="checkbox"
                                      checked={stepConfig.showCurrentUrl || false}
                                      onChange={(e) =>
                                        handleConfigUpdate(stepType, {
                                          showCurrentUrl: e.target.checked,
                                        })
                                      }
                                      style={{ marginRight: "10px" }}
                                    />
                                    Show URLs
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* Render steps */}
            <div>
              {filteredSteps.map((step: any, index: number) => {
                const originalIndex = trajectoryData.steps.findIndex((s: any) => s === step);
                return (
                  <StepView
                    key={index}
                    step={step}
                    index={index}
                    config={config?.stepsConfig || {}}
                    expandedImages={expandedImages}
                    toggleImage={toggleImage}
                    isCollapsed={collapsedSteps.has(originalIndex)}
                    onToggleCollapse={() => toggleStepCollapse(originalIndex)}
                  />
                );
              })}
            </div>
            {/* Render score and evaluation (if not light version) */}
            {!trajectoryData.light_version && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600"> Score</p>
                      <p className="text-2xl font-bold text-slate-900">{trajectoryData.score}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Process Summary Panel */}
        {showProcessSummary && (
          <div
            style={{
              width: "30%",
              height: "100vh",
              borderLeft: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              position: "sticky",
              top: 0,
              overflow: "auto",
              zIndex: 10,
              boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f8f9fa",
                position: "sticky",
                top: 0,
                zIndex: 11,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#212529",
                }}
              >
                Process Summary
              </h3>
              <p
                style={{
                  margin: "5px 0 0 0",
                  fontSize: "0.875rem",
                  color: "#6c757d",
                }}
              >
                Visual flow of trajectory steps
              </p>
            </div>
            <SequenceFlow processes={getProcessNames()} />
          </div>
        )}

        {/* Chat Assistant button */}
        {/* <button className="chat-assistant-button" onClick={toggleChatPanel}>
          {isPanelOpen ? "Close Assistant" : "Open Assistant"}
        </button> */}

        {/* Chat Assistant Slide Panel */}
        <div className={`chat-slide-panel ${isPanelOpen ? "open" : ""}`}>
          <div className="chat-header">
            <h3>Cuga Assistant</h3>
            <button className="close-button" onClick={toggleChatPanel}>
              ×
            </button>
          </div>

          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-chat-message">Ask me a question about your trajectory data!</div>
            ) : (
              chatHistory.map((msg: any, index) => (
                <div key={index} className={`chat-message ${msg.role}`}>
                  <span className="message-role">{msg.role === "user" ? "You" : "Assistant"}</span>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="chat-message assistant loading">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleQuestionSubmit}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !question.trim()}>
              Send
            </button>
          </form>
        </div>
        {/* <SidePanel component={<AgentFlowExample />} position="left"></SidePanel> */}
        {/* Add some CSS for the slide panel */}
        <style>{`
        .chat-assistant-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 16px;
          background-color: #4a6cf7;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .chat-slide-panel {
          position: fixed;
          top: 0;
          right: -400px;
          width: 380px;
          height: 100%;
          background-color: white;
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
          transition: right 0.3s ease;
          display: flex;
          flex-direction: column;
          z-index: 1000;
        }

        .chat-slide-panel.open {
          right: 0;
        }

        .chat-header {
          padding: 15px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header h3 {
          margin: 0;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 22px;
          cursor: pointer;
          color: #666;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty-chat-message {
          color: #888;
          text-align: center;
          margin: auto 0;
        }

        .chat-message {
          padding: 10px 14px;
          border-radius: 8px;
          max-width: 85%;
          position: relative;
        }

        .chat-message.user {
          background-color: #e6f2ff;
          align-self: flex-end;
        }

        .chat-message.assistant {
          background-color: #f0f0f0;
          align-self: flex-start;
        }

        .message-role {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          display: block;
        }

        .chat-input-form {
          display: flex;
          padding: 10px;
          border-top: 1px solid #eee;
          gap: 10px;
        }

        .chat-input-form input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          outline: none;
        }

        .chat-input-form button {
          padding: 10px 16px;
          background-color: #4a6cf7;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .chat-input-form button:disabled {
          background-color: #a0a0a0;
          cursor: not-allowed;
        }

        .loading-dots span {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #888;
          margin: 0 3px;
          animation: pulse 1.4s infinite ease-in-out;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(0.5);
            opacity: 0.5;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      </div>
    </div>
  );
}

export default TrajectoryViewer;
