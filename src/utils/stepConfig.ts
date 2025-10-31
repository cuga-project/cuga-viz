/**
 * Default configuration for each step type
 * This is used as a fallback if the API fails
 */
export const defaultStepConfigs = {
  TaskAnalyzerAgent: {
    backgroundColor: "lightblue",
    expandable: true,
  },
  PlannerAgent: {
    backgroundColor: "lightblue",
    expandable: true,
    renderImage: true,
    showCurrentUrl: true,
  },
  ActionAgent: {
    backgroundColor: "yellow",
    expandable: true,
  },
  TaskDecompositionAgent: {
    backgroundColor: "lightgreen",
    expandable: false,
  },
  // Default configuration for any other step type
  default: {
    backgroundColor: "white",
    expandable: false,
  },
};

/**
 * Creates a configuration object with the specified changes
 * @param {Object} baseConfig - Base configuration object
 * @param {string} stepType - The step type to update
 * @param {Object} changes - The changes to apply
 * @returns {Object} - Updated configuration
 */
export function createUpdatedConfig(
  baseConfig: any,
  stepType: any,
  changes: any
) {
  return {
    ...baseConfig,
    [stepType]: {
      ...(baseConfig[stepType] || {}),
      ...changes,
    },
  };
}
