// @ts-nocheck

import { JSX, useState } from "react";
import { parseJsonSafely } from "../utils/renderHelpers";
// Assuming ExpandableText is not used in the provided snippet, otherwise, it should be imported.
// import ExpandableText from "./ExpandableText";
import MarkdownPreview from "@uiw/react-markdown-preview";
import ReactClipboard from "react-clipboardjs-copy";
import "./StepView.css";

interface StepViewProps {
  step: any;
  index: number;
  config: any;
  expandedImages: any;
  toggleImage: (imageId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  }

function StepView({ step, index, config, expandedImages, toggleImage, isCollapsed = false, onToggleCollapse }: StepViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [showJsonPopup, setShowJsonPopup] = useState(false);
  const [showJsonPopupPrompts, setShowJsonPopupPrompts] = useState(false);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["interesting-" + index]));
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    new Set(["main-depth-0", "main-depth-1", "popup-depth-0", "popup-depth-1", "popup-depth-2"]) // Default expanded depths for "main" context
  );

  const stepConfig = config[step.name] ||
    config["default"] || {
      backgroundColor: "var(--color-background)",
      expandable: true,
    };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleKeySection = (keyPath: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(keyPath)) {
      newExpanded.delete(keyPath);
    } else {
      newExpanded.add(keyPath);
    }
    setExpandedKeys(newExpanded);
  };

  const isKeyExpanded = (keyPath: string) => {
    return expandedKeys.has(keyPath);
  };

  const renderImage = (src: string, alt = "", imageId: string) => {
    const isExpanded = expandedImages && expandedImages.has(imageId);

    return (
      <div className="collapsible-image-container">
        <img
          src={src}
          alt={alt}
          className={`collapsible-image ${isExpanded ? "expanded" : "collapsed"}`}
          onClick={() => toggleImage(imageId)}
        />
        <div className="image-toggle-text">{isExpanded ? "Click to collapse" : "Click to expand"}</div>
      </div>
    );
  };

  const isMarkdown = (str: string): boolean => {
    if (typeof str !== "string") return false;
    const hasMarkdownSyntax =
      str.includes("```") ||
      str.includes("##") ||
      str.includes("**") ||
      str.includes("`") ||
      (str.includes("[") && str.includes("](")) ||
      str.includes("* ") ||
      str.includes("- ");
    return hasMarkdownSyntax;
  };

  const showMarkdown = (content: string, backgroundColor = "var(--color-background-dark)"): JSX.Element => {
    return (
      <div className="markdown-content" data-color-mode="dark">
        <MarkdownPreview
          source={content}
          style={{
            backgroundColor,
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
          }}
          wrapperElement={{
            "data-color-mode": "dark",
          }}
        />
      </div>
    );
  };

  const renderInterestingKeys = (jsonData: any, interestingKeysConfig: string[]) => {
    if (!jsonData || typeof jsonData !== "object" || !interestingKeysConfig || interestingKeysConfig.length === 0) {
      return null;
    }

    const foundKeys = [];
    const findKeys = (obj: any, path: string = "") => {
      if (!obj || typeof obj !== "object") return;
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        if (interestingKeysConfig.includes(key) || interestingKeysConfig.includes(currentPath)) {
          if (value !== null) {
            foundKeys.push({ key: key, path: currentPath, value: value });
          }
        }
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          findKeys(value, currentPath);
        }
      });
    };

    findKeys(jsonData);
    if (foundKeys.length === 0) return null;

    const sectionId = `interesting-${index}`;
    const isSectionExpanded = expandedSections.has(sectionId);

    return (
      <div className="interesting-keys-container">
        <div className="interesting-keys-header">
          <div className="interesting-keys-title">
            <span className="interesting-keys-icon">✨</span>
            <span className="interesting-keys-label">Interesting keys ({foundKeys.length})</span>
          </div>
          {/* <div className="interesting-keys-controls">
            <button onClick={() => toggleSection(sectionId)} className="interesting-keys-btn">
              {isSectionExpanded ? "Collapse" : "Expand"} 📋
            </button>
            <button onClick={() => setShowJsonPopup(true)} className="interesting-keys-btn">
              Show JSON 🔍
            </button>
          </div> */}
        </div>

        {!isSectionExpanded && (
          <div className="interesting-keys-preview">
            <div className="interesting-keys-grid">
              {foundKeys.slice(0, 3).map((item, idx) => (
                <div key={idx} className="interesting-key-preview-card">
                  <div className="interesting-key-preview-path">
                    <span className="key-icon">🔑</span>
                    {item.path}
                  </div>
                  <div className="interesting-key-preview-value">
                    {typeof item.value === "string"
                      ? item.value.length > 100
                        ? item.value.substring(0, 100) + "..."
                        : item.value
                      : JSON.stringify(item.value).substring(0, 100)}
                  </div>
                </div>
              ))}
            </div>
            {foundKeys.length > 3 && (
              <div className="interesting-keys-more">+{foundKeys.length - 3} more insights available</div>
            )}
          </div>
        )}

        {isSectionExpanded && (
          <div className="interesting-keys-expanded">
            {foundKeys.map((item, idx) => (
              <div key={idx} className="interesting-key-card">
                <div className="interesting-key-path">
                  <span className="key-icon">🔑</span>
                  {item.path}
                </div>
                <div className="interesting-key-value">
                  {typeof item.value === "object" && item.value !== null ? (
                    <div className="key-value-container">
                      {/* Pass a unique expansionContextId for each interesting item's value rendering */}
                      {renderKeyValues(item.value, 0, 3, `interesting-${index}-${idx}`, `interesting-${index}-${idx}`)}
                    </div>
                  ) : typeof item.value === "string" ? (
                    (() => {
                      let parsedJson = null;
                      try {
                        const trimmed = item.value.trim();
                        if (
                          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                          (trimmed.startsWith("[") && trimmed.endsWith("]"))
                        ) {
                          parsedJson = JSON.parse(trimmed);
                        }
                      } catch (e) {
                        /* Not valid JSON */
                      }

                      if (parsedJson !== null) {
                        return (
                          <div className="key-value-container">
                            {/* Pass a unique expansionContextId for parsed JSON within interesting items */}
                            {renderKeyValues(
                              parsedJson,
                              0,
                              3,
                              `interesting-${index}-${idx}-parsed`,
                              `interesting-${index}-${idx}-parsed`
                            )}
                          </div>
                        );
                      } else if (isMarkdown(item.value)) {
                        return showMarkdown(item.value, "var(--color-background-black)");
                      } else {
                        return <div className="string-value">{String(item.value)}</div>;
                      }
                    })()
                  ) : (
                    <div className="string-value">{String(item.value)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const JsonPopupModal = ({ jsonData, onClose }: { jsonData: any; onClose: () => void }) => {
    if (!jsonData) return null;
    return (
      <div className="json-popup-overlay" onClick={onClose}>
        <div className="json-popup-modal" onClick={(e) => e.stopPropagation()}>
          <div className="json-popup-header">
            <div className="json-popup-title">
              <span className="json-popup-icon">📋</span>
              <h3>Complete JSON Data</h3>
            </div>
            <button onClick={onClose} className="json-popup-close">
              ×
            </button>
          </div>
          <div className="json-popup-content">
            {/* Use "popup" as the expansionContextId for the JSON popup */}
            {renderKeyValues(jsonData, 0, 10, "popup", "popup")}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Enhanced function to render key-value pairs with configurable expansion at each depth.
   * @param obj The object/array to render.
   * @param depth Current recursion depth.
   * @param maxDepth Maximum recursion depth.
   * @param currentProcessingPath A unique path string for the current item being processed (used for React keys, etc.).
   * @param expansionContextId The root context ID for this rendering (e.g., "main", "popup", "interesting-X"), used for expansion state.
   */
  const renderKeyValues = (
    obj: any,
    depth = 0,
    maxDepth = 5,
    currentProcessingPath: string,
    expansionContextId: string
  ) => {
    if (obj === null || obj === undefined) {
      return <span className="primitive-value">{String(obj)}</span>;
    }

    if (typeof obj !== "object") {
      if (typeof obj === "string") {
        if (obj.match(/\.(jpeg|jpg|gif|png)$/) || obj.startsWith("data:image/")) {
          const imageId = `${index}-${currentProcessingPath}-${obj.substring(0, 10)}`; // Make imageId more unique
          return renderImage(obj, "Step image", imageId);
        }

        let parsedJson = null;
        try {
          const trimmed = obj.trim();
          if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
          ) {
            parsedJson = JSON.parse(trimmed);
          }
        } catch (e) {
          /* Not valid JSON */
        }

        if (parsedJson !== null) {
          return (
            <div className="parsed-json-content">
              {/* Parsed JSON from a string is rendered at the same depth level. */}
              {/* currentProcessingPath is extended, expansionContextId is passed through. */}
              {renderKeyValues(parsedJson, depth, maxDepth, `${currentProcessingPath}-parsed`, expansionContextId)}
            </div>
          );
        }
        if (isMarkdown(obj)) return showMarkdown(obj);
      }
      return <span className="primitive-value">{String(obj)}</span>;
    }

    if (depth > maxDepth) {
      return <div className="max-depth-warning">Maximum depth reached</div>;
    }

    // Construct the key for checking expansion state using the expansionContextId and current depth.
    const generalizedDepthKey = `${expansionContextId}-depth-${depth}`;
    const isCurrentDepthExpanded = isKeyExpanded(generalizedDepthKey);

    const IndentationWrapper = ({ children, currentDepth }: { children: React.ReactNode; currentDepth: number }) => {
      return <div className={`key-value-display depth-${currentDepth}`}>{children}</div>;
    };

    const hasNestedObjects = Object.values(obj).some((value) => typeof value === "object" && value !== null);

    return (
      <IndentationWrapper currentDepth={depth}>
        {(depth > 0 || hasNestedObjects) && (
          <div className={`depth-control-header ${depth === 0 ? "root-level" : ""}`}>
            <button
              // Use generalizedDepthKey for toggling expansion state.
              onClick={() => toggleKeySection(generalizedDepthKey)}
              className={`depth-toggle-btn ${isCurrentDepthExpanded ? "expanded" : "collapsed"}`}
            >
              <span className="toggle-icon">{isCurrentDepthExpanded ? "⌄" : ">"}</span>
              <span className="toggle-text">Level {depth}</span>
            </button>
            <span className="item-count">
              {Object.keys(obj).length} item{Object.keys(obj).length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {isCurrentDepthExpanded && (
          <>
            {Object.entries(obj).map(([key, value], idx) => {
              // Construct a unique path for the current property/item for recursive calls and React keys.
              const propertySpecificPath = `${currentProcessingPath}-${key}`;

              if (Array.isArray(value)) {
                return (
                  <div key={`${currentProcessingPath}-${key}-${idx}`} className="key-array-item">
                    <div className="array-header">
                      <span className="array-icon">📚</span>
                      <b>{key}:</b>
                      {value.length === 0 ? (
                        <span className="array-empty">(empty array)</span>
                      ) : (
                        <span className="array-count">({value.length} items)</span>
                      )}
                    </div>
                    {value
                      .filter((v) => v !== undefined && v !== null)
                      .map((item, i) => {
                        const arrayItemSpecificPath = `${propertySpecificPath}-idx-${i}`;
                        return (
                          <div key={arrayItemSpecificPath} className={`array-item ${i % 2 === 0 ? "even" : "odd"}`}>
                            <span className="array-index">{i + 1}.</span>
                            <div className="array-item-content">
                              {typeof item === "object" && item !== null ? (
                                renderKeyValues(item, depth + 1, maxDepth, arrayItemSpecificPath, expansionContextId)
                              ) : typeof item === "string" ? (
                                (() => {
                                  if (item.match(/\.(jpeg|jpg|gif|png)$/) || item.startsWith("data:image/")) {
                                    const imageId = `${index}-${key}-${i}-${item.substring(0, 10)}`;
                                    return renderImage(item, "Array image", imageId);
                                  }
                                  let parsedJson = null;
                                  try {
                                    const trimmed = item.trim();
                                    if (
                                      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                                      (trimmed.startsWith("[") && trimmed.endsWith("]"))
                                    ) {
                                      parsedJson = JSON.parse(trimmed);
                                    }
                                  } catch (e) {
                                    /* Not valid JSON */
                                  }
                                  if (parsedJson !== null) {
                                    return (
                                      <div className="parsed-json-content">
                                        {renderKeyValues(
                                          parsedJson,
                                          depth + 1,
                                          maxDepth,
                                          `${arrayItemSpecificPath}-parsed`,
                                          expansionContextId
                                        )}
                                      </div>
                                    );
                                  }
                                  if (isMarkdown(item)) return showMarkdown(item);
                                  return <span className="primitive-value">{String(item)}</span>;
                                })()
                              ) : (
                                <span className="primitive-value">{String(item)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              } else if (typeof value === "object" && value !== null) {
                return (
                  <div key={`${currentProcessingPath}-${key}-${idx}`} className="object-item">
                    <div className="object-header">
                      <span className="object-icon">🔧</span>
                      <b>{key}:</b>
                    </div>
                    <div className="object-content">
                      {renderKeyValues(value, depth + 1, maxDepth, propertySpecificPath, expansionContextId)}
                    </div>
                  </div>
                );
              } else {
                // Primitive value
                return (
                  <div key={`${currentProcessingPath}-${key}-${idx}`} className="primitive-item">
                    <span className="primitive-key">{key}:</span>
                    <span className="primitive-value">
                      {value === null ? (
                        <em className="null-value">null</em>
                      ) : value === undefined ? (
                        <em className="undefined-value">undefined</em>
                      ) : typeof value === "string" ? (
                        (() => {
                          if (value.match(/\.(jpeg|jpg|gif|png)$/) || value.startsWith("data:image/")) {
                            const imageId = `${index}-${key}-${value.substring(0, 10)}`;
                            return renderImage(value, "Value image", imageId);
                          }
                          let parsedJson = null;
                          try {
                            const trimmed = value.trim();
                            if (
                              (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                              (trimmed.startsWith("[") && trimmed.endsWith("]"))
                            ) {
                              parsedJson = JSON.parse(trimmed);
                            }
                          } catch (e) {
                            /* Not valid JSON */
                          }
                          if (parsedJson !== null) {
                            return (
                              <div className="parsed-json-content">
                                {/* Value is a string that parsed to JSON, render it nested. Depth increases. */}
                                {renderKeyValues(
                                  parsedJson,
                                  depth + 1,
                                  maxDepth,
                                  `${propertySpecificPath}-parsed`,
                                  expansionContextId
                                )}
                              </div>
                            );
                          }
                          if (isMarkdown(value)) return showMarkdown(value);
                          return String(value);
                        })()
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                );
              }
            })}
          </>
        )}
      </IndentationWrapper>
    );
  };

  const renderTextData = (text: string, currentStepConfig: any) => {
    const showExpand = currentStepConfig.expandable && text.length > 200;
    return (
      <div className="text-data-container">
        <div>
          <pre className="text-data-content">
            {text.substring(0, 300)}
            {showExpand && <span style={{ display: expanded ? "inline" : "none" }}>{text.substring(300)}</span>}
          </pre>
          {showExpand && (
            <button onClick={toggleExpand} className="text-expand-btn">
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderJSONData = (text: string, currentStepConfig: any) => {
    const json_text = parseJsonSafely(text);
    return (
      <div>
        {currentStepConfig.interesting_keys &&
          json_text &&
          renderInterestingKeys(json_text, currentStepConfig.interesting_keys)}
        {/* For main data rendering, use "main" as the expansionContextId. */}
        {!currentStepConfig.interesting_keys && json_text && renderKeyValues(json_text, 0, 5, "main", "main")}
        {!json_text && text && showMarkdown(text, "var(--color-background-dark)")}
      </div>
    );
  };

  return (
    <div className="step-container">
      <h3
        className="step-name"
        style={{
          background: `linear-gradient(135deg, ${
            stepConfig.backgroundColor || "var(--color-primary)"
          }, var(--color-primary-light))`,
          cursor: onToggleCollapse ? "pointer" : "default",
        }}
        onClick={onToggleCollapse}
      >
        <span className="step-icon">{isCollapsed ? "▶" : "⚡"}</span>Step {index + 1}: {step.name}
        <div className="interesting-keys-controls" style={{ float: "right" }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowJsonPopupPrompts(true)} className="interesting-keys-btn">
            Show Prompts 🔍
          </button>
          <button onClick={() => setShowJsonPopup(true)} className="interesting-keys-btn">
            Show JSON 🔍
          </button>
        </div>
      </h3>
      {!isCollapsed && <div className="step-content">
        {stepConfig.showCurrentUrl && step.current_url && (
          <div className="current-url-container">
            <div className="current-url-label">
              <span>🌐</span>Current URL:
            </div>
            <code className="current-url-value">{step.current_url}</code>
          </div>
        )}
        {stepConfig.renderImage &&
          step.image_before &&
          renderImage(step.image_before, "Screenshot before action", `${index}-image_before`)}
        {step.action_formatted && renderTextData(step.action_formatted, stepConfig)}
        {step.observation_before && !step.action_formatted && renderTextData(step.observation_before, stepConfig)}
        {step.data && renderJSONData(step.data, stepConfig)}
      </div>}
      {showJsonPopup && (
        <JsonPopupModal jsonData={parseJsonSafely(step.data || "{}")} onClose={() => setShowJsonPopup(false)} />
      )}
      {showJsonPopupPrompts && (
        <JsonPopupModal
          jsonData={parseJsonSafely(step.prompts || "{}")}
          onClose={() => setShowJsonPopupPrompts(false)}
        />
      )}
    </div>
  );
}

export default StepView;
