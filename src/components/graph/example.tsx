// @ts-nocheck

import React from "react";
import AgentFlowVisualizer from "./index";

const AgentFlowExample: React.FC = () => {
  // Sample graph data
  const graphData = {
    nodes: [
      {
        data: {
          id: "start",
          label: "start",
          note: {
            description: "Initial entry point of the agent system",
            input: "User query or task",
            output: "Initializes the task analysis process",
          },
        },
      },
      {
        data: {
          id: "TaskAnalyzerAgent",
          label: "TaskAnalyzerAgent",
          note: {
            description: "Analyzes the incoming task or query",
            input: "Raw user input",
            output: "Task analysis and routing decisions",
          },
        },
      },
      {
        data: {
          id: "TaskDecompositionAgent",
          label: "TaskDecompositionAgent",
          note: {
            description: "Breaks down complex tasks into manageable sub-tasks",
            input: "Task from TaskAnalyzerAgent",
            output: "Decomposed task plan",
          },
        },
      },
      {
        data: {
          id: "LocationResolver",
          label: "LocationResolver",
          note: {
            description: "Resolves location-specific information in queries",
            input: "Location data from task",
            output: "Contextualized location information",
          },
        },
      },
      {
        data: {
          id: "GoogleApiSearchAgent",
          label: "GoogleApiSearchAgent",
          note: {
            description: "Searches google",
            input: "Intent or query",
            output: "results from google",
          },
        },
      },
      {
        data: {
          id: "PlanControllerAgent",
          label: "PlanControllerAgent",
          note: {
            description: "Coordinates the execution of the task plan",
            input: "Decomposed task plan",
            output: "Orchestrates execution flow between agents",
          },
        },
      },
      {
        data: {
          id: "FinalAnswerAgent",
          label: "FinalAnswerAgent",
          note: {
            description: "Formulates the final response to the user",
            input: "Processed data from previous agents",
            output: "Final formatted answer",
          },
        },
      },
      {
        data: {
          id: "PlannerAgent",
          label: "PlannerAgent",
          note: {
            description: "Creates execution plans for complex tasks",
            input: "Task requirements",
            output: "Detailed execution plan",
          },
        },
      },
      {
        data: {
          id: "PlannerJudgeAgent",
          label: "PlannerJudgeAgent",
          note: {
            description: "Evaluates and refines plans from the PlannerAgent",
            input: "Proposed execution plan",
            output: "Evaluated and improved plan",
          },
        },
      },
      {
        data: {
          id: "QaAgent",
          label: "QaAgent",
          note: {
            description: "Performs quality assurance checks",
            input: "Intermediate results or plans",
            output: "Quality assessment feedback",
          },
        },
      },
      {
        data: {
          id: "ActionAgent",
          label: "ActionAgent",
          note: {
            description: "Executes specific actions based on the plan",
            input: "Action instructions",
            output: "Action results",
            details: "__interrupt = after",
          },
        },
      },
      {
        data: {
          id: "end",
          label: "end ⟳",
          note: {
            description: "Final termination point of the agent system",
            input: "Final response from FinalAnswerAgent",
            output: "Process completion",
          },
        },
      },
    ],
    edges: [
      {
        data: {
          id: "e1",
          source: "start",
          target: "TaskAnalyzerAgent",
          note: {
            description: "Analyzes user intent",
            input: "Intent: Delete all reviews from the scammer Carlo",
            output: "Initial task analysis",
          },
        },
      },
      {
        data: {
          id: "e2",
          source: "TaskAnalyzerAgent",
          target: "TaskDecompositionAgent",
          note: {
            description: "Routes task for decomposition",
            input: "Intent: Delete all reviews from the scammer Carlo",
            output:
              "No location search needed, no loop needed, intent performs update.",
          },
        },
      },
      {
        data: {
          id: "e3",
          source: "TaskAnalyzerAgent",
          target: "LocationResolver",
          note: {
            description: "Routes task for location resolution",
            input: "Task with location elements",
            output: "Location data for processing",
          },
        },
      },
      {
        data: {
          id: "e4",
          source: "LocationResolver",
          target: "TaskAnalyzerAgent",
          note: {
            description: "Returns resolved location data",
            input: "Resolved location information",
            output: "Enhanced task with location context",
          },
        },
      },
      {
        data: {
          id: "lr1",
          source: "LocationResolver",
          target: "GoogleApiSearchAgent",
          note: {
            description: "Routes task for location resolution",
            input: "Task with location elements",
            output: "Location data for processing",
          },
        },
      },
      {
        data: {
          id: "lr2",
          source: "GoogleApiSearchAgent",
          target: "LocationResolver",
          note: {
            description: "Routes task for location resolution",
            input: "Task with location elements",
            output: "Location data for processing",
          },
        },
      },
      {
        data: {
          id: "e5",
          source: "TaskDecompositionAgent",
          target: "PlanControllerAgent",
          note: {
            description: "Passes decomposed task plan",
            input: "Decomposed sub-tasks",
            output:
              "The intent is to delete reviews from a specific user, which is a single task that doesnt require further decomposition.",
          },
        },
      },
      {
        data: {
          id: "e7",
          source: "PlanControllerAgent",
          target: "FinalAnswerAgent",
          note: {
            description: "Finalizes task execution",
            input: "Complete processed task data",
            output: "Data for final answer formulation",
          },
        },
      },
      {
        data: {
          id: "e8",
          source: "PlanControllerAgent",
          target: "PlannerAgent",
          note: {
            description: "Requests execution planning",
            input: "Task requirements",
            output: "Planning requirements",
          },
        },
      },
      {
        data: {
          id: "e10",
          source: "FinalAnswerAgent",
          target: "end",
          note: {
            description: "Completes the execution flow",
            input: "Final formatted answer",
            output: "Process termination",
          },
        },
      },
      {
        data: {
          id: "e11",
          source: "PlannerAgent",
          target: "PlanControllerAgent",
          note: {
            description: "Returns execution plan",
            input: "Created execution plan",
            output: "Plan for controller orchestration",
          },
        },
      },
      {
        data: {
          id: "e12",
          source: "PlannerAgent",
          target: "PlannerJudgeAgent",
          note: {
            description: "Submits plan for evaluation",
            input: "Proposed plan",
            output: "Plan for judgment",
          },
        },
      },
      {
        data: {
          id: "e13",
          source: "PlannerJudgeAgent",
          target: "PlannerAgent",
          note: {
            description: "Provides plan feedback",
            input: "Evaluation results",
            output: "Plan improvement suggestions",
          },
        },
      },
      {
        data: {
          id: "e14",
          source: "PlannerJudgeAgent",
          target: "QaAgent",
          note: {
            description: "Requests quality verification",
            input: "Plan for QA",
            output: "Quality check request",
          },
        },
      },
      {
        data: {
          id: "e16",
          source: "QaAgent",
          target: "PlannerJudgeAgent",
          note: {
            description: "Reports quality metrics",
            input: "Detailed quality analysis",
            output: "Quality insights for judgment",
          },
        },
      },
      {
        data: {
          id: "e17",
          source: "PlannerJudgeAgent",
          target: "ActionAgent",
          note: {
            description: "Dispatches action requests",
            input: "Action specifications",
            output: "Executable action instructions",
          },
        },
      },
      {
        data: {
          id: "e18",
          source: "ActionAgent",
          target: "PlannerJudgeAgent",
          note: {
            description: "Provides action results",
            input: "Action execution results",
            output: "Data for final response",
          },
        },
      },
      {
        data: {
          id: "e19",
          source: "FinalAnswerAgent",
          target: "PlanControllerAgent",
          note: {
            description: "Requests additional processing if needed",
            input: "Preliminary answer assessment",
            output: "Additional processing requirements",
          },
        },
      },
    ],
  };

  // Custom node positions
  const customPositions = {
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
  };

  // Custom color scheme
  const customColorScheme = {
    nodeBackground: "#E6E6FA", // Light lavender
    nodeBorder: "#9370DB", // Medium purple
    specialNodeBackground: "#B19CD9", // Lighter purple
    specialNodeBorder: "#483D8B", // Dark slate blue
    edgeColor: "#999",
    highlightColor: "#4CAF50", // Green
  };

  return (
    <div className="container mx-auto p-4">
      <h4 className="text-2xl font-bold mb-4">Agent Flow Visualization</h4>
      {/* <p className="mb-4">
        This visualization shows the flow between different agent components in
        a multi-agent system.
      </p> */}

      <AgentFlowVisualizer
        graphData={graphData}
        positions={customPositions}
        height="700px"
        colorScheme={customColorScheme}
      />

      <div className="mt-8 bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Configuration Options</h2>
        <p>This component can be customized with the following props:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>
            <strong>graphData</strong>: The nodes and edges to display
          </li>
          <li>
            <strong>positions</strong>: Custom positioning for each node
          </li>
          <li>
            <strong>height</strong>: Height of the visualization container
          </li>
          <li>
            <strong>colorScheme</strong>: Custom colors for nodes, edges, and
            highlights
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AgentFlowExample;
