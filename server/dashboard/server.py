from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import json
import os
import pandas as pd
import csv
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
from pydantic import BaseModel
from contextlib import asynccontextmanager
from fastapi import Body
from starlette.responses import Response
import argparse
import subprocess
import threading
import shutil
import re
import tempfile
import sys
from loguru import logger
from dashboard.activity_tracker import ActivityTracker

# Load environment variables
load_dotenv()

# Parse command-line arguments
parser = argparse.ArgumentParser(description="FastAPI Server")
parser.add_argument("--data_dir", type=str, default="./data", help="Directory to store/load data")
parser.add_argument("--experiments_dir", type=str, default=None, help="Directory containing experiment logs")
parser.add_argument("--port", type=int, default=8989, help="Port to run the server on")
parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
args = parser.parse_args()

app = FastAPI()

# Initialize ActivityTracker

# Directory containing the React build
BUILD_DIR = args.data_dir
EXPERIMENTS_DIR = args.experiments_dir

# Directory structure like eval_gui.py
APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUTPUT_DIR = os.path.join(APP_DIR, "scripts", "experiment_outputs")  # For new runs
LOGGING_DIR = (
    EXPERIMENTS_DIR if EXPERIMENTS_DIR else os.path.join(APP_DIR, "logging", "trajectory_data")
)  # For logged experiments

# If only experiments_dir is provided, use it as BUILD_DIR for serving static files
if EXPERIMENTS_DIR and not args.data_dir != "./data":  # data_dir is default
    BUILD_DIR = EXPERIMENTS_DIR
    tracker = ActivityTracker()
    tracker.set_base_dir(EXPERIMENTS_DIR)


# Use absolute paths based on the package's location
package_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
base_dir = os.path.dirname(package_dir)

# Define static directories with absolute paths
static_dirs = [os.path.join(package_dir, "static"), os.path.join(base_dir, "static")]
STATIC_DIR_HTML = next(
    (d for d in static_dirs if os.path.exists(d)),
    os.environ.get("STATIC_DIR_HTML", os.path.join(base_dir, "static")),
)
logger.info(f"Using static directory: {STATIC_DIR_HTML}")

asset_dirs = [os.path.join(package_dir, "assets"), os.path.join(base_dir, "assets")]
assets_dir = next(
    (d for d in asset_dirs if os.path.exists(d)),
    os.environ.get("ASSETS_DIR", os.path.join(base_dir, "assets")),
)
logger.info(f"Using assets directory: {assets_dir}")

# Directory containing static files
STATIC_DIR = f"{BUILD_DIR}"

# Global storage for active runs and processes (in production, this should be a proper database)
active_runs = {}
processes = {}
dashboard_process = None
dashboard_exp_name = None


# Custom StaticFiles class to disable caching for specific extensions
class NoCacheStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def file_response(self, full_path: Path, stat_result: os.stat_result, scope: dict) -> Response:
        path_obj = Path(full_path)
        response = super().file_response(full_path, stat_result, scope)
        if path_obj.suffix in [".json", ".csv"]:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


class SecureStaticFiles(StaticFiles):
    def __init__(self, *, directory: str, **kwargs):
        self.directory_path = Path(directory).resolve()
        super().__init__(directory=directory, **kwargs)

    async def get_response(self, path: str, scope):
        try:
            requested_path = (self.directory_path / path).resolve()
            print(requested_path)
            if not str(requested_path).startswith(str(self.directory)):
                raise HTTPException(status_code=404, detail="File not found")
        except (OSError, ValueError):
            raise HTTPException(status_code=404, detail="File not found")
        return await super().get_response(path, scope)


# Mount the React build files
app.mount("/data", SecureStaticFiles(directory=STATIC_DIR), name="static")
app.mount("/static", SecureStaticFiles(directory=STATIC_DIR_HTML), name="static_dir_html")
app.mount("/assets", SecureStaticFiles(directory=assets_dir), name="static_dir_assets_html")


# Pydantic models for requests
class ExperimentRun(BaseModel):
    experiment_name: str


class JoinExperiments(BaseModel):
    experiment_names: List[str]
    new_name: str


