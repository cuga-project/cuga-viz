// @ts-nocheck

import React, { useState, ReactNode, useRef, useEffect } from "react";

interface SidePanelProps {
  /**
   * The component to be displayed inside the side panel
   */
  component: ReactNode;

  /**
   * Position of the panel (left or right)
   */
  position?: "left" | "right";

  /**
   * Width of the panel when fully open in pixels
   */
  width?: number;

  /**
   * Width of the panel when partially open in pixels
   */
  peekWidth?: number;

  /**
   * Panel title to show in the toggle button
   */
  title?: string;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Whether to push the page content when panel is open
   */
  pushContent?: boolean;

  /**
   * Minimum width of the panel when resizing
   */
  minWidth?: number;

  /**
   * Maximum width of the panel when resizing
   */
  maxWidth?: number;

  /**
   * ID of the main content element to push
   */
  mainContentId?: string;
}

/**
 * A side panel component that can be toggled open/closed and resized
 * When closed, it shows a hint/peek of the content
 * Can be configured to push or overlay the main content
 */
const SidePanel: React.FC<SidePanelProps> = ({
  component,
  position = "right",
  width = 500,
  peekWidth = 60,
  title = "Cuga Flow Visualizer",
  className = "",
  pushContent = true,
  minWidth = 200,
  maxWidth = 800,
  mainContentId = "main-content",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Toggle panel open/closed state
  const togglePanel = () => {
    setIsOpen(!isOpen);

    if (!isOpen) {
      // When opening, set to the last used width or default width
      setPanelWidth(panelWidth < minWidth ? width : panelWidth);
    }
  };

  // Apply panel width changes to main content if pushContent is true
  useEffect(() => {
    if (pushContent && mainContentId) {
      const mainContent = document.getElementById(mainContentId);
      if (mainContent) {
        const mainMargin = position === "left" ? "marginLeft" : "marginRight";
        if (isOpen) {
          mainContent.style[mainMargin] = `${panelWidth}px`;
        } else {
          mainContent.style[mainMargin] = `${peekWidth}px`;
        }
        mainContent.style.transition = "margin 0.3s ease-in-out";
      }
    }
  }, [isOpen, panelWidth, pushContent, position, mainContentId, peekWidth]);

  // Resize handlers
  const startResize = (e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
    e.preventDefault(); // Prevent text selection during resize
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;

    const delta =
      position === "right"
        ? startXRef.current - e.clientX
        : e.clientX - startXRef.current;

    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, startWidthRef.current + delta)
    );
    setPanelWidth(newWidth);

    // Update main content margin immediately during resize if pushContent is true
    if (pushContent && mainContentId) {
      const mainContent = document.getElementById(mainContentId);
      if (mainContent) {
        const mainMargin = position === "left" ? "marginLeft" : "marginRight";
        mainContent.style[mainMargin] = `${newWidth}px`;
        mainContent.style.transition = "none"; // Disable transition during resize
      }
    }
  };

  const stopResize = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);

    // Re-enable transition after resize
    if (pushContent && mainContentId) {
      const mainContent = document.getElementById(mainContentId);
      if (mainContent) {
        mainContent.style.transition = "margin 0.3s ease-in-out";
      }
    }
  };

  // Determine panel positioning styles
  const positionStyles = {
    [position]: 0,
    width: isOpen ? `${panelWidth}px` : `${peekWidth}px`,
    transition: isResizing ? "none" : "width 0.3s ease-in-out",
  };

  // Style for the resize handle
  const resizeHandleStyles = {
    position: "absolute",
    top: 0,
    [position === "left" ? "right" : "left"]: 0,
    width: "5px",
    height: "100%",
    cursor: position === "left" ? "e-resize" : "w-resize",
    backgroundColor: "transparent",
    // Only show resize handle when panel is open
    display: isOpen ? "block" : "none",
    zIndex: 1002,
  };

  // Toggle button position
  const toggleBtnPosition = {
    position: "absolute",
    [position === "left" ? "right" : "left"]: "10px",
    top: "50%",
    transform: "translateY(-50%)",
  };

  // Determine the rotation of the icon based on panel state and position
  const getIconRotation = () => {
    if (position === "left") {
      return isOpen ? "rotate(0deg)" : "rotate(180deg)";
    }
    return isOpen ? "rotate(180deg)" : "rotate(0deg)";
  };

  return (
    <div
      ref={panelRef}
      className={`side-panel ${className}`}
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        backgroundColor: "#ffffff",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        zIndex: 1000,
        overflow: "visible",
        ...positionStyles,
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        style={resizeHandleStyles as React.CSSProperties}
        onMouseDown={startResize}
        title="Resize panel"
      />

      {/* Toggle button */}
      <button
        onClick={togglePanel}
        style={{
          ...(toggleBtnPosition as React.CSSProperties),
          width: "30px",
          height: "60px",
          backgroundColor: "#f0f0f0",
          border: "none",
          borderRadius: position === "left" ? "0 4px 4px 0" : "4px 0 0 4px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 5px rgba(0, 0, 0, 0.1)",
          zIndex: 1001,
        }}
        aria-label={isOpen ? "Close panel" : "Open panel"}
        title={isOpen ? "Close panel" : "Open panel"}
      >
        {/* Chevron icon */}
        <div
          style={{
            width: "10px",
            height: "10px",
            borderTop: "2px solid #666",
            borderRight: "2px solid #666",
            transform: `${getIconRotation()} rotate(-45deg)`,
            transition: "transform 0.3s",
          }}
        />
      </button>

      {/* Panel header with title */}
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #eee",
          fontWeight: "bold",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {title}
      </div>

      {/* Panel content */}
      <div
        style={{
          height: "calc(100% - 40px)",
          overflow: isOpen ? "auto" : "hidden",
          opacity: isOpen ? 1 : 0.6,
          transition: "opacity 0.3s",
        }}
      >
        {/* Show a peek/hint of the content when closed */}
        <div
          style={{
            width: isOpen ? "100%" : `${width}px`,
            height: "100%",
            overflow: "hidden",
            transition: isResizing ? "none" : "width 0.3s",
          }}
        >
          {component}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
