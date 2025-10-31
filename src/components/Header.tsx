import React from "react";
import "./Header.css"; // We'll create this stylesheet later

interface HeaderProps {
  currentView: string;
}

const Header: React.FC<HeaderProps> = ({ currentView }) => {
  return (
    <header className="cuga-header">
      <div className="header-content">
        <div className="header-title">
          <h1>Cuga Visualizer</h1>
          <span className="version-badge">v0.0.1</span>
        </div>
        <div className="current-view">{currentView}</div>
      </div>
    </header>
  );
};

export default Header;