class ProgressUpdate(BaseModel):
    experiment_name: str
    task_id: str
    status: str


class DeleteExperiments(BaseModel):
    experiment_names: List[str]


class DashboardRequest(BaseModel):
    experiment_name: str


# Utility functions from eval_gui.py
def get_last_completed_id(experiment_name):
    """Reads the .progress file to find the last successfully completed item for a GUI-run."""
    progress_file = os.path.join(OUTPUT_DIR, experiment_name, ".progress")
    if not os.path.exists(progress_file):
        return None
    with open(progress_file, 'r') as f:
        lines = f.read().strip().splitlines()
        return lines[-1] if lines else None


def load_logged_experiments():
    """
    Scans the logging directory, reads results.json and aggregates stats based on score.
    This matches the eval_gui.py load_logged_experiments method exactly.
    """
    logged_experiments = {}
    if not os.path.isdir(LOGGING_DIR):
        return logged_experiments

    for exp_folder in os.listdir(LOGGING_DIR):
        exp_path = os.path.join(LOGGING_DIR, exp_folder)
        results_file = os.path.join(exp_path, "results.json")

        if os.path.isdir(exp_path) and os.path.exists(results_file):
            try:
                with open(results_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                progress_info = tracker.get_experiment_progress(exp_folder)
                total_tasks = progress_info['total_tasks']
                completed_tasks = progress_info['completed_tasks']
                uncompleted_task_ids = progress_info['uncompleted_task_ids']
                errored_tasks = 0
                tasks_passed_from_results = 0
                tasks_failed_score_0 = []

                if data:
                    for task_id, task_result in data.items():
                        if task_result.get("exception") is True:
                            errored_tasks += 1
                        if task_result.get("score") == 1.0:
                            tasks_passed_from_results += 1
                        elif task_result.get("score") == 0.0 or task_result.get("score") == 0:
                            tasks_failed_score_0.append(task_id)

                logged_experiments[exp_folder] = {
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "tasks_passed": tasks_passed_from_results,
                    "errored_tasks": errored_tasks,
                    "tasks_failed_score_0": tasks_failed_score_0,
                    "uncompleted_task_ids": uncompleted_task_ids,
                    "path": exp_path,
                    "created_at": os.path.getctime(exp_path),
                }
            except (json.JSONDecodeError, IOError, TypeError) as e:
                logger.error(f"Error processing {results_file}: {e}")
                logged_experiments[exp_folder] = {
                    "error": str(e),
                    "path": exp_path,
                    "created_at": os.path.getctime(exp_path),
                }

    return logged_experiments


def _kill_process_on_port(port=8989):
    """Finds and forcefully kills the process running on a specific port."""
    try:
        if os.name == 'nt':
            command = f"netstat -aon | findstr :{port}"
            result = subprocess.run(command, capture_output=True, text=True, shell=True)
            output = result.stdout.strip()
            if not output:
                logger.info(f"No process found on port {port}.")
                return
            match = re.search(r'LISTENING\s+(\d+)', output)
            if not match:
                logger.warning(f"Could not find PID for process on port {port} from netstat output.")
                return
            pid = match.group(1)
            kill_command = f"taskkill /PID {pid} /F"
            logger.info(f"Executing: {kill_command}")
            subprocess.run(kill_command, capture_output=True, text=True, shell=True, check=True)
            logger.info(f"Successfully killed process with PID {pid} on port {port}.")
        else:
            command = f"lsof -t -i:{port}"
            result = subprocess.run(command, capture_output=True, text=True, shell=True)
            pids = result.stdout.strip().split()
            if not pids:
                logger.info(f"No process found on port {port}.")
                return
            for pid in pids:
                kill_command = f"kill -9 {pid}"
                logger.info(f"Executing: {kill_command}")
                subprocess.run(kill_command, shell=True)
                logger.info(f"Successfully killed process with PID {pid} on port {port}.")
    except Exception as e:
        logger.error(f"An error occurred while trying to kill process on port {port}: {e}")


def _execute_experiment_subprocess(exp_name):
    """Execute experiment subprocess matching eval_gui.py implementation"""
    global active_runs, processes

    experiment_log_path = os.path.join(OUTPUT_DIR, exp_name, "experiment.log")
    os.makedirs(os.path.dirname(experiment_log_path), exist_ok=True)

    command = [sys.executable, "./evaluation/appworld_eval.py", "--eval_key", exp_name]

    try:
        flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            creationflags=flags,
        )

        processes[exp_name] = process
        logger.info(f"Experiment '{exp_name}' process started with PID: {process.pid}")

        active_runs[exp_name] = {'status': 'running', 'details': f"PID: {process.pid}. Running..."}

        stdout_output, stderr_output = process.communicate()

        if stdout_output:
            logger.info(f"Experiment Stdout:\n{stdout_output.strip()}")
        if stderr_output:
            logger.error(f"Experiment Stderr:\n{stderr_output.strip()}")

        return_code = process.returncode

        if return_code == 0 and not stderr_output:
            active_runs[exp_name] = {'status': 'completed', 'details': "Successfully completed."}
            logger.info(f"Experiment '{exp_name}' completed successfully with exit code 0.")
        else:
            error_details = f"Exited with error code {return_code}."
            if stderr_output:
                error_details += f"\nError Output:\n{stderr_output.strip()[:500]}..."
            active_runs[exp_name] = {'status': 'failed', 'details': error_details}
            logger.error(f"Experiment '{exp_name}' failed with code {return_code}. Stderr:\n{stderr_output}")

    except FileNotFoundError:
        active_runs[exp_name] = {'status': 'failed', 'details': "Error: evaluation script not found."}
        logger.error(f"Failed to start experiment '{exp_name}': evaluation script not found.")
    except Exception as e:
        error_message = f"Error starting process: {e}"
        active_runs[exp_name] = {'status': 'failed', 'details': error_message}
        logger.error(f"Error starting experiment '{exp_name}' process: {e}")
    finally:
        if exp_name in processes:
            del processes[exp_name]


