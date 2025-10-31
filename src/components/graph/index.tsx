// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import Header from "../Header";

interface Note {
  description: string;
  input: string;
  output: string;
  details?: string;
}

interface NodeData {
  id: string;
  label: string;
  note: Note;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  note: Note;
}

interface GraphData {
  nodes: { data: NodeData }[];
  edges: { data: EdgeData }[];
}

interface NodePositions {
  [key: string]: { x: number; y: number };
}

interface AgentFlowVisualizerProps {
  graphData: GraphData;
  positions?: NodePositions;
  height?: string;
  colorScheme?: {
    nodeBackground: string;
    nodeBorder: string;
    specialNodeBackground: string;
    specialNodeBorder: string;
    edgeColor: string;
    highlightColor: string;
  };
}

const defaultColorScheme = {
  nodeBackground: "#E6E6FA", // Light lavender
  nodeBorder: "#9370DB", // Medium purple
  specialNodeBackground: "#B19CD9", // Lighter purple
  specialNodeBorder: "#483D8B", // Dark slate blue
  edgeColor: "#999",
  highlightColor: "#4CAF50", // Green
};

const AgentFlowVisualizer: React.FC<AgentFlowVisualizerProps> = ({
  graphData,
  positions,
  height = "700px",
  colorScheme = defaultColorScheme,
}) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [flowIndexes, setFlowIndexes] = useState<number[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [currentElementLabel, setCurrentElementLabel] = useState("");
  const [totalSteps, setTotalSteps] = useState(0);

  // Extract significant paths from the graph
  const findSignificantPaths = (edges: { data: EdgeData }[]) => {
    // This is a simplification - you could implement more complex path finding logic
    // For now, we'll just use all edges as steps in the flow
    return Array.from({ length: edges.length }, (_, i) => i);
  };

  useEffect(() => {
    if (!cyRef.current) return;

    // Initialize Cytoscape
    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements: [...graphData.nodes, ...graphData.edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": colorScheme.nodeBackground,
            color: "#000",
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            width: 150,
            height: 60,
            shape: "round-rectangle",
            "border-width": 1,
            "border-color": colorScheme.nodeBorder,
            "border-radius": 10,
            "font-size": 12,
            "text-wrap": "wrap",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": colorScheme.edgeColor,
            "target-arrow-color": colorScheme.edgeColor,
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 1.5,
          },
        },
        {
          selector:
            'edge[source="PlanControllerAgent"][target="FinalAnswerAgent"], edge[source="PlanControllerAgent"][target="ActionAgent"], edge[source="PlannerAgent"][target="PlannerJudgeAgent"], edge[source="TaskAnalyzerAgent"][target="TaskDecompositionAgent"], edge[source="TaskAnalyzerAgent"][target="LocationResolver"]',
          style: {
            "line-style": "dotted",
          },
        },
        {
          selector: "#start, #end",
          style: {
            "background-color": colorScheme.specialNodeBackground,
            shape: "ellipse",
            width: 80,
            height: 40,
          },
        },
        {
          selector: "#ActionAgent",
          style: {
            "border-width": 2,
            "border-color": colorScheme.specialNodeBorder,
          },
        },
        {
          selector: ".highlighted",
          style: {
            "background-color": colorScheme.highlightColor,
            "line-color": colorScheme.highlightColor,
            "target-arrow-color": colorScheme.highlightColor,
            width: 4,
            "z-index": 999,
          },
        },
        {
          selector: ".faded",
          style: {
            opacity: 0.4,
          },
        },
      ],
      layout: {
        name: "preset",
        padding: 30,
        positions: positions || {
          start: { x: 400, y: 30 },
          TaskAnalyzerAgent: { x: 400, y: 120 },
          TaskDecompositionAgent: { x: 250, y: 220 },
          LocationResolver: { x: 550, y: 220 },
          GoogleApiSearchAgent: { x: 750, y: 220 },
          PlanControllerAgent: { x: 250, y: 320 },
          FinalAnswerAgent: { x: 100, y: 420 },
          PlannerAgent: { x: 550, y: 420 },
          PlannerJudgeAgent: { x: 550, y: 520 },
          QaAgent: { x: 400, y: 620 },
          ActionAgent: { x: 650, y: 620 },
          end: { x: 100, y: 620 },
        },
      },
    });

    // Calculate significant flow indexes
    const indexes = findSignificantPaths(graphData.edges);
    setFlowIndexes(indexes);
    setTotalSteps(indexes.length);

    // Initialize with the first step
    if (indexes.length > 0) {
      highlightElement(0);
    }

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [graphData, positions, colorScheme]);

  const highlightElement = (stepIndex: number) => {
    if (!cyInstance.current) return;

    // Reset all elements
    cyInstance.current.elements().removeClass("highlighted faded");
    cyInstance.current.elements().addClass("faded");

    const edgeIndex = flowIndexes[stepIndex];
    const currentElement = graphData.edges[edgeIndex];

    if (currentElement) {
      const elementId = currentElement.data.id;

      if (currentElement.data.source) {
        // It's an edge
        cyInstance.current
          .$(`#${elementId}`)
          .removeClass("faded")
          .addClass("highlighted");
        cyInstance.current
          .$(`#${currentElement.data.source}`)
          .removeClass("faded");
        cyInstance.current
          .$(`#${currentElement.data.target}`)
          .removeClass("faded");
      }

      setCurrentNote(currentElement.data.note);
      setCurrentElementLabel(
        currentElement.data.label ||
          `Edge from ${currentElement.data.source} to ${currentElement.data.target}`
      );
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      highlightElement(newStep);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      highlightElement(newStep);
    }
  };

  return (
    <div className="App">
      <div style={{ minHeight: "100vh", padding: "24px", backgroundColor: "#f9fafb" }}>
        <Header currentView="Agent Flow Visualizer" />
        
        <div className="agent-flow-container" style={{ 
          maxWidth: "1400px", 
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "30px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
        }}>
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#6c757d",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Cuga Agent Flow Visualizer
            </label>
            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: "500",
                color: "#212529",
                paddingBottom: "12px",
                borderBottom: "2px solid #e9ecef",
              }}
            >
              Interactive Agent Visualization
            </h1>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            padding: "16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e5e7eb"
          }}>
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{
                padding: "10px 20px",
                marginRight: "12px",
                backgroundColor: currentStep === 0 ? "#e5e7eb" : "#3b82f6",
                color: currentStep === 0 ? "#6b7280" : "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: currentStep === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: currentStep === 0 ? "none" : "0 1px 3px rgba(59, 130, 246, 0.3)"
              }}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === totalSteps - 1}
              style={{
                padding: "10px 20px",
                marginRight: "20px",
                backgroundColor: currentStep === totalSteps - 1 ? "#e5e7eb" : "#3b82f6",
                color: currentStep === totalSteps - 1 ? "#6b7280" : "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: currentStep === totalSteps - 1 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: currentStep === totalSteps - 1 ? "none" : "0 1px 3px rgba(59, 130, 246, 0.3)"
              }}
            >
              Next
            </button>
            <span style={{ 
              fontSize: "14px", 
              color: "#374151",
              fontWeight: "500"
            }}>
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {currentNote && (
            <div
              style={{
                padding: "20px",
                marginBottom: "20px",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                backgroundColor: "#f8f9fa",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
              }}
            >
              <h3 style={{ 
                fontSize: "1rem", 
                fontWeight: "600", 
                marginBottom: "12px",
                color: "#111827"
              }}>
                {currentElementLabel}
              </h3>
              <p style={{ marginBottom: "8px", fontSize: "14px", color: "#374151" }}>
                <strong style={{ color: "#1f2937" }}>Description:</strong> {currentNote.description}
              </p>
              <p style={{ marginBottom: "8px", fontSize: "14px", color: "#374151" }}>
                <strong style={{ color: "#1f2937" }}>Input:</strong> {currentNote.input}
              </p>
              <p style={{ marginBottom: "8px", fontSize: "14px", color: "#374151" }}>
                <strong style={{ color: "#1f2937" }}>Output:</strong> {currentNote.output}
              </p>
              {currentNote.details && (
                <p style={{ marginBottom: "0", fontSize: "14px", color: "#374151" }}>
                  <strong style={{ color: "#1f2937" }}>Details:</strong> {currentNote.details}
                </p>
              )}
            </div>
          )}

          <div
            ref={cyRef}
            style={{ 
              width: "100%", 
              height, 
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentFlowVisualizer;
