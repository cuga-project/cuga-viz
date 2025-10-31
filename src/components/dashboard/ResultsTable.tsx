// @ts-nocheck

import React, { useState, useEffect } from "react";
import ExpandableText from "../ExpandableText";
import { Link } from "react-router-dom"; // Add this import at the top

// Default fallback configuration if none is provided
const DEFAULT_COLUMN_CONFIG = {};

const ResultsTable = ({
  data = [],
  columns = [],
  isLoading = false,
  columnConfig = {}, // New prop to receive column config
  experimentName,
}) => {
  // State
  const [configuredColumns, setConfiguredColumns] = useState({});
  const [filters, setFilters] = useState({});
  const [categoricalFilters, setCategoricalFilters] = useState({});
  const [sorting, setSorting] = useState({ column: null, direction: "asc" });

  // Use provided column config or fall back to default
  useEffect(() => {
    const mergedConfig = {
      ...DEFAULT_COLUMN_CONFIG,
      ...columnConfig,
    };

    setConfiguredColumns(mergedConfig);

    if (columns.length > 0) {
      populateCategoricalValues(data, mergedConfig);
    }
  }, [columnConfig, columns, data]);

  // Functions

  const populateCategoricalValues = (data, config = configuredColumns) => {
    if (!data.length) return;

    const updatedConfig = { ...config };

    Object.keys(updatedConfig).forEach((columnName) => {
      if (updatedConfig[columnName].isCategorical) {
        updatedConfig[columnName].allowedValues = getCategoricalOptions(columnName, data);
      }
    });

    setConfiguredColumns(updatedConfig);
  };

  const getCategoricalOptions = (column, sourceData = data) => {
    const uniqueValues = [...new Set(sourceData.map((row) => row[column]))];
    return uniqueValues.filter((value) => value !== undefined && value !== null);
  };

  const handleFilterChange = (column, value) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const handleCategoricalFilterChange = (column, value) => {
    setCategoricalFilters((prev) => {
      const current = prev[column] || [];
      return {
        ...prev,
        [column]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handleSortChange = (column) => {
    setSorting((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getCellBackgroundColor = (column, value) => {
    const config = configuredColumns[column]?.backgroundColorConfig;
    if (!config) return "";

    if (config.type === "range" && typeof value === "number") {
      const range = config.ranges.find((range) => value >= range.min && value <= range.max);
      return range ? range.color : "";
    }

    if (config.type === "categorical" && config.categories[value]) {
      return config.categories[value];
    }

    return "";
  };

  function parseFunction(functionString) {
    // For arrow functions
    if (functionString.includes("=>")) {
      return new Function("return " + functionString)();
    }
    // For regular functions
    return new Function("return function " + functionString)();
  }

  //@ts-ignore
  const getTransformedCellValue = (column, value, columnIndex) => {
    // Special case for first column (index 0) - add a link
    if (columnIndex === 0) {
      return (
        <Link
          to={`/trajectories/${experimentName ? `${experimentName}/` : ""}${value}`}
          target="_blank"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {value}
        </Link>
      );
    }

    // For other columns, use the configured transform if available
    const transform = configuredColumns[column]?.valueTransform;
    if (transform) {
      try {
        // If it's a string representation of a function, parse it
        if (typeof transform === "string") {
          return parseFunction(transform)(value);
        }
        // If it's already a function, just call it
        if (typeof transform === "function") {
          return transform(value);
        }
      } catch (error) {
        console.error(`Error transforming value for column ${column}:`, error);
      }
    }

    return value;
  };

  // Filter and sort data
  const filteredData = data.filter((row) => {
    // Text filters
    const textFilterPassed = Object.entries(filters).every(([column, filterValue]) => {
      if (!filterValue) return true;
      const cellValue = String(row[column] || "").toLowerCase();
      return cellValue.includes(filterValue.toLowerCase());
    });

    // Categorical filters
    const categoricalFilterPassed = Object.entries(categoricalFilters).every(([column, selectedValues]) => {
      //@ts-ignore

      if (!selectedValues || selectedValues.length === 0) return true;
      //@ts-ignore

      return selectedValues.includes(row[column]);
    });

    return textFilterPassed && categoricalFilterPassed;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sorting.column) return 0;

    const aValue = a[sorting.column];
    const bValue = b[sorting.column];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sorting.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const aString = String(aValue || "").toLowerCase();
    const bString = String(bValue || "").toLowerCase();

    return sorting.direction === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString);
  });

  // Get visible and filterable columns
  const visibleColumns = Object.entries(configuredColumns)
    .filter(
      //@ts-ignore

      ([columnName, config]) => !config.hidden && columns.includes(columnName)
    )
    //@ts-ignore

    .sort((a, b) => a[1].position - b[1].position)
    .map(([columnName]) => columnName);

  const filterableColumns = visibleColumns.filter(
    //@ts-ignore
    (column) => configuredColumns[column]?.filterable
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-700">Experiment Trajectory Overview</h2>
        <div className="text-sm text-gray-600">
          Showing {sortedData.length} of {data.length} results
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filterableColumns.map((column) => {
          // For categorical columns, show multi-select dropdowns
          if (
            //@ts-ignore
            configuredColumns[column]?.isCategorical
          ) {
            //@ts-ignore
            const options = configuredColumns[column].allowedValues;
            //@ts-ignore
            const selectedValues = categoricalFilters[column] || [];

            return (
              <div key={column} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {column.charAt(0).toUpperCase() + column.slice(1)}:
                </label>
                <div className="border border-gray-300 rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {
                      //@ts-ignore
                      options.map((option) => (
                        <div
                          key={option}
                          className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                            selectedValues.includes(option)
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          onClick={() => handleCategoricalFilterChange(column, option)}
                        >
                          {option}
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            );
          }

          // For other columns, show text input filters
          return (
            <div key={column} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {column.charAt(0).toUpperCase() + column.slice(1)}:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Filter ${column}`}
                  className="w-full p-2 pl-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={
                    //@ts-ignore
                    filters[column] || ""
                  }
                  onChange={(e) => handleFilterChange(column, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSortChange(column)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column}</span>
                    {sorting.column === column && (
                      <span className="ml-1">{sorting.direction === "asc" ? "↑" : "↓"}</span>
                    )}
                    {
                      //@ts-ignore
                      configuredColumns[column]?.filterable && <span className="ml-1 text-green-500 text-xs">●</span>
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : sortedData.length > 0 ? (
              sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {visibleColumns.map((column, columnIndex) => {
                    // Add columnIndex here
                    const rawValue = row[column];
                    // Pass columnIndex as the third parameter
                    const transformedValue = getTransformedCellValue(column, rawValue, columnIndex);
                    const bgColor = getCellBackgroundColor(column, rawValue);
                    const maxLength =
                      //@ts-ignore
                      configuredColumns[column]?.maxTextLength || 100;

                    const cellStyle = bgColor
                      ? {
                          backgroundColor: bgColor,
                          color: ["#ef4444", "#b91c1c", "#991b1b"].includes(bgColor) ? "white" : "inherit",
                        }
                      : {};

                    return (
                      <td key={column} className="px-3 py-2 text-sm" style={cellStyle}>
                        {typeof transformedValue === "string" && transformedValue.length > maxLength ? (
                          <ExpandableText text={transformedValue} maxLength={maxLength} />
                        ) : (
                          transformedValue // This can now be a React element (Link)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-6 text-center text-sm text-gray-500">
                  No results match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
