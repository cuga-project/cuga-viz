/**
 * Fetches trajectory data from the API for a given task ID
 * @param {string} taskId - ID of the task to fetch
 * @returns {Promise<Object>} - The trajectory data
 */

export async function fetchTrajectoryData(taskId: string, experimentName?: string) {
  try {
    const timestamp = Date.now();
    const path = experimentName ? `/data/${encodeURIComponent(experimentName)}/${encodeURIComponent(taskId)}.json` : `/data/${encodeURIComponent(taskId)}.json`;
    const response = await fetch(`${path}?t=${timestamp}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trajectory data: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching trajectory data:", error);
    throw error;
  }
}

export async function fetchDataTable(experimentName?: string) {
  try {
    const query = experimentName ? `?experiment_name=${encodeURIComponent(experimentName)}` : "";
    const response = await fetch(`/api/get_data_table${query}`);

    if (!response.ok) {
      throw new Error(`Error fetching data table: ${response.status}`);
    }

    const jsonResponse = await response.json();

    // API can now return an object with data, columnConfig, and columns
    // Or handle legacy API that only returns an array of data
    if (Array.isArray(jsonResponse)) {
      // Legacy API response - just data array
      return {
        data: jsonResponse,
        columns: jsonResponse.length > 0 ? Object.keys(jsonResponse[0]) : [],
        columnConfig: {}, // No column config in this case
      };
    } else {
      // New API response format with both data and column config
      return {
        data: jsonResponse.data || [],
        columns: jsonResponse.columns || (jsonResponse.data?.length > 0 ? Object.keys(jsonResponse.data[0]) : []),
        columnConfig: jsonResponse.columnConfig || {},
      };
    }
  } catch (error) {
    console.error("Error in fetchDataTable:", error);
    return { data: [], columns: [], columnConfig: {} };
  }
}

/**
 * Fetches global configuration for step rendering
 * @returns {Promise<Object>} - The configuration data
 */
export async function fetchConfig() {
  try {
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error(`Failed to fetch configuration: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching configuration:", error);
    throw error;
  }
}

export async function fetchStatsTables(experimentName?: string) {
  try {
    const query = experimentName ? `?experiment_name=${encodeURIComponent(experimentName)}` : "";
    const response = await fetch(`/api/stats${query}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch configuration: ${response.status} ${response.statusText}`);
    }

    return (await response.json())["tables"];
  } catch (error) {
    console.error("Error fetching configuration:", error);
    throw error;
  }
}

/**
 * Updates global configuration for step rendering
 * @param {Object} config - The new configuration
 * @returns {Promise<Object>} - The updated configuration
 */
export async function updateConfig(config: any) {
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to update configuration: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating configuration:", error);
    throw error;
  }
}

/**
 * Calls the assistant API with the user's question
 *
 * @param {string} question - The user's question
 * @returns {Promise<string>} - The response from the assistant
 */
export const echoQuestion = async (question: string, id: string) => {
  try {
    const response = await fetch("/api/assist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: question, id: id }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "No response received from the assistant.";
  } catch (error) {
    console.error("Error calling assistant API:", error);

    // Fallback to echo for development/testing when API is not available
    return `API Error: Could not reach the assistant service. (Fallback: You asked: "${question}")`;
  }
};

/**
 * Fetches logged experiments from the server
 * @param {number} page - The page number (default: 1)
 * @param {number} per_page - Number of experiments per page (default: 15)
 * @param {string} search - Search term to filter experiments (default: "")
 * @returns {Promise<Object>} - The experiments data
 */
export async function fetchLoggedExperiments(page: number = 1, per_page: number = 15, search: string = "") {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
      search: search,
    });

    const response = await fetch(`/api/experiments/logged?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch logged experiments: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching logged experiments:", error);
    throw error;
  }
}

/**
 * Fetches active experiment runs
 * @returns {Promise<Object>} - The active runs data
 */
export async function fetchActiveRuns() {
  try {
    const response = await fetch("/api/experiments/active");

    if (!response.ok) {
      throw new Error(`Failed to fetch active runs: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching active runs:", error);
    throw error;
  }
}

/**
 * Runs an experiment
 * @param {string} experimentName - Name of the experiment to run
 * @returns {Promise<Object>} - The response data
 */
export async function runExperiment(experimentName: string) {
  try {
    const response = await fetch("/api/experiments/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experiment_name: experimentName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run experiment: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error running experiment:", error);
    throw error;
  }
}

/**
 * Joins multiple experiments into a new one
 * @param {string[]} experimentNames - Names of experiments to join
 * @param {string} newName - Name for the new joined experiment
 * @returns {Promise<Object>} - The response data
 */
export async function joinExperiments(experimentNames: string[], newName: string) {
  try {
    const response = await fetch("/api/experiments/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experiment_names: experimentNames, new_name: newName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to join experiments: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error joining experiments:", error);
    throw error;
  }
}

/**
 * Deletes an experiment
 * @param {string} experimentName - Name of the experiment to delete
 * @returns {Promise<Object>} - The response data
 */
export async function deleteExperiment(experimentNames: string[]) {
  try {
    const response = await fetch(`/api/experiments/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experiment_names: experimentNames }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete experiment: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting experiment:", error);
    throw error;
  }
}

/**
 * Downloads an experiment as a zip file
 * @param {string} experimentName - Name of the experiment to download
 * @returns {Promise<Blob>} - The zip file blob
 */
export async function downloadExperiment(experimentName: string) {
  try {
    const response = await fetch(`/api/experiments/${experimentName}/download`);

    if (!response.ok) {
      throw new Error(`Failed to download experiment: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error("Error downloading experiment:", error);
    throw error;
  }
}

/**
 * Fetches uncompleted tasks for an experiment
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - The uncompleted tasks data
 */
export async function fetchUncompletedTasks(experimentName: string) {
  try {
    const response = await fetch(`/api/experiments/${experimentName}/tasks/uncompleted`);

    if (!response.ok) {
      throw new Error(`Failed to fetch uncompleted tasks: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching uncompleted tasks:", error);
    throw error;
  }
}

/**
 * Fetches failed tasks for an experiment
 * @param {string} experimentName - Name of the experiment
 * @returns {Promise<Object>} - The failed tasks data
 */
export async function fetchFailedTasks(experimentName: string) {
  try {
    const response = await fetch(`/api/experiments/${experimentName}/tasks/failed`);

    if (!response.ok) {
      throw new Error(`Failed to fetch failed tasks: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching failed tasks:", error);
    throw error;
  }
}

/**
 * Starts a dashboard for a specific experiment
 * @param {string} experimentName - Name of the experiment to start dashboard for
 * @returns {Promise<Object>} - The response data
 */
export async function startDashboard(experimentName: string) {
  try {
    const response = await fetch("/api/dashboard/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experiment_name: experimentName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start dashboard: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error starting dashboard:", error);
    throw error;
  }
}

/**
 * Stops the currently running dashboard
 * @returns {Promise<Object>} - The response data
 */
export async function stopDashboard() {
  try {
    const response = await fetch("/api/dashboard/stop", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to stop dashboard: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error stopping dashboard:", error);
    throw error;
  }
}

/**
 * Gets the current dashboard status
 * @returns {Promise<Object>} - The dashboard status data
 */
export async function getDashboardStatus() {
  try {
    const response = await fetch("/api/dashboard/status");

    if (!response.ok) {
      throw new Error(`Failed to get dashboard status: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting dashboard status:", error);
    throw error;
  }
}
