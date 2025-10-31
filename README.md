# CugaViz

**An interactive visualization tool for CUGA experiment trajectories and results.**

CugaViz is a comprehensive local development tool designed to help researchers and developers visualize, analyze, and manage AI agent experiments. Built specifically for CUGA, this tool provides deep insights into agent behavior, decision-making processes, and performance metrics through intuitive visualizations and interactive interfaces.

Whether you're debugging a single trajectory, comparing multiple experiments, or analyzing agent flow patterns, CugaViz offers the tools you need to understand and improve your AI agents.

---

## Features

### Experiment Management
Create, organize, and manage multiple CUGA experiments in a centralized interface. Navigate between experiments and track their progress with ease.

### Interactive Trajectory Visualization
Step through agent trajectories with detailed action breakdowns, observation analysis, and decision reasoning. See exactly what your agent saw and why it made each decision.

### Real-time Results Dashboard
Monitor experiment performance with live metrics, accuracy charts, and statistical summaries. Compare results across different runs and configurations.

### Agent Flow Graph Analysis
Visualize agent decision flows as interactive graphs using Cytoscape.js. Understand the relationships between states, actions, and outcomes at a glance.

### Detailed Step Inspection
Drill down into individual steps with comprehensive views of observations, actions, tool calls, and reasoning. Examine screenshots, DOM states, and accessibility trees.


## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: FastAPI + Python 3.12+
- **Visualization**: Cytoscape.js (graphs), Recharts (metrics)
- **UI Components**: Lucide React icons, TailwindCSS
- **Data Processing**: Pandas for analysis
- **Package Management**: pnpm (frontend), uv (backend)

## Getting Started

### Prerequisites

- Node.js (for frontend)
- Python 3.12+ (for backend)
- pnpm (recommended for Node.js dependencies)

### Installation

1. **Frontend Setup**:
   ```bash
   pnpm install
   ```

2. **Backend Setup**:
   ```bash
   cd server
   uv pip install -e .
   ```

### Quick Start: Using the Tracker

The `ActivityTracker` is a singleton that helps you log experiment trajectories and results. Here's a quick example:

```python
from dashboard.activity_tracker import ActivityTracker, Step

# Get the tracker instance (singleton)
tracker = ActivityTracker()

# Optionally set a custom base directory for experiments
tracker.set_base_dir("./my_experiments")

# Start an experiment with a list of task IDs
experiment_folder = tracker.start_experiment(
    task_ids=["task_001", "task_002", "task_003"],
    experiment_name="my_experiment",
    description="Testing agent behavior on specific tasks"
)

# For each task, reset and collect data
for task_id in ["task_001", "task_002", "task_003"]:
    # Reset tracker for new task
    tracker.reset(intent="Complete the task", task_id=task_id)
    
    # Collect prompts during execution
    tracker.collect_prompt(role="user", value="What should I do?")
    tracker.collect_prompt(role="assistant", value="Let me help you...")
    
    # Collect steps as your agent performs actions
    # Example with string name
    step = Step(
        name="navigate_to_page",
        data="Navigated to https://example.com"
    )
    tracker.collect_step(step)
    
    # Example with JSON string name
    step = Step(
        name='{"action": "click", "element": "button#submit"}',
        data="Clicked submit button"
    )
    tracker.collect_step(step)
    
    # Track token usage
    tracker.collect_tokens_usage(count=150)
    
    # Collect images if needed
    tracker.collect_image("base64_encoded_image_data")
    
    # Collect score after evaluation
    tracker.collect_score(score=1.0)
    
    # Finish the task with results
    tracker.finish_task(
        task_id=task_id,
        site="example.com",
        intent="Complete the task",
        agent_answer="Task completed successfully",
        eval="Perfect execution",
        score=1.0,
        exception=False,
        num_steps=len(tracker.steps),
        agent_v="v1.0.0"
    )

# View experiment statistics
stats = tracker.get_statistics()
print(f"Total tasks: {stats['total_tasks']}")
print(f"Average score: {stats.get('average_score', 0)}")
```

**Key Methods:**
- `start_experiment(task_ids, experiment_name, description)` - Create a new experiment
- `reset(intent, task_id)` - Reset tracker for a new task
- `collect_prompt(role, value)` - Log prompts/conversations
- `collect_step(step)` - Log agent actions and observations
- `collect_score(score)` - Record task score
- `collect_tokens_usage(count)` - Track token consumption
- `collect_image(img)` - Store screenshots/images
- `finish_task(...)` - Complete a task and update results

The tracker automatically saves trajectory data to JSON files and updates experiment results in CSV/JSON format, which can then be visualized in the CugaViz dashboard.

### Running the Application

#### Option 1: Full Development Mode

1. **Start the backend server**:
   ```bash
   cd server
   uv run cuga-viz start /path/to/your/logs
   # Or for experiments mode (using the my_experiments directory from the example above):
   uv run cuga-viz run ./my_experiments
   ```

2. **Start the frontend** (in a separate terminal):
   ```bash
   pnpm run dev
   ```

The application will be available at `http://localhost:5173` (frontend) and `http://localhost:8989` (backend API).

#### Option 2: Production Build

1. **Build the frontend**:
   ```bash
   pnpm run build
   ```

2. **Run the server** (serves both API and built frontend):
   ```bash
   cd server
   uv run cuga-viz start /path/to/your/logs
   # Or for experiments mode (using the my_experiments directory from the example above):
   uv run cuga-viz run ./my_experiments
   ```

The application will open automatically in your browser.

## CLI Usage

CugaViz provides a powerful CLI for launching the visualization server:

```bash
# Start dashboard for trajectory logs
uv run cuga-viz start /path/to/logs [--port 8989]

# Start experiments manager (using the my_experiments directory from the example above)
uv run cuga-viz run ./my_experiments [--port 8988]

# Show usage examples
uv run cuga-viz examples
```

### Expected Directory Structure

**For trajectory logs:**
```
logs/
├── task1.json
├── task2.json
└── results.csv
```

**For experiments:**
```
experiments/
├── experiment_1/
│   ├── logs/
│   └── results.json
├── experiment_2/
│   └── results.json
└── baseline/
    └── results.json
```

## Application Routes

- `/` - Experiment management and selection
- `/dashboard` - Main results dashboard with metrics
- `/trajectories/:taskId` - Detailed trajectory viewer
- `/trajectories/:experiment/:taskId` - Trajectory viewer with experiment context
- `/graph` - Agent flow graph visualization

## Project Structure

```
CugaViz/
├── src/                        # Frontend source
│   ├── components/
│   │   ├── dashboard/          # Dashboard & metrics
│   │   ├── graph/              # Graph visualization
│   │   ├── ExperimentManager   # Experiment management UI
│   │   ├── TrajectoryViewer    # Step-by-step viewer
│   │   └── ...                 # Other components
│   ├── services/               # API client
│   └── utils/                  # Helper functions
├── server/                     # Backend source
│   ├── dashboard/
│   │   ├── server.py           # FastAPI server
│   │   ├── cli.py              # CLI interface
│   │   └── static/             # Built frontend assets
│   └── data/                   # Sample data
└── pyproject.toml              # Python dependencies
```

## Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our Developer Certificate of Origin (DCO) and the process for submitting pull requests.

All commits must be signed off using `git commit -s` to indicate acceptance of the DCO.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.