# ===== EXPERIMENT MANAGEMENT ENDPOINTS =====


@app.get("/api/experiments/config")
async def get_experiment_config():
    """Get available experiment configurations from settings"""
    try:
        # Try to import settings to get real experiment configurations
        try:
            from config import settings

            experiment_keys = list(settings.eval_config.keys())
            if not experiment_keys:
                raise ImportError("No experiments found in settings")

            experiments = {
                name: {"description": f"Experiment: {name}", "config": settings.eval_config[name]}
                for name in experiment_keys
            }
        except (ImportError, AttributeError):
            # Fallback to mock data if settings not available
            experiments = {
                "experiment_1": {"description": "First experiment", "tasks": 100},
                "experiment_2": {"description": "Second experiment", "tasks": 50},
                "test_run": {"description": "Test run", "tasks": 25},
            }

        return JSONResponse(
            content={"experiments": experiments},
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting experiment config: {str(e)}")


@app.get("/api/experiments/logged")
async def get_logged_experiments(page: int = 1, per_page: int = 15, search: str = ""):
    """Get list of logged experiments with pagination and search"""
    try:
        experiments = load_logged_experiments()

        # Apply search filter
        if search:
            filtered_experiments = {k: v for k, v in experiments.items() if search.lower() in k.lower()}
        else:
            filtered_experiments = experiments

        # Sort by creation time (newest first)
        sorted_exp_names = sorted(
            filtered_experiments.keys(),
            key=lambda name: filtered_experiments[name].get('created_at', 0),
            reverse=True,
        )

        # Apply pagination
        total_items = len(sorted_exp_names)
        total_pages = (total_items + per_page - 1) // per_page if total_items > 0 else 1
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page

        paginated_names = sorted_exp_names[start_idx:end_idx]
        paginated_experiments = {name: filtered_experiments[name] for name in paginated_names}

        return JSONResponse(
            content={
                "experiments": paginated_experiments,
                "pagination": {
                    "current_page": page,
                    "total_pages": total_pages,
                    "total_items": total_items,
                    "per_page": per_page,
                },
            },
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading experiments: {str(e)}")


@app.get("/api/experiments/active")
async def get_active_experiments():
    """Get list of currently active/running experiments"""
    try:
        # Clean up finished processes
        finished_processes = []
        for exp_name, process in list(processes.items()):
            if process.poll() is not None:  # Process has finished
                finished_processes.append(exp_name)
                if exp_name in active_runs:
                    active_runs[exp_name]['status'] = 'completed' if process.returncode == 0 else 'failed'
                    active_runs[exp_name]['details'] = (
                        f"Process finished with return code {process.returncode}"
                    )

        # Remove finished processes from tracking
        for exp_name in finished_processes:
            processes.pop(exp_name, None)

        return JSONResponse(
            content={"active_runs": active_runs},
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting active experiments: {str(e)}")


@app.post("/api/experiments/run")
async def run_experiment(experiment: ExperimentRun, background_tasks: BackgroundTasks):
    """Start running an experiment"""
    exp_name = experiment.experiment_name

    # Check if experiment is already running
    if exp_name in processes and processes[exp_name].poll() is None:
        raise HTTPException(status_code=400, detail=f"Experiment '{exp_name}' is already running")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Update active runs
    active_runs[exp_name] = {'status': 'starting', 'details': 'Experiment process initiated.'}

    # Start experiment in background thread
    def run_in_background():
        _execute_experiment_subprocess(exp_name)

    thread = threading.Thread(target=run_in_background, daemon=True)
    thread.start()

    return JSONResponse(
        content={"message": f"Experiment {exp_name} started", "status": "starting"},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.post("/api/experiments/join")
async def join_experiments(join_request: JoinExperiments):
    """Join multiple experiments into a new one using ActivityTracker.merge_experiments"""
    try:
        # Validate that all source experiments exist
        for exp_name in join_request.experiment_names:
            exp_path = os.path.join(LOGGING_DIR, exp_name)
            if not os.path.exists(exp_path):
                raise HTTPException(status_code=404, detail=f"Experiment {exp_name} not found")

        # Use ActivityTracker's merge functionality like eval_gui.py
        merged_folder = tracker.merge_experiments(
            experiment_folders=join_request.experiment_names, output_experiment_name=join_request.new_name
        )

        return JSONResponse(
            content={
                "message": f"Successfully joined '{', '.join(join_request.experiment_names)}' into '{join_request.new_name}'",
                "new_experiment": join_request.new_name,
                "merged_folder": merged_folder,
            },
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error joining experiments: {str(e)}")


@app.post("/api/experiments/delete")
async def delete_experiments(delete_request: DeleteExperiments):
    """Delete multiple experiment directories and all their contents"""
    try:
        deleted_count = 0
        failed_deletions = []

        experiments = load_logged_experiments()

        for exp_name in delete_request.experiment_names:
            exp_info = experiments.get(exp_name)
            if not exp_info or "error" in exp_info:
                failed_deletions.append(f"{exp_name} (not found or invalid)")
                continue

            exp_path = exp_info.get("path")
            if exp_path and os.path.exists(exp_path):
                try:
                    logger.info(f"Attempting to delete directory: {exp_path}")
                    shutil.rmtree(exp_path)
                    logger.info(f"Successfully deleted: {exp_path}")
                    deleted_count += 1
                except OSError as e:
                    logger.error(f"Error deleting {exp_path}: {e}")
                    failed_deletions.append(f"{exp_name} ({e})")
            else:
                logger.warning(f"Attempted to delete {exp_name}, but path {exp_path} not found or invalid.")
                failed_deletions.append(f"{exp_name} (path not found/invalid)")

        result_message = f"Successfully deleted {deleted_count} experiment(s)."
        if failed_deletions:
            result_message += f" Failed deletions: {', '.join(failed_deletions)}"

        return JSONResponse(
            content={
                "message": result_message,
                "deleted_count": deleted_count,
                "failed_deletions": failed_deletions,
            },
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting experiments: {str(e)}")


@app.get("/api/experiments/{experiment_name}/download")
async def download_experiment(experiment_name: str):
    """Create and return a zip file of the experiment"""
    experiments = load_logged_experiments()
    exp_info = experiments.get(experiment_name)

    if not exp_info or "error" in exp_info:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_name} not found")

    exp_path = exp_info.get("path")
    if not exp_path or not os.path.exists(exp_path):
        raise HTTPException(status_code=404, detail=f"Experiment folder not found for {experiment_name}")

    try:
        # Create a temporary zip file
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{experiment_name}.zip")

        # Use shutil.make_archive like in eval_gui.py
        base_name = os.path.splitext(zip_path)[0]
        shutil.make_archive(base_name, 'zip', exp_path)

        return FileResponse(zip_path, media_type='application/zip', filename=f"{experiment_name}.zip")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating zip: {str(e)}")


@app.get("/api/experiments/{experiment_name}/tasks/uncompleted")
async def get_uncompleted_tasks(experiment_name: str):
    """Get uncompleted tasks for an experiment"""
    experiments = load_logged_experiments()
    exp_info = experiments.get(experiment_name)

    if not exp_info or "error" in exp_info:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_name} not found")

    uncompleted_tasks = exp_info.get("uncompleted_task_ids", [])
    variable_name = f"{experiment_name.replace(' ', '_').replace('-', '_').lower()}_uncompleted_tasks"

    return JSONResponse(
        content={
            "uncompleted_tasks": uncompleted_tasks,
            "variable_name": variable_name,
            "variable_display": f"{variable_name} = {json.dumps(uncompleted_tasks)}",
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/api/experiments/{experiment_name}/tasks/failed")
async def get_failed_tasks(experiment_name: str):
    """Get failed tasks (score 0) for an experiment"""
    experiments = load_logged_experiments()
    exp_info = experiments.get(experiment_name)

    if not exp_info or "error" in exp_info:
        raise HTTPException(status_code=404, detail=f"Experiment {experiment_name} not found")

    failed_tasks = exp_info.get("tasks_failed_score_0", [])
    variable_name = f"{experiment_name.replace(' ', '_').replace('-', '_').lower()}_failed_tasks"

    return JSONResponse(
        content={
            "failed_tasks": failed_tasks,
            "variable_name": variable_name,
            "variable_display": f"{variable_name} = {json.dumps(failed_tasks)}",
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.post("/api/dashboard/start")
async def start_dashboard(request: DashboardRequest):
    """Start the dashboard subprocess for a given experiment"""
    global dashboard_process, dashboard_exp_name

    exp_name = request.experiment_name

    if dashboard_process and dashboard_process.poll() is None:
        raise HTTPException(
            status_code=400,
            detail=f"Another dashboard is already running for {dashboard_exp_name}. Please close it first.",
        )

    experiments = load_logged_experiments()
    if exp_name not in experiments:
        raise HTTPException(status_code=404, detail=f"Experiment {exp_name} not found")

    folder_path = os.path.join(LOGGING_DIR, exp_name)
    logger.info(f"Open dashboard for {folder_path}")
    command = [sys.executable, "-m", "dashboard.cli", "start", folder_path, "--port", "8989"]

    try:
        flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        process = subprocess.Popen(command, creationflags=flags)

        dashboard_process = process
        dashboard_exp_name = exp_name
        logger.info(f"Dashboard started for '{exp_name}' with PID: {process.pid}")

        return JSONResponse(
            content={
                "message": f"Dashboard started for {exp_name}",
                "pid": process.pid,
                "url": "http://localhost:8989/dashboard",
            },
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except FileNotFoundError:
        dashboard_process = None
        dashboard_exp_name = None
        logger.error(
            "Dashboard command not found. Please ensure the 'dashboard' tool is installed and in your system's PATH."
        )
        raise HTTPException(
            status_code=500,
            detail="The 'dashboard' command was not found. Is the dashboard tool installed and in your system's PATH?",
        )
    except Exception as e:
        dashboard_process = None
        dashboard_exp_name = None
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred while starting dashboard: {e}"
        )


@app.post("/api/dashboard/stop")
async def stop_dashboard():
    """Stop the currently running dashboard subprocess"""
    global dashboard_process, dashboard_exp_name

    if dashboard_process and dashboard_process.poll() is None:
        logger.info(f"Attempting to terminate dashboard process PID: {dashboard_process.pid}")
        dashboard_process.terminate()
        try:
            dashboard_process.wait(timeout=2)
            logger.info("Dashboard process terminated.")
        except subprocess.TimeoutExpired:
            logger.warning("Dashboard process did not terminate gracefully, will force kill by port.")

    logger.info("Forcefully clearing port 8989 to ensure server is down...")
    _kill_process_on_port(8989)

    dashboard_process = None
    dashboard_exp_name = None

    return JSONResponse(
        content={"message": "Dashboard stopped successfully"},
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/api/dashboard/status")
async def get_dashboard_status():
    """Get the current dashboard status"""
    global dashboard_process, dashboard_exp_name

    is_running = dashboard_process is not None and dashboard_process.poll() is None

    return JSONResponse(
        content={
            "is_running": is_running,
            "experiment_name": dashboard_exp_name if is_running else None,
            "pid": dashboard_process.pid if is_running else None,
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


# ===== EXISTING ENDPOINTS (preserved) =====


@app.post("/api/save_log/{file_id}")
async def add_json_file(file_id: str, data: Dict[str, Any] = Body(...)) -> JSONResponse:
    """Save a JSON dictionary as a file with the specified ID in the build/data directory."""
    try:
        # Validate file_id (prevent directory traversal attacks)
        if not file_id.isalnum() and not all(c in "._-" for c in file_id if not c.isalnum()):
            raise HTTPException(
                status_code=400,
                detail="Invalid file_id. Use only alphanumeric characters, dots, underscores, or hyphens.",
            )

        # Construct the full path to save the JSON file
        file_path = Path(STATIC_DIR) / f"{file_id}.json"

        # Create the directory if it doesn't exist
        os.makedirs(STATIC_DIR, exist_ok=True)

        # Write the JSON data to the file
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

        response_content = {
            "message": "JSON file saved successfully",
            "file_id": file_id,
            "file_path": str(file_path),
        }
        return JSONResponse(
            content=response_content,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving JSON file: {str(e)}")


@app.get("/api/get_data_table")
async def get_csv_as_json(experiment_name: Optional[str] = None) -> JSONResponse:
    """Read a CSV file from the static directory and return it as JSON."""
    col_config = {
        "task_id": {
            "position": 0,
            "hidden": False,
            "isCategorical": False,
            "maxTextLength": 100,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
        "exception": {
            "hidden": False,
            "position": 9,
            "backgroundColorConfig": {
                "type": "categorical",
                "valueTransform": "(value) => { if (value === true ) return \"Exception\";}",
                "categories": {
                    True: "#ffa3ac",
                    False: "#ffffff",
                },
            },
        },
        "score": {
            "position": 10,
            "hidden": False,
            "isCategorical": True,
            "allowedValues": [],
            "maxTextLength": 50,
            "valueTransform": "(value) => { if (value === 1.0 || value === \"1.0\" || value === 1) return \"pass\"; if (value === 0.0 || value === \"0.0\" || value === 0) return \"fail\"; return value; }",
            "backgroundColorConfig": {
                "type": "categorical",
                "categories": {
                    "1": "#c4ffc8",
                    "0": "#ffa3ac",
                },
            },
            "filterable": True,
        },
        "site": {
            "position": 2,
            "hidden": False,
            "isCategorical": True,
            "allowedValues": [],
            "maxTextLength": 100,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": True,
        },
        "intent": {
            "position": 3,
            "hidden": False,
            "isCategorical": False,
            "maxTextLength": 300,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": True,
        },
        "num_steps": {
            "position": 8,
            "hidden": False,
            "isCategorical": False,
            "maxTextLength": 50,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
        "agent_answer": {
            "position": 5,
            "hidden": False,
            "isCategorical": False,
            "maxTextLength": 200,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
        "fail_category": {
            "position": 6,
            "hidden": True,
            "isCategorical": True,
            "allowedValues": [],
            "maxTextLength": 100,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
        "eval": {
            "position": 5,
            "hidden": False,
            "isCategorical": False,
            "allowedValues": [],
            "maxTextLength": 20,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
        "agent_v": {
            "position": 7,
            "hidden": True,
            "isCategorical": True,
            "allowedValues": [],
            "maxTextLength": 50,
            "valueTransform": "(value) => value",
            "backgroundColorConfig": None,
            "filterable": False,
        },
    }

    try:
        # Construct the full path to the CSV file
        if experiment_name:
            full_path = Path(LOGGING_DIR) / experiment_name / "results.csv"
        else:
            full_path = Path(BUILD_DIR) / "results.csv"
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"CSV file not found: {full_path}")

        # Read the CSV file and convert to JSON
        df = pd.read_csv(full_path)
        processed_records = []
        for index, row in df.iterrows():
            # Create a new dictionary for each row, filtering out None values
            filtered_row_dict = {key: value for key, value in row.items() if not pd.isna(value)}
            processed_records.append(filtered_row_dict)

        response_content = {"data": processed_records, "columnConfig": col_config}
        return JSONResponse(
            content=response_content,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except csv.Error:
        raise HTTPException(status_code=500, detail=f"Invalid CSV format in file: {full_path}")
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail=f"Error reading CSV file: {str(e)}")


@app.get("/api/stats", response_model=Dict)
async def generate_statistics(experiment_name: Optional[str] = None):
    """Generate statistics from the CSV data"""
    score_column = "score"
    exceptions_column = "exception"
    site_column = "site"
    try:
        # Construct the full path to the CSV file
        if experiment_name:
            file_path = Path(LOGGING_DIR) / experiment_name / "results.csv"
        else:
            file_path = Path(STATIC_DIR) / "results.csv"

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="CSV file not found:")

        # Read the CSV file
        df = pd.read_csv(file_path)

        # Validate that required columns exist
        if site_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Site column '{site_column}' not found in CSV.")
        if score_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Score column '{score_column}' not found in CSV.")

        # Convert score column to numeric, coercing errors to NaN
        df[score_column] = pd.to_numeric(df[score_column], errors='coerce')

        # Filter to only 1.0 or 0.0 values
        valid_scores = df[df[score_column].isin([1.0, 0.0])].copy()

        site_stats = (
            valid_scores.groupby(site_column)[[score_column, exceptions_column]]
            .agg(
                average_score=(score_column, 'mean'),
                count=(score_column, 'count'),
                total_exceptions=(exceptions_column, 'sum'),
            )
            .reset_index()
        )

        # Round average_score to 2 decimal places
        site_stats['average_score'] = site_stats['average_score'].round(3)

        # Create overall statistics with rounded values
        overall_stats = {
            "average_score": round(valid_scores[score_column].mean(), 3),
            "total_rows": len(valid_scores),
            "sites_count": site_stats[site_column].nunique(),
        }

        # Prepare tables for the response
        tables = [
            {
                "table_id": 1,
                "title": "Site Statistics",
                "description": "Average scores and counts per site",
                "columns": site_stats.columns.tolist(),
                "records": site_stats.to_dict(orient='records'),
            },
            {
                "table_id": 2,
                "title": "Overall Statistics",
                "description": "Summary statistics across all sites",
                "records": [overall_stats],
            },
        ]

        return JSONResponse(
            content={"message": "Statistics generated successfully", "tables": tables},
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The CSV file is empty.")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Could not parse CSV file. Please check the format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.get("/api/config")
async def get_config() -> Dict[str, Any]:
    """Get application configuration"""
    return JSONResponse(
        content={
            "processConfig": {
                "APIPlannerAgent": [
                    "action_input_conclude_task.final_response",
                    "action_input_coder_agent.task_description",
                    "action_input_shortlisting_agent.task_description",
                ]
            },
            "stepsConfig": {
                "FinalAnswerAgent": {"backgroundColor": "lightblue", "expandable": True},
                "PlanControllerAgent": {"backgroundColor": "lightblue", "expandable": True},
                "CodeAgent": {
                    "backgroundColor": "lightblue",
                    "interesting_keys": ["summary"],
                    "expandable": True,
                },
                "APICoderPlannerAgent": {"backgroundColor": "lightblue", "expandable": True},
                "APIPlannerAgent": {
                    "backgroundColor": "lightblue",
                    "interesting_keys": [
                        "action_input_conclude_task.final_response",
                        "action_input_coder_agent.task_description",
                        "action_input_shortlisting_agent.task_description",
                    ],
                    "expandable": True,
                },
                "QaAgent": {"backgroundColor": "lightblue", "expandable": True},
                "TaskAnalyzerAgent": {"backgroundColor": "lightblue", "expandable": True},
                "APICodePlannerAgent": {"backgroundColor": "lightblue", "expandable": True},
                "PlannerAgent": {
                    "backgroundColor": "lightblue",
                    "renderImage": True,
                    "showCurrentUrl": True,
                    "expandable": True,
                },
                "ActionAgent": {"backgroundColor": "lightblue", "expandable": True},
                "TaskDecompositionAgent": {"backgroundColor": "lightblue", "expandable": False},
                "default": {"backgroundColor": "lightblue", "expandable": False},
            },
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


class AssistQuery(BaseModel):
    query: str
    id: Optional[str] = None


class AssistResponse(BaseModel):
    response: str


def filter_step_keys(data: Dict) -> Dict:
    """
    Simple function to remove 'image_before' and 'observation' keys from each step
    in the 'steps' array of the JSON data.
    """
    # Create a copy to avoid modifying the original
    filtered_data = data.copy()

    # Check if there's a steps key
    if 'steps' in filtered_data and isinstance(filtered_data['steps'], list):
        # Process each step
        for step in filtered_data['steps']:
            if isinstance(step, dict):
                # Remove the specific keys if they exist
                if 'image_before' in step:
                    del step['image_before']
                if 'observation_before' in step:
                    del step['observation_before']

    return filtered_data


@app.post("/api/assist", response_model=AssistResponse)
async def assist(query: AssistQuery):
    """Process a question for the AI assistant and return a response."""
    try:
        # If an ID is provided, read the corresponding JSON file
        if query.id:
            # Construct the full path to the JSON file
            json_path = Path(STATIC_DIR) / f"{query.id}.json"

            if not json_path.exists():
                raise HTTPException(status_code=404, detail=f"JSON file not found for ID: {query.id}")

            # LLM functionality has been disabled
            return JSONResponse(
                content={"response": "LLM functionality is not available."},
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
        else:
            # If no ID is provided, LLM functionality is disabled
            return JSONResponse(
                content={"response": "LLM functionality is not available."},
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.post("/api/config")
async def update_config(config: Dict[str, Any]) -> JSONResponse:
    """Update global configuration for step rendering."""
    config_path = Path(BUILD_DIR) / "config.json"

    try:
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)
        return JSONResponse(
            content=config,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating configuration: {str(e)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on application startup
    os.makedirs(STATIC_DIR_HTML, exist_ok=True)

    # Check if build directory exists
    if not os.path.exists(BUILD_DIR):
        logger.warning(
            f"Warning: Build directory {BUILD_DIR} does not exist. Please run 'npm run build' first."
        )
    yield


@app.get("/{full_path:path}")
async def serve_react(full_path: str, request: Request):
    # Try to serve the requested file
    file_path = Path(os.path.join(STATIC_DIR_HTML, full_path))
    requested_path = file_path.resolve()
    print(requested_path)
    if not str(requested_path).startswith(str(STATIC_DIR_HTML)):
        raise HTTPException(status_code=404, detail="File not found")
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)

    # Otherwise try to return index.html for client-side routing
    index_path = os.path.join(STATIC_DIR_HTML, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(
            status_code=404, detail="Frontend files not found. Did you run the build process?"
        )


def main():
    """Entry point for the package when run directly"""
    import uvicorn

    logger.info(f"Starting server on {args.host}:{args.port}")
    logger.info(f"Using data directory: {BUILD_DIR}")
    if EXPERIMENTS_DIR:
        logger.info(f"Using experiments directory: {EXPERIMENTS_DIR}")
    uvicorn.run("dashboard.server:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
