// @ts-nocheck
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import JsonPopupModal from "./JsonPopupModal";
interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  showMoreText?: string;
  showLessText?: string;
  className?: string;
  textClassName?: string;
  toggleClassName?: string;
  popupClassName?: string;
  jsonPreviewClassName?: string;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLength = 150,
  showMoreText = "Show more",
  showLessText = "Show less",
  className = "",
  textClassName = "",
  toggleClassName = "",
  popupClassName = "json-popup-overlay",
  jsonPreviewClassName = "font-mono text-sm cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-200",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJsonPopup, setShowJsonPopup] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["main-depth-0", "main-depth-1"]));

  // Check if the text is valid JSON
  const isJson = useMemo(() => {
    try {
      JSON.parse(text);
      return true;
    } catch (e) {
      return false;
    }
  }, [text]);

  // Create compact JSON view
  const compactJson = useMemo(() => {
    if (!isJson) return text;
    try {
      let compact = JSON.stringify(JSON.parse(text));
      if (compact.length > maxLength) {
        compact = compact.substring(0, maxLength) + "...";
      }
      return compact;
    } catch (e) {
      return text;
    }
  }, [text, isJson, maxLength]);

  const shouldTruncate = !isJson && text.length > maxLength;
  const displayText = shouldTruncate && !isExpanded ? `${text.slice(0, maxLength)}...` : text;

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const openJsonPopup = useCallback(() => {
    setShowJsonPopup(true);
  }, []);

  const closeJsonPopup = useCallback((e?: React.MouseEvent) => {
    setShowJsonPopup(false);
  }, []);

  // Close popup on escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showJsonPopup) {
        setShowJsonPopup(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showJsonPopup]);

  return (
    <div className={`expandable-text ${className}`}>
      {isJson ? (
        <>
          <div className={`${jsonPreviewClassName}`} onClick={openJsonPopup}>
            <span className="text-gray-500">{`{`}</span>
            <span className="text-gray-800 mx-1">{compactJson.slice(1, -1)}</span>
            <span className="text-gray-500">{`}`}</span>
            <span className="ml-2 text-xs text-blue-500 hover:text-blue-700">View JSON</span>
          </div>

          {showJsonPopup && <JsonPopupModal jsonData={text} onClose={closeJsonPopup} />}
        </>
      ) : (
        <p className={textClassName}>{displayText}</p>
      )}

      {shouldTruncate && !isJson && (
        <button
          onClick={toggleExpand}
          className={`text-blue-600 hover:text-blue-800 text-sm font-medium mt-1 focus:outline-none ${toggleClassName}`}
        >
          {isExpanded ? showLessText : showMoreText}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
