import os
import signal
import subprocess
import sys
from pathlib import Path
import threading
from typing import Literal
import webbrowser
import typer
import time
from rich.console import Console
from loguru import logger

app = typer.Typer(
    name="cuga-viz",
    help="CugaViz CLI for server management. Use 'start' for trajectory logs or 'run' for experiment management.",
    add_completion=False,
)

console = Console()


def signal_handler(sig, frame):
    console.print("\n[bold yellow]Shutting down server...[/]")
    sys.exit(0)


def get_server_path():
    """Find the server.py file from the package."""
    try:
        # Always use the dashboard.server module for reliability
        return "dashboard.server"
    except Exception as e:
        console.print(f"[bold red]Error finding server path:[/] {e}")
        return "dashboard.server"


def _open_browser(type: Literal["dashboard", "experiments"] = "dashboard", delay: int = 2):
    """Opens the dashboard URL in a separate thread with delay."""

    def open_with_delay():
        time.sleep(delay)  # Wait for server to start
        url = (
            "http://localhost:8989/dashboard" if type == "dashboard" else "http://localhost:8988/experiments"
        )
        console.print(f"[bold blue]Opening {type} in browser:[/] {url}")
        try:
            browser = webbrowser.get('chrome')
            browser.open(url)
        except webbrowser.Error:
            logger.warning("Chrome not found, opening with default browser.")
            webbrowser.open(url)

    # Start in background thread
    threading.Thread(target=open_with_delay, daemon=True).start()


@app.command("start")
def start(
    logs_dir: Path = typer.Argument(
        ...,
        help="Directory containing log files",
        exists=True,
        file_okay=False,
        dir_okay=True,
    ),
    port: int = typer.Option(8989, "--port", "-p", help="Port to run the server on"),
):
    """Start the dashboard server with the specified logs directory."""
    # Get absolute path of logs directory
    logs_abs_path = os.path.abspath(logs_dir)
    console.print(f"[bold green]Starting dashboard with logs from:[/] {logs_abs_path}")

    # Register signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    try:
        server_path = get_server_path()

        # Run the server using python
        if server_path.endswith(".py"):
            console.print(f"[bold blue]Running server from:[/] {server_path}")
            _open_browser("dashboard")
            subprocess.run(
                [sys.executable, server_path, "--data_dir", logs_abs_path, "--port", str(port)],
                check=True,
            )
        else:
            # Run as module
            console.print(f"[bold blue]Running server module:[/] {server_path}")
            _open_browser("dashboard")
            subprocess.run(
                [sys.executable, "-m", server_path, "--data_dir", logs_abs_path, "--port", str(port)],
                check=True,
            )
    except subprocess.CalledProcessError as e:
        console.print(f"[bold red]Error starting server:[/] {e}")
        sys.exit(1)
    except FileNotFoundError as e:
        console.print(f"[bold red]Error:[/] {e}")
        sys.exit(1)
    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/] {e}")
        sys.exit(1)


@app.command("run")
def run(
    experiments_dir: Path = typer.Argument(
        ...,
        help="Directory containing experiment folders",
        exists=True,
        file_okay=False,
        dir_okay=True,
    ),
    port: int = typer.Option(
        8988, "--port", "-p", help="Port to run the experiments server on (default 8988)"
    ),
):
    """Start the experiments manager server with the specified experiments directory."""
    # Get absolute path of experiments directory
    experiments_abs_path = os.path.abspath(experiments_dir)
    console.print(
        f"[bold green]Starting experiments manager with experiments from:[/] {experiments_abs_path}"
    )

    # Register signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)

    try:
        server_path = get_server_path()

        # Run the server using python with experiments_dir parameter
        if server_path.endswith(".py"):
            console.print(f"[bold blue]Running experiments server from:[/] {server_path}")
            _open_browser("experiments")
            subprocess.run(
                [sys.executable, server_path, "--experiments_dir", experiments_abs_path, "--port", str(port)],
                check=True,
            )

        else:
            # Run as module
            console.print(f"[bold blue]Running experiments server module:[/] {server_path}")
            _open_browser("experiments")
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    server_path,
                    "--experiments_dir",
                    experiments_abs_path,
                    "--port",
                    str(port),
                ],
                check=True,
            )

    except subprocess.CalledProcessError as e:
        console.print(f"[bold red]Error starting experiments server:[/] {e}")
        sys.exit(1)
    except FileNotFoundError as e:
        console.print(f"[bold red]Error:[/] {e}")
        sys.exit(1)
    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/] {e}")
        sys.exit(1)


@app.command("examples")
def examples():
    """Show usage examples for the CugaViz CLI."""
    console.print("[bold green]CugaViz CLI Usage Examples:[/]\n")

    console.print("[bold blue]1. Start Dashboard for Trajectory Logs:[/]")
    console.print("   [dim]# Start dashboard server with trajectory logs on default port 8989[/]")
    console.print("   [yellow]uv run cuga-viz start /path/to/logs[/]")
    console.print("   [yellow]uv run cuga-viz start /path/to/logs --port 8990[/]\n")

    console.print("[bold blue]2. Start Experiments Manager:[/]")
    console.print("   [dim]# Start experiments server with experiments directory on default port 8988[/]")
    console.print("   [yellow]uv run cuga-viz run /path/to/experiments[/]")
    console.print("   [yellow]uv run cuga-viz run /path/to/experiments --port 8987[/]\n")

    console.print("[bold blue]3. Access the Web Interface:[/]")
    console.print("   [dim]# For trajectory dashboard:[/]")
    console.print("   [cyan]http://localhost:8989[/]")
    console.print("   [dim]# For experiments manager:[/]")
    console.print("   [cyan]http://localhost:8988/experiments[/]\n")

    console.print("[bold blue]4. Example Directory Structures:[/]")
    console.print("   [dim]# Logs directory should contain .json files:[/]")
    console.print("   [white]logs/[/]")
    console.print("   [white]├── task1.json[/]")
    console.print("   [white]├── task2.json[/]")
    console.print("   [white]└── results.csv[/]\n")

    console.print("   [dim]# Experiments directory should contain experiment folders:[/]")
    console.print("   [white]experiments/[/]")
    console.print("   [white]├── experiment_1/[/]")
    console.print("   [white]│   └── results.json[/]")
    console.print("   [white]├── experiment_2/[/]")
    console.print("   [white]│   └── results.json[/]")
    console.print("   [white]└── test_run/[/]")
    console.print("   [white]    └── results.json[/]")


if __name__ == "__main__":
    app()
