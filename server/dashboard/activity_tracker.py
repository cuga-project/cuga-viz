import copy
import json
import os
import shutil
import pandas as pd
from typing import Any, List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel
from loguru import logger

from dashboard.id_utils import random_id_with_timestamp, mask_with_timestamp


class Prompt(BaseModel):
    role: str
    value: str


class Step(BaseModel):
    name: Optional[str] = ""
    plan: Optional[str] = ""
    prompts: Optional[List[Prompt]] = ""
    data: Optional[str] = ""
    task_decomposition: Optional[str] = ""
    current_url: Optional[str] = ""
    action_formatted: Optional[str] = ""
    action_type: Optional[str] = ""
    action_args: Optional[Any] = ""
    observation_before: Optional[str] = ""
    image_before: Optional[str] = ""


class TasksMetadata(BaseModel):
    task_ids: List[str]
    description: Optional[str] = ""
    experiment_name: str
    experiment_folder: str
    created_at: str


class ActivityTracker(object):
    _instance = None
    intent: str = ""
    session_id: str = ""
    dataset_name: str = ""
    prompts: List[Prompt] = []
    current_date: Optional[str] = None
    pi: Optional[str] = None
    eval: Any = None
    final_answer: Optional[str] = None
    task_id: str = "default"
    actions_count: int = 0
    token_usage: int = 0
    steps: List[Step] = []
    images: List[str] = []
    score: float = 0.0

    # Task management attributes
    tasks: Dict[str, Dict[str, Any]] = {}
    experiment_folder: Optional[str] = None
    tasks_metadata: Optional[TasksMetadata] = None

    # Base directory configuration
    _base_dir: str = "./logging/trajectory_data"

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ActivityTracker, cls).__new__(cls)
        return cls._instance

    def set_base_dir(self, base_dir: str) -> None:
        """
        Set the base directory for logging trajectory data.

        Args:
            base_dir (str): The base directory path for storing experiment data
        """
        self._base_dir = base_dir
        logger.info(f"Base directory set to: {self._base_dir}")

    def get_base_dir(self) -> str:
        """
        Get the current base directory for logging trajectory data.

        Returns:
            str: The current base directory path
        """
        return self._base_dir

    def generate_session_id(self):
        self.session_id = random_id_with_timestamp(full_date=True)

    def reset(self, intent, task_id="default"):
        self.token_usage = 0
        self.current_date = None
        self.pi = None
        self.prompts = []
        self.steps = []
        self.images = []
        self.actions_count = 0
        self.final_answer = None
        self.task_id = task_id
        self.intent = intent

    def start_experiment(
        self, task_ids: List[str], experiment_name: str, description: Optional[str] = ""
    ) -> str:
        """
        Start a new experiment with given task IDs.

        Args:
            task_ids (List[str]): List of task IDs for this experiment
            experiment_name (str): Name of the experiment
            description (str, optional): Description of the experiment

        Returns:
            str: The experiment folder name
        """
        # Generate experiment folder name using mask_with_timestamp
        self.experiment_folder = mask_with_timestamp(experiment_name, full_date=True)

        # Create directory structure
        experiment_dir = os.path.join(self._base_dir, self.experiment_folder)
        os.makedirs(experiment_dir, exist_ok=True)

        # Create metadata
        self.tasks_metadata = TasksMetadata(
            task_ids=task_ids,
            description=description,
            experiment_name=experiment_name,
            experiment_folder=self.experiment_folder,
            created_at=datetime.now().isoformat(),
        )

        # Save metadata to file
        metadata_path = os.path.join(experiment_dir, "metadata.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(self.tasks_metadata.model_dump(), f, indent=2, ensure_ascii=False)

        # Initialize empty files
        self._initialize_experiment_files(experiment_dir)

        # Reset tasks dictionary
        self.tasks = {}

        return self.experiment_folder

    def _initialize_experiment_files(self, experiment_dir: str) -> None:
        """Initialize empty result files for the experiment."""
        # Define column order for CSV
        columns = [
            'task_id',
            'site',
            'intent',
            'agent_answer',
            'eval',
            'score',
            'exception',
            'num_steps',
            'fail_category',
            'agent_v',
        ]

        # Create empty results.csv
        results_csv_path = os.path.join(experiment_dir, "results.csv")
        df = pd.DataFrame(columns=columns)
        df.to_csv(results_csv_path, index=False, encoding='utf-8')

        # Create empty results.json
        results_json_path = os.path.join(experiment_dir, "results.json")
        with open(results_json_path, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=2, ensure_ascii=False)

        # Create empty .progress file
        progress_path = os.path.join(experiment_dir, ".progress")
        with open(progress_path, 'w', encoding='utf-8') as f:
            f.write("")

    def collect_prompt(self, role: str, value: str):
        self.prompts.append(Prompt(role=role, value=value))

    def collect_tokens_usage(self, count: int) -> None:
        """
        Increases the number of tokens used.

        Args:
            count (int): The number of times the token is used.
        """
        self.token_usage += count

    def collect_image(self, img: str) -> None:
        self.images.append(img)

    def collect_step(self, step: Step) -> None:
        """
        Collects a step, adding it to the steps list.

        Args:
            step (str): The description of the step to collect.
        """
        step.prompts = copy.deepcopy(self.prompts)
        self.prompts = []
        self.steps.append(step)
        self.to_file()

    def collect_score(self, score: float) -> None:
        """
        Collects a step, adding it to the steps list.

        Args:
            score (str): The description of the step to collect.
        """
        self.score = score
        self.to_file()

    def collect_step_with_pass(self) -> None:
        """
        Placeholder for collecting a step.
        """
        pass

    def to_file(self):
        """Save current task data to file in the experiment directory."""
        if self.experiment_folder:
            # Save to experiment directory
            source_dir = os.path.join(self._base_dir, self.experiment_folder)
        else:
            # Fallback to original behavior
            source_dir = "logging{}".format("_" + self.dataset_name if self.dataset_name else "")

        os.makedirs(source_dir, exist_ok=True)

        filename = self.task_id if self.task_id != "default" else self.session_id
        filepath = os.path.join(source_dir, f"{filename}.json")

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(
                {
                    "intent": self.intent,
                    "dataset_name": self.dataset_name,
                    "actions_count": self.actions_count,
                    "task_id": self.task_id,
                    "eval": self.eval,
                    "steps": [d.model_dump() for d in self.steps],
                    "score": self.score,
                },
                f,
                ensure_ascii=False,
                indent=4,
            )

    def finish_task(
        self,
        task_id: str,
        site: str,
        intent: str,
        agent_answer: Optional[str] = None,
        eval: Optional[str] = None,
        score: Optional[float] = None,
        exception: Optional[bool] = None,
        num_steps: Optional[int] = None,
        fail_category: Optional[str] = None,
        agent_v: Optional[str] = None,
    ) -> str:
        """
        Mark a task as finished and update result files.

        Args:
            task_id (str): Required unique identifier for the task
            site (str): Required site name
            intent (str): Task intent/description
            agent_answer (str, optional): Agent's answer
            eval (str, optional): Evaluation details
            score (float, optional): Task score
            exception (bool, optional): Whether an exception occurred
            num_steps (int, optional): Number of steps taken
            fail_category (str, optional): Category of failure if applicable
            agent_v (str, optional): Agent version

        Returns:
            str: The ID of the finished task
        """
        if not self.experiment_folder:
            raise ValueError("No experiment started. Call start_experiment() first.")

        # Add task to internal storage
        self.tasks[task_id] = {
            "site": site,
            "intent": intent,
            "agent_answer": agent_answer,
            "eval": eval,
            "score": score,
            "exception": exception,
            "num_steps": num_steps,
            "fail_category": fail_category,
            "agent_v": agent_v,
        }

        # Update result files
        self._update_result_files()
        self._add_to_progress_file(task_id)

        return task_id

    def _update_result_files(self) -> None:
        """Update both JSON and CSV result files."""
        if not self.experiment_folder:
            return

        experiment_dir = os.path.join(self._base_dir, self.experiment_folder)

        # Update results.json
        results_json_path = os.path.join(experiment_dir, "results.json")
        with open(results_json_path, 'w', encoding='utf-8') as f:
            json.dump(self.tasks, f, indent=2, ensure_ascii=False)

        # Update results.csv
        self._save_csv(experiment_dir)

    def _save_csv(self, experiment_dir: str) -> None:
        """Save current tasks to CSV file using pandas."""
        # Define the column order
        columns = [
            'task_id',
            'site',
            'intent',
            'agent_answer',
            'eval',
            'score',
            'exception',
            'num_steps',
            'fail_category',
            'agent_v',
        ]

        if not self.tasks:
            # Create empty DataFrame with headers if no tasks
            df = pd.DataFrame(columns=columns)
        else:
            # Convert tasks dictionary to list of dictionaries for DataFrame
            data = []
            for task_id, task_data in self.tasks.items():
                row = {'task_id': task_id}
                row.update(task_data)
                data.append(row)

            # Create DataFrame
            df = pd.DataFrame(data)

            # Reorder columns to match the desired order
            df = df.reindex(columns=columns)

        # Save to CSV
        results_csv_path = os.path.join(experiment_dir, "results.csv")
        df.to_csv(results_csv_path, index=False, encoding='utf-8')

    def _add_to_progress_file(self, task_id: str) -> None:
        """Add a task ID to the .progress file."""
        if not self.experiment_folder:
            return

        progress_path = os.path.join(self._base_dir, self.experiment_folder, ".progress")
        with open(progress_path, 'a', encoding='utf-8') as f:
            f.write(task_id + '\n')

    def update_task(
        self,
        task_id: str,
        site: Optional[str] = None,
        intent: Optional[str] = None,
        agent_answer: Optional[str] = None,
        eval: Optional[str] = None,
        score: Optional[float] = None,
        exception: Optional[bool] = None,
        num_steps: Optional[int] = None,
        fail_category: Optional[str] = None,
        agent_v: Optional[str] = None,
    ) -> bool:
        """
        Update an existing task.

        Args:
            task_id (str): ID of the task to update
            site (str, optional): New site
            intent (str, optional): New intent
            agent_answer (str, optional): New agent answer
            eval (str, optional): New evaluation
            score (float, optional): New score
            exception (bool, optional): New exception status
            num_steps (int, optional): New number of steps
            fail_category (str, optional): New fail category
            agent_v (str, optional): New agent version

        Returns:
            bool: True if task was updated, False if task not found
        """
        if task_id not in self.tasks:
            return False

        # Update only provided fields
        if site is not None:
            self.tasks[task_id]["site"] = site
        if intent is not None:
            self.tasks[task_id]["intent"] = intent
        if agent_answer is not None:
            self.tasks[task_id]["agent_answer"] = agent_answer
        if eval is not None:
            self.tasks[task_id]["eval"] = eval
        if score is not None:
            self.tasks[task_id]["score"] = score
        if exception is not None:
            self.tasks[task_id]["exception"] = exception
        if num_steps is not None:
            self.tasks[task_id]["num_steps"] = num_steps
        if fail_category is not None:
            self.tasks[task_id]["fail_category"] = fail_category
        if agent_v is not None:
            self.tasks[task_id]["agent_v"] = agent_v

        self._update_result_files()
        return True

    def remove_task(self, task_id: str) -> bool:
        """
        Remove a task from the results.

        Args:
            task_id (str): ID of the task to remove

        Returns:
            bool: True if task was removed, False if task not found
        """
        if task_id in self.tasks:
            del self.tasks[task_id]
            self._update_result_files()
            return True
        return False

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific task by ID.

        Args:
            task_id (str): ID of the task to retrieve

        Returns:
            Dict containing task data or None if not found
        """
        return self.tasks.get(task_id)

    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all tasks.

        Returns:
            Dict containing all tasks
        """
        return self.tasks.copy()

    def find_tasks_by_score(self, score: float) -> Dict[str, Dict[str, Any]]:
        """
        Find all tasks with a specific score.

        Args:
            score (float): Score to search for

        Returns:
            Dict containing matching tasks
        """
        return {task_id: task for task_id, task in self.tasks.items() if task.get("score") == score}

    def find_tasks_by_site(self, site: str) -> Dict[str, Dict[str, Any]]:
        """
        Find all tasks with a specific site.

        Args:
            site (str): Site to search for

        Returns:
            Dict containing matching tasks
        """
        return {task_id: task for task_id, task in self.tasks.items() if task.get("site") == site}

    def find_tasks_by_exception(self, exception: bool) -> Dict[str, Dict[str, Any]]:
        """
        Find all tasks with specific exception status.

        Args:
            exception (bool): Exception status to search for

        Returns:
            Dict containing matching tasks
        """
        return {task_id: task for task_id, task in self.tasks.items() if task.get("exception") == exception}

    def find_tasks_by_agent_version(self, agent_v: str) -> Dict[str, Dict[str, Any]]:
        """
        Find all tasks with a specific agent version.

        Args:
            agent_v (str): Agent version to search for

        Returns:
            Dict containing matching tasks
        """
        return {task_id: task for task_id, task in self.tasks.items() if task.get("agent_v") == agent_v}

    def clear_all_tasks(self) -> None:
        """Remove all tasks from result files."""
        self.tasks = {}
        if self.experiment_folder:
            self._update_result_files()
            # Clear progress file
            progress_path = os.path.join(self._base_dir, self.experiment_folder, ".progress")
            with open(progress_path, 'w', encoding='utf-8') as f:
                f.truncate(0)

    def get_task_count(self) -> int:
        """
        Get the total number of tasks.

        Returns:
            int: Number of tasks
        """
        return len(self.tasks)

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get basic statistics about the tasks.

        Returns:
            Dict containing task statistics
        """
        if not self.tasks:
            return {"total_tasks": 0}

        stats = {
            "total_tasks": len(self.tasks),
            "tasks_with_exceptions": len([t for t in self.tasks.values() if t.get("exception") is True]),
            "tasks_without_exceptions": len([t for t in self.tasks.values() if t.get("exception") is False]),
            "unique_sites": len(set(t.get("site") for t in self.tasks.values() if t.get("site"))),
            "unique_agent_versions": len(
                set(t.get("agent_v") for t in self.tasks.values() if t.get("agent_v"))
            ),
        }

        # Score statistics
        scores = [t.get("score") for t in self.tasks.values() if t.get("score") is not None]
        if scores:
            stats["average_score"] = sum(scores) / len(scores)
            stats["min_score"] = min(scores)
            stats["max_score"] = max(scores)

        return stats

    def get_dataframe(self) -> pd.DataFrame:
        """
        Get all tasks as a pandas DataFrame.

        Returns:
            pd.DataFrame: DataFrame containing all tasks
        """
        columns = [
            'task_id',
            'site',
            'intent',
            'agent_answer',
            'eval',
            'score',
            'exception',
            'num_steps',
            'fail_category',
            'agent_v',
        ]

        if not self.tasks:
            return pd.DataFrame(columns=columns)

        data = []
        for task_id, task_data in self.tasks.items():
            row = {'task_id': task_id}
            row.update(task_data)
            data.append(row)

        df = pd.DataFrame(data)
        return df.reindex(columns=columns)

    def _copy_task_json_files(
        self,
        source_folders: List[str],
        target_folder: str,
        selected_task_ids: List[str],
        base_dir: str = None,
    ) -> None:
        """
        Copy individual task JSON files from source folders to target folder.

        Args:
            source_folders (List[str]): List of source experiment folder names
            target_folder (str): Target experiment folder name
            selected_task_ids (List[str]): List of task IDs to copy
            base_dir (str, optional): Base directory. If None, uses instance base_dir
        """
        if base_dir is None:
            base_dir = self._base_dir

        target_dir = os.path.join(base_dir, target_folder)

        copied_files = 0
        skipped_files = 0

        for task_id in selected_task_ids:
            file_found = False

            # Look for the task JSON file in each source folder
            for folder_name in source_folders:
                source_dir = os.path.join(base_dir, folder_name)
                source_file = os.path.join(source_dir, f"{task_id}.json")

                if os.path.exists(source_file):
                    target_file = os.path.join(target_dir, f"{task_id}.json")

                    try:
                        # Copy the file
                        shutil.copy2(source_file, target_file)
                        logger.debug(f"Copied {task_id}.json from {folder_name}")
                        copied_files += 1
                        file_found = True
                        break  # Found and copied, move to next task

                    except Exception as e:
                        logger.error(f"Failed to copy {task_id}.json from {folder_name}: {e}")

            if not file_found:
                logger.warning(f"Task JSON file {task_id}.json not found in any source folder")
                skipped_files += 1

        logger.info(f"Task JSON files - Copied: {copied_files}, Skipped: {skipped_files}")

    def merge_experiments(
        self,
        experiment_folders: List[str],
        output_experiment_name: str,
        description: Optional[str] = "Merged experiments",
    ) -> str:
        """
        Merge multiple experiment folders, preferring tasks with score 1.0 over 0.0.
        Also copies individual task JSON files from source experiments.

        Args:
            experiment_folders (List[str]): List of experiment folder names to merge
            output_experiment_name (str): Name for the merged experiment
            description (str, optional): Description for the merged experiment

        Returns:
            str: The merged experiment folder name
        """
        logger.info(f"Starting merge of {len(experiment_folders)} experiments")

        # Create new experiment for merged results
        merged_folder = self.start_experiment(
            task_ids=[],  # Will be populated with merged task IDs
            experiment_name=output_experiment_name,
            description=description,
        )

        merged_tasks = {}
        all_task_ids = set()
        task_source_mapping = {}  # Track which folder each task came from

        # First pass: collect all tasks and identify duplicates
        for folder_name in experiment_folders:
            folder_path = os.path.join(self._base_dir, folder_name)
            results_json_path = os.path.join(folder_path, "results.json")

            if not os.path.exists(results_json_path):
                logger.warning(f"Results file not found in {folder_name}, skipping")
                continue

            try:
                with open(results_json_path, 'r', encoding='utf-8') as f:
                    folder_tasks = json.load(f)

                logger.info(f"Processing {len(folder_tasks)} tasks from {folder_name}")

                for task_id, task_data in folder_tasks.items():
                    all_task_ids.add(task_id)

                    if task_id not in merged_tasks:
                        # First occurrence of this task
                        merged_tasks[task_id] = {**task_data, 'source_experiment': folder_name}
                        task_source_mapping[task_id] = folder_name
                        logger.debug(f"Added new task {task_id} from {folder_name}")
                    else:
                        # Task already exists, apply preference logic
                        existing_score = merged_tasks[task_id].get('score', 0.0)
                        new_score = task_data.get('score', 0.0)

                        # Prefer score 1.0 over others, then higher scores
                        should_replace = False

                        if existing_score == 1.0 and new_score != 1.0:
                            # Keep existing (perfect score)
                            should_replace = False
                        elif existing_score != 1.0 and new_score == 1.0:
                            # Replace with perfect score
                            should_replace = True
                        elif existing_score == new_score:
                            # Same score, keep existing (first found)
                            should_replace = False
                        else:
                            # Different scores, prefer higher
                            should_replace = new_score > existing_score

                        if should_replace:
                            merged_tasks[task_id] = {**task_data, 'source_experiment': folder_name}
                            task_source_mapping[task_id] = folder_name
                            logger.debug(
                                f"Replaced task {task_id}: {existing_score} -> {new_score} from {folder_name}"
                            )
                        else:
                            logger.debug(
                                f"Kept existing task {task_id}: score {existing_score} vs {new_score}"
                            )

            except Exception as e:
                logger.error(f"Error processing {folder_name}: {e}")
                continue

        # Update the merged experiment with final task list
        self.tasks = merged_tasks

        # Update metadata with actual task IDs
        if self.tasks_metadata:
            self.tasks_metadata.task_ids = list(all_task_ids)

            # Save updated metadata
            experiment_dir = os.path.join(self._base_dir, merged_folder)
            metadata_path = os.path.join(experiment_dir, "metadata.json")
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(self.tasks_metadata.model_dump(), f, indent=2, ensure_ascii=False)

        # Update result files with merged data
        self._update_result_files()

        # Update progress file with all task IDs
        for task_id in merged_tasks.keys():
            self._add_to_progress_file(task_id)

        # Copy individual task JSON files
        logger.info("Copying individual task JSON files...")
        selected_task_ids = list(merged_tasks.keys())
        self._copy_task_json_files(experiment_folders, merged_folder, selected_task_ids)

        logger.success(f"Successfully merged {len(merged_tasks)} tasks into {merged_folder}")
        logger.info(f"Source experiments: {experiment_folders}")

        # Log merge statistics
        score_distribution = {}
        source_distribution = {}
        for task_data in merged_tasks.values():
            score = task_data.get('score', 0.0)
            source = task_data.get('source_experiment', 'unknown')
            score_distribution[score] = score_distribution.get(score, 0) + 1
            source_distribution[source] = source_distribution.get(source, 0) + 1

        logger.info(f"Score distribution in merged results: {score_distribution}")
        logger.info(f"Source distribution in merged results: {source_distribution}")

        return merged_folder

    def list_experiment_folders(self, base_path: Optional[str] = None) -> List[str]:
        """
        List all available experiment folders.

        Args:
            base_path (str, optional): Base directory to search for experiments.
                                     If None, uses instance base_dir

        Returns:
            List[str]: List of experiment folder names
        """
        if base_path is None:
            base_path = self._base_dir

        if not os.path.exists(base_path):
            logger.warning(f"Base path {base_path} does not exist")
            return []

        folders = []
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path):
                # Check if it looks like an experiment folder (has metadata.json)
                metadata_path = os.path.join(item_path, "metadata.json")
                if os.path.exists(metadata_path):
                    folders.append(item)

        logger.info(f"Found {len(folders)} experiment folders")
        return sorted(folders)

    @staticmethod
    def list_experiment_folders_static(base_path: str = "./logging/trajectory_data") -> List[str]:
        """
        Static method to list all available experiment folders.

        Args:
            base_path (str): Base directory to search for experiments

        Returns:
            List[str]: List of experiment folder names
        """
        if not os.path.exists(base_path):
            logger.warning(f"Base path {base_path} does not exist")
            return []

        folders = []
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path):
                # Check if it looks like an experiment folder (has metadata.json)
                metadata_path = os.path.join(item_path, "metadata.json")
                if os.path.exists(metadata_path):
                    folders.append(item)

        logger.info(f"Found {len(folders)} experiment folders")
        return sorted(folders)

    def get_experiment_progress(self, experiment_folder_name: str) -> Dict[str, Any]:
        """
        Get the progress of a specific experiment.

        Args:
            experiment_folder_name (str): The name of the experiment folder.

        Returns:
            Dict[str, Any]: A dictionary containing 'total_tasks', 'completed_tasks', and 'uncompleted_task_ids'.
                            Returns default values if files are not found or errors occur.
        """
        experiment_dir = os.path.join(self._base_dir, experiment_folder_name)
        metadata_path = os.path.join(experiment_dir, "metadata.json")
        progress_path = os.path.join(experiment_dir, ".progress")

        total_tasks = 0
        completed_tasks = 0
        all_task_ids = set()
        completed_task_ids = set()

        # Read total tasks from metadata.json
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                all_task_ids = set(metadata.get('task_ids', []))
                total_tasks = len(all_task_ids)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Error reading metadata.json for {experiment_folder_name}: {e}")
        else:
            logger.warning(f"metadata.json not found for experiment: {experiment_folder_name}")

        # Read completed tasks from .progress
        if os.path.exists(progress_path):
            try:
                with open(progress_path, 'r', encoding='utf-8') as f:
                    completed_task_ids = set(line.strip() for line in f if line.strip())
                completed_tasks = len(completed_task_ids)
            except IOError as e:
                logger.error(f"Error reading .progress file for {experiment_folder_name}: {e}")
        else:
            logger.info(f".progress file not found for experiment: {experiment_folder_name}")

        uncompleted_task_ids = list(sorted(list(all_task_ids - completed_task_ids)))

        return {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "uncompleted_task_ids": uncompleted_task_ids,
        }


# Example usage
if __name__ == "__main__":
    # Create an ActivityTracker instance
    tracker = ActivityTracker()

    # Set a custom base directory (optional)
    tracker.set_base_dir("./custom_logging/experiments")
    logger.info(f"Current base directory: {tracker.get_base_dir()}")

    # Start an experiment
    logger.info("Starting experiment...")
    experiment_folder = tracker.start_experiment(
        task_ids=["task_001", "task_002", "task_003"],
        experiment_name="z_spotify_experiment",
        description="Testing Spotify automation tasks",
    )
    logger.info(f"Experiment folder created: {experiment_folder}")

    # Finish some tasks
    logger.info("Finishing tasks...")
    tracker.finish_task(
        task_id="spotify_task_001",
        site="spotify.com",
        intent="Play the most listened to song on Spotify from the Velvet Underground album.",
        agent_answer="Successfully played 'Sweet Jane' from The Velvet Underground & Nico album",
        eval="Task completed successfully",
        score=0.1,
        exception=False,
        num_steps=5,
        fail_category=None,
        agent_v="v2.1.0",
    )

    tracker.finish_task(
        task_id="payment_task_002",
        site="paymentgateway.com",
        intent="Process Credit Card payment",
        agent_answer="Payment failed due to insufficient funds",
        eval="Payment processing failed",
        score=1.0,
        exception=True,
        num_steps=3,
        fail_category="payment_error",
        agent_v="v2.0.5",
    )

    logger.info(f"Total tasks: {tracker.get_task_count()}")
    logger.info(f"Statistics: {tracker.get_statistics()}")

    # Find tasks by site
    spotify_tasks = tracker.find_tasks_by_site("spotify.com")
    logger.info(f"Spotify tasks: {len(spotify_tasks)}")

    # Get DataFrame view of the data
    df = tracker.get_dataframe()
    logger.info(f"DataFrame shape: {df.shape}")
    logger.debug(f"DataFrame head:\n{df.head()}")

    logger.success("Files created in experiment folder:")
    logger.info(f"- {tracker.get_base_dir()}/{experiment_folder}/metadata.json")
    logger.info(f"- {tracker.get_base_dir()}/{experiment_folder}/results.json")
    logger.info(f"- {tracker.get_base_dir()}/{experiment_folder}/results.csv")
    logger.info(f"- {tracker.get_base_dir()}/{experiment_folder}/.progress")

    # Example of listing experiments using instance method
    logger.info("Available experiments (instance method):")
    available_experiments = tracker.list_experiment_folders()
    for exp in available_experiments:
        logger.info(f"  - {exp}")

    # Example of listing experiments using static method with default path
    logger.info("Available experiments (static method with default path):")
    static_experiments = ActivityTracker.list_experiment_folders_static()
    for exp in static_experiments:
        logger.info(f"  - {exp}")

    # Example of listing experiments using static method with custom path
    logger.info("Available experiments (static method with custom path):")
    custom_experiments = ActivityTracker.list_experiment_folders_static("./custom_logging/experiments")
    for exp in custom_experiments:
        logger.info(f"  - {exp}")

    # Example merge (if there are multiple experiments)
    if len(available_experiments) >= 2:
        logger.info("Demonstrating merge functionality...")
        merged_folder = tracker.merge_experiments(
            experiment_folders=available_experiments[:2],
            output_experiment_name="merged_experiment",
            description="Merged from multiple experiments",
        )
        logger.success(f"Merged experiment created: {merged_folder}")
