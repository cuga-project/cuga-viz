import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchLoggedExperiments,
  joinExperiments,
  deleteExperiment,
  downloadExperiment,
  fetchUncompletedTasks,
  fetchFailedTasks,
} from "../services/api";
import Header from "./Header";
import "./ExperimentManager.css";

interface Experiment {
  name: string;
  path: string;
  total_tasks: number;
  completed_tasks: number;
  tasks_passed: number;
  tasks_failed_score_0: string[];
  errored_tasks: number;
  uncompleted_task_ids: string[];
  created_at: number;
  error?: string;
}

const ExperimentManager: React.FC = () => {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Record<string, Experiment>>({});
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUncompletedTasks, setShowUncompletedTasks] = useState<string | null>(null);
  const [showFailedTasks, setShowFailedTasks] = useState<string | null>(null);
  const [currentModalData, setCurrentModalData] = useState<any[]>([]);
  const [currentExperimentName, setCurrentExperimentName] = useState<string>("");
  const [splitCount, setSplitCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: 15,
  });
  
  const [isDemoMode, setIsDemoMode] = useState(true);

  const itemsPerPage = 15;

  // Function to remove timestamp from experiment name
  const removeTimestamp = (experimentName: string): string => {
    // Pattern to match timestamp: _DD-MM--HHhMMmSSsSSms
    const timestampPattern = /_\d{2}-\d{2}--\d{2}h\d{2}m\d{2}s\d{3}ms$/;
    return experimentName.replace(timestampPattern, "");
  };

  // Function to split array into chunks
  const splitArray = (array: any[], numSplits: number): any[][] => {
    if (numSplits <= 1) return [array];

    const chunkSize = Math.ceil(array.length / numSplits);
    const chunks: any[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  };

  // Function to generate variable assignment string
  const generateVariableString = (experimentName: string, tasks: any[], splits: number): string => {
    const cleanName = removeTimestamp(experimentName);

    if (splits <= 1) {
      return `${cleanName} = ${JSON.stringify(tasks, null)}`;
    }

    const splitTasks = splitArray(tasks, splits);
    const suffixes = "abcdefghijklmnopqrstuvwxyz";

    return splitTasks
      .map((chunk, index) => {
        const suffix = index < suffixes.length ? suffixes[index] : index.toString();
        return `${cleanName}_${suffix} = ${JSON.stringify(chunk, null)}`;
      })
      .join("\n\n");
  };

  const loadLoggedExperiments = async (page = 1, query = "") => {
    setLoading(true);
    try {
      const data = await fetchLoggedExperiments(page, itemsPerPage, query);
      setExperiments(data.experiments || {});
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error loading experiments:", error);
    } finally {
      setLoading(false);
    }
  };

  

  

  useEffect(() => {
    loadLoggedExperiments(currentPage, searchQuery);

    const interval = setInterval(() => {
      loadLoggedExperiments(currentPage, searchQuery);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPage, searchQuery]);

  const handleJoinExperiments = async () => {
    if (selectedExperiments.length < 2) return;
    const newName = prompt("Enter name for the joined experiment:");
    if (!newName) return;

    try {
      setLoading(true);
      await joinExperiments(selectedExperiments, newName);
      setSelectedExperiments([]);
      await loadLoggedExperiments(1, ""); // Refresh to first page
    } catch (error) {
      console.error("Error joining experiments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExperiments = async () => {
    if (selectedExperiments.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedExperiments.length} experiment(s)?`)) return;

    try {
      setLoading(true);
      await deleteExperiment(selectedExperiments);
      setSelectedExperiments([]);
      await loadLoggedExperiments(currentPage, searchQuery);
    } catch (error) {
      console.error("Error deleting experiments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExperiment = async (experimentName: string) => {
    try {
      const blob = await downloadExperiment(experimentName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${experimentName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Error downloading experiment:", error);
    }
  };

  const showUncompletedTasksDialog = async (experimentName: string) => {
    try {
      const data = await fetchUncompletedTasks(experimentName);
      setCurrentModalData(data.uncompleted_tasks || []);
      setCurrentExperimentName(experimentName);
      setShowUncompletedTasks(experimentName);
      setSplitCount(1);
    } catch (error) {
      console.error("Error loading uncompleted tasks:", error);
    }
  };

  const showFailedTasksDialog = async (experimentName: string) => {
    try {
      const data = await fetchFailedTasks(experimentName);
      setCurrentModalData(data.failed_tasks || []);
      setCurrentExperimentName(experimentName);
      setShowFailedTasks(experimentName);
      setSplitCount(1);
    } catch (error) {
      console.error("Error loading failed tasks:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleCopyToClipboard = () => {
    const content = generateVariableString(currentExperimentName, currentModalData, splitCount);
    navigator.clipboard.writeText(content);
  };

  const closeModal = () => {
    setShowUncompletedTasks(null);
    setShowFailedTasks(null);
    setCurrentModalData([]);
    setCurrentExperimentName("");
    setSplitCount(1);
  };

  const Progress = ({ completed, total }: { completed: number; total: number }) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    return (
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-bar-inner" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  const memoizedExperiments = useMemo(() => Object.entries(experiments), [experiments]);

  return (
    <div className="App">
      <div style={{ minHeight: "100vh", padding: "24px", backgroundColor: "#f9fafb" }}>
        <Header currentView="Home" />
        
        <div
          style={{
            margin: "12px 0 20px 0",
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
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Cuga Visualizer
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "600", color: "#111827", marginTop: "2px" }}>
                Experiment Management
              </div>
            </div>
          </div>
        </div>
        
        <div className="experiment-manager">
          <div className="header">
            <h1>Experiments</h1>
            <div className="controls">
          <button onClick={() => setIsDemoMode(!isDemoMode)} className={isDemoMode ? "active" : ""}>
            {isDemoMode ? "Card View" : "Table View"}
          </button>
          <button onClick={() => loadLoggedExperiments(currentPage, searchQuery)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={handleJoinExperiments} disabled={selectedExperiments.length < 2 || loading}>
            Join ({selectedExperiments.length})
          </button>
          <button
            onClick={handleDeleteExperiments}
            disabled={selectedExperiments.length === 0 || loading}
            className="danger"
          >
            Delete ({selectedExperiments.length})
          </button>
        </div>
      </div>

      <div className="search-pagination">
        <input
          type="text"
          placeholder="Search experiments by name..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        <div className="pagination">
          <button onClick={handlePreviousPage} disabled={currentPage === 1 || loading}>
            Previous
          </button>
          <span>
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <button onClick={handleNextPage} disabled={currentPage === pagination.total_pages || loading}>
            Next
          </button>
        </div>
      </div>

      {isDemoMode ? (
        <div className="experiments-table-container">
          <table className="experiments-table">
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={
                      memoizedExperiments.length > 0 &&
                      selectedExperiments.length === memoizedExperiments.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExperiments(memoizedExperiments.map(([name]) => name));
                      } else {
                        setSelectedExperiments([]);
                      }
                    }}
                  />
                </th>
                <th>Name</th>
                <th>Progress</th>
                <th>Total</th>
                <th>Completed</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Errors</th>
                <th>Created</th>
                <th>Dashboard</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memoizedExperiments.map(([name, experiment]) => (
                <tr key={name} className={experiment.error ? "error-row" : ""}>
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedExperiments.includes(name)}
                      onChange={(e) => {
                        const newSelected = e.target.checked
                          ? [...selectedExperiments, name]
                          : selectedExperiments.filter((n) => n !== name);
                        setSelectedExperiments(newSelected);
                      }}
                    />
                  </td>
                  <td className="name-column">{name}</td>
                  <td className="progress-column">
                    {!experiment.error && (
                      <div className="table-progress-bar">
                        <div
                          className="table-progress-fill"
                          style={{
                            width: `${experiment.total_tasks > 0 ? (experiment.completed_tasks / experiment.total_tasks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td>{!experiment.error ? experiment.total_tasks : "-"}</td>
                  <td>{!experiment.error ? experiment.completed_tasks : "-"}</td>
                  <td className="success-text">{!experiment.error ? experiment.tasks_passed : "-"}</td>
                  <td className="danger-text">
                    {!experiment.error ? experiment.tasks_failed_score_0.length : "-"}
                  </td>
                  <td className="warning-text">{!experiment.error ? experiment.errored_tasks : "-"}</td>
                  <td className="date-column">{formatDate(experiment.created_at)}</td>
                  <td className="dashboard-column">
                    <button
                      className="dashboard-control-btn start"
                      onClick={() => navigate(`/dashboard?experiment=${encodeURIComponent(name)}`)}
                      disabled={loading}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                      Open
                    </button>
                  </td>
                  <td className="actions-column">
                    <div className="table-actions">
                      <button
                        className="table-action-btn"
                        onClick={() => handleDownloadExperiment(name)}
                        title="Download"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7,10 12,15 17,10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        className="table-action-btn"
                        onClick={() => showUncompletedTasksDialog(name)}
                        title="Uncompleted"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </button>
                      <button
                        className="table-action-btn"
                        onClick={() => showFailedTasksDialog(name)}
                        title="Failed"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="experiments-list">
          {memoizedExperiments.map(([name, experiment]) => (
            <div key={name} className={`experiment-card ${experiment.error ? "error" : ""}`}>
              <div className="experiment-header">
                <div className="experiment-header-left">
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedExperiments.includes(name)}
                      onChange={(e) => {
                        const newSelected = e.target.checked
                          ? [...selectedExperiments, name]
                          : selectedExperiments.filter((n) => n !== name);
                        setSelectedExperiments(newSelected);
                      }}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <h3 className="experiment-title">{name}</h3>
                </div>

                <div className="experiment-actions">
                  <button className="action-btn download-btn" onClick={() => handleDownloadExperiment(name)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                  <button className="action-btn uncompleted-btn" onClick={() => showUncompletedTasksDialog(name)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Uncompleted
                  </button>
                  <button className="action-btn failed-btn" onClick={() => showFailedTasksDialog(name)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Failed
                  </button>
                  <button
                    className="action-btn dashboard-btn"
                    onClick={() => navigate(`/dashboard?experiment=${encodeURIComponent(name)}`)}
                    disabled={loading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="9" y2="15" />
                      <line x1="15" y1="9" x2="15" y2="15" />
                    </svg>
                    Open Dashboard
                  </button>
                </div>
              </div>
              {!experiment.error ? (
                <>
                  <Progress completed={experiment.completed_tasks} total={experiment.total_tasks} />
                  <div className="experiment-stats">
                    <div className="stat">
                      <span className="label">Total Tasks</span>
                      <span className="value">{experiment.total_tasks}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Completed</span>
                      <span className="value">{experiment.completed_tasks}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Passed</span>
                      <span className="value green">{experiment.tasks_passed}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Failed</span>
                      <span className="value red">{experiment.tasks_failed_score_0.length}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Errors</span>
                      <span className="value orange">{experiment.errored_tasks}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Created On</span>
                      <span className="value">{formatDate(experiment.created_at)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="error-message">
                  <strong>Error:</strong> {experiment.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(showUncompletedTasks || showFailedTasks) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {showUncompletedTasks ? "Uncompleted Tasks" : "Failed Tasks"}
                <span className="task-count"> ({currentModalData.length} tasks)</span>
              </h3>
              <button onClick={closeModal}>×</button>
            </div>
            <div className="modal-controls">
              <label>
                Split into:
                <input
                  type="number"
                  min="1"
                  max="26"
                  value={splitCount}
                  onChange={(e) => setSplitCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ marginLeft: "8px", width: "60px" }}
                />
                parts
              </label>
            </div>
            <div className="modal-body">
              <pre>{generateVariableString(currentExperimentName, currentModalData, splitCount)}</pre>
              <button onClick={handleCopyToClipboard}>Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default ExperimentManager;
