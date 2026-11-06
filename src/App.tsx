import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import TrajectoryViewer from "./components/TrajectoryViewer";
import ResultsDashboard from "./components/Dashboard";
import ExperimentManager from "./components/ExperimentManager";
import CompareExperiments from "./components/CompareExperiments";
import { Workspace } from "./components/Workspace";

function TraceRoute() {
  const { pathname } = useLocation();
  return <TrajectoryViewer key={pathname} />;
}

function App() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Workspace selected={selected} />}>
          <Route path="/" element={<ExperimentManager selected={selected} setSelected={setSelected} />} />
          <Route path="/experiments" element={<Navigate to="/" replace />} />
          <Route path="/compare" element={<CompareExperiments />} />
          <Route path="/dashboard" element={<ResultsDashboard />} />
          <Route path="/trajectories/:experiment/:taskId" element={<TraceRoute />} />
          <Route path="/trajectories/:taskId" element={<TraceRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
