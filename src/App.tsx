import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import TrajectoryViewer from "./components/TrajectoryViewer";
import ResultsDashboard from "./components/Dashboard";
import ExperimentManager from "./components/ExperimentManager";

// import MinimalChartTest from "./MinimalChart";
// import Demo from "./Demo";

function App() {
  return (
    <Router>
      <main>
        <Routes>
          <Route path="/trajectories/:experiment/:taskId" element={<TrajectoryViewer />} />
          <Route path="/trajectories/:taskId" element={<TrajectoryViewer />} />
          <Route path="/dashboard" element={<ResultsDashboard />} />
          <Route path="/" element={<ExperimentManager />} />
          <Route path="/experiments" element={<Navigate to="/" replace />} />

          {/* <Route
              path="/"
              element={
                <div>
                  Please provide a task ID in the URL: /trajectories/
                  {"{taskId}"}
                </div>
              }
            /> */}
        </Routes>
      </main>
    </Router>
  );
}

export default App;
