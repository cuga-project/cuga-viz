/**
 * Parses JSON data safely
 * @param {string|Object} jsonData - The JSON data to parse
 * @returns {Object|null} - Parsed object or null if parsing fails
 */
export function parseJsonSafely(jsonData: any) {
  if (!jsonData) return null;

  try {
    if (typeof jsonData === "string") {
      const trimmed = jsonData.trim();
      // Only attempt JSON.parse if the string looks like JSON
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.parse(trimmed);
      }
      // Return the original string when it's not JSON (e.g., markdown/text)
      return jsonData;
    }
    return jsonData;
  } catch (e) {
    // Be quiet on parse errors to avoid noisy console when content isn't JSON
    // console.warn("Non-JSON content encountered in parseJsonSafely");
    return null;
  }
}

/**
 * Renders key-value pairs as formatted HTML
 * @param {Object} obj - The object to render
 * @returns {JSX.Element} - Formatted display of object properties
 */
export function printKeys(obj: any) {
  if (!obj || typeof obj !== "object") {
    return <div>No data available</div>;
  }

  return (
    <div className="key-value-display">
      {Object.entries(obj).map(([key, value], index) => {
        if (Array.isArray(value)) {
          return (
            <div key={index}>
              <div>
                <b>{key}:</b>
              </div>
              {value.filter(Boolean).map((v, i) => (
                <div key={i}>
                  {i + 1}. {v}
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <div key={index}>
              <b>{key}</b>: {String(value)}
            </div>
          );
        }
      })}
    </div>
  );
}

/**
 * Renders action for display purposes
 * @param {string} action - The action to render
 * @returns {JSX.Element} - Formatted action display
 */
export function getRenderAction(action: string) {
  return (
    <div className="action-object" style={{ backgroundColor: "grey" }}>
      <pre>{action}</pre>
    </div>
  );
}
