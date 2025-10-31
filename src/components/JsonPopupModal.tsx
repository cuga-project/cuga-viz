// @ts-nocheck

import { JSX, useState } from "react";
import { parseJsonSafely } from "../utils/renderHelpers";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "./StepView.css"; // You may want to create a separate CSS file for this component

interface JsonPopupModalProps {
  jsonData: any;
  onClose: () => void;
  title?: string;
  maxDepth?: number;
}

function JsonPopupModal({ jsonData, onClose, title = "Complete JSON Data", maxDepth = 10 }: JsonPopupModalProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    new Set(["popup-depth-0", "popup-depth-1", "popup-depth-2"])
  );

  if (!jsonData) return null;

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

  const renderImage = (src: string, alt = "", imageId: string) => {
    return (
      <div className="collapsible-image-container">
        <img
          src={src}
          alt={alt}
          className="collapsible-image collapsed"
          style={{ maxWidth: "200px", maxHeight: "200px" }}
        />
        <div className="image-toggle-text">Image preview</div>
      </div>
    );
  };

  /**
   * Enhanced function to render key-value pairs with configurable expansion at each depth.
   */
  const renderKeyValues = (
    obj: any,
    depth = 0,
    maxDepthLimit = maxDepth,
    currentProcessingPath: string,
    expansionContextId: string
  ) => {
    if (obj === null || obj === undefined) {
      return <span className="primitive-value">{String(obj)}</span>;
    }

    if (typeof obj !== "object") {
      if (typeof obj === "string") {
        if (obj.match(/\.(jpeg|jpg|gif|png)$/) || obj.startsWith("data:image/")) {
          const imageId = `popup-${currentProcessingPath}-${obj.substring(0, 10)}`;
          return renderImage(obj, "Image", imageId);
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
              {renderKeyValues(parsedJson, depth, maxDepthLimit, `${currentProcessingPath}-parsed`, expansionContextId)}
            </div>
          );
        }
        if (isMarkdown(obj)) return showMarkdown(obj);
      }
      return <span className="primitive-value">{String(obj)}</span>;
    }

    if (depth > maxDepthLimit) {
      return <div className="max-depth-warning">Maximum depth reached</div>;
    }

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
                                renderKeyValues(
                                  item,
                                  depth + 1,
                                  maxDepthLimit,
                                  arrayItemSpecificPath,
                                  expansionContextId
                                )
                              ) : typeof item === "string" ? (
                                (() => {
                                  if (item.match(/\.(jpeg|jpg|gif|png)$/) || item.startsWith("data:image/")) {
                                    const imageId = `popup-${key}-${i}-${item.substring(0, 10)}`;
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
                                          maxDepthLimit,
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
                      {renderKeyValues(value, depth + 1, maxDepthLimit, propertySpecificPath, expansionContextId)}
                    </div>
                  </div>
                );
              } else {
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
                            const imageId = `popup-${key}-${value.substring(0, 10)}`;
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
                                {renderKeyValues(
                                  parsedJson,
                                  depth + 1,
                                  maxDepthLimit,
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

  return (
    <div className="json-popup-overlay" onClick={onClose}>
      <div className="json-popup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="json-popup-header">
          <div className="json-popup-title">
            <span className="json-popup-icon">📋</span>
            <h3>{title}</h3>
          </div>
          <button onClick={onClose} className="json-popup-close">
            ×
          </button>
        </div>
        <div className="json-popup-content">{renderKeyValues(jsonData, 0, maxDepth, "popup", "popup")}</div>
      </div>
    </div>
  );
}

export default JsonPopupModal;
