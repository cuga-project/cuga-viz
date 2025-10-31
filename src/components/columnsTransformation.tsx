// @ts-nocheck
// Column transformation and color configuration

// Define transformations for column values
const columnTransformations = {
  // Example: transform score values
  score: {
    "1.0": "pass",
    "0.0": "fail",
    // Add more mappings as needed
  },
  // Add transformations for other columns as needed
  "fail category": {
    // Add your transformations here if needed
  },
};

// Column display configuration
const columnConfig = {
  // Default settings for all columns
  default: {
    applyColors: false,
    isCategorical: false,
    formatFn: (value) => value,
    maxWidth: 200,
  },

  // Column-specific settings
  score: {
    applyColors: true,
    isCategorical: true,
    categories: {
      pass: "#22c55e", // Green for pass
      fail: "#ef4444", // Red for fail
      "1.0": "#22c55e", // Backup for untransformed values
      "0.0": "#ef4444", // Backup for untransformed values
    },
    ranges: [
      { min: 0, max: 0.7, color: "#ef4444" }, // Red for low scores
      { min: 0.7, max: 0.9, color: "#eab308" }, // Yellow for medium
      { min: 0.9, max: 1, color: "#22c55e" }, // Green for high scores
    ],
    formatFn: (value) => {
      if (typeof value === "number") {
        return `${(value * 100).toFixed(2)}%`;
      }
      return value;
    },
  },

  "task id": {
    maxWidth: 120,
  },

  site: {
    applyColors: true,
    isCategorical: true,
    categories: {}, // Will be populated dynamically
    maxWidth: 120,
  },

  intent: {
    maxWidth: 250,
  },

  "num steps": {
    formatFn: (value) => value?.toString(),
    maxWidth: 100,
  },

  "agent answer": {
    maxWidth: 300,
  },

  "fail category": {
    applyColors: true,
    isCategorical: true,
    categories: {}, // Will be populated dynamically
    maxWidth: 150,
  },

  "agent v": {
    maxWidth: 100,
  },
};

// Function to transform a cell value based on configuration
const transformCellValue = (column, value) => {
  // Get column's transformation rules
  const transformRules = columnTransformations[column];

  // If we have transformation rules for this column and the value exists in the rules
  if (transformRules && value !== undefined && value !== null) {
    const valueStr = String(value);
    if (valueStr in transformRules) {
      return transformRules[valueStr];
    }
  }

  // If no transformation applies, return the original value
  return value;
};

// Function to format a cell value for display
const formatCellValue = (column, value) => {
  if (value === undefined || value === null) return "";

  // Get column-specific config or use default
  const config = columnConfig[column] || columnConfig.default;

  // Apply the format function if it exists
  if (config.formatFn) {
    return config.formatFn(value);
  }

  return String(value);
};

// Function to determine cell color
const getCellColor = (column, value) => {
  // Get column-specific config or use default
  const config = columnConfig[column] || columnConfig.default;

  // Only apply colors if configuration says so
  if (!config.applyColors) return "";

  // For categorical values
  if (config.isCategorical && config.categories) {
    const valueStr = String(value);
    if (valueStr in config.categories) {
      return config.categories[valueStr];
    }
  }

  // For numerical values with ranges
  if (!config.isCategorical && config.ranges && typeof value === "number") {
    const range = config.ranges.find(
      (range) => value >= range.min && value <= range.max
    );

    return range ? range.color : "";
  }

  return "";
};

// Function to get cell width style based on configuration
const getCellWidthStyle = (column) => {
  const config = columnConfig[column] || columnConfig.default;
  if (config.maxWidth) {
    return {
      maxWidth: `${config.maxWidth}px`,
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
  }
  return {};
};

// Function to initialize categories with dynamic colors
const initializeCategoryColors = (column, uniqueValues) => {
  const config = columnConfig[column];
  if (!config || !config.isCategorical) return;

  // Skip if categories are already defined
  if (Object.keys(config.categories).length > 0) return;

  // Generate colors for each unique value
  const colorPalette = [
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#ef4444", // Red
    "#eab308", // Yellow
    "#a855f7", // Purple
    "#ec4899", // Pink
    "#14b8a6", // Teal
    "#f97316", // Orange
    "#64748b", // Slate
    "#84cc16", // Lime
  ];

  uniqueValues.forEach((value, index) => {
    if (value !== undefined && value !== null) {
      config.categories[String(value)] =
        colorPalette[index % colorPalette.length];
    }
  });
};

export {
  columnTransformations,
  columnConfig,
  transformCellValue,
  formatCellValue,
  getCellColor,
  getCellWidthStyle,
  initializeCategoryColors,
};
