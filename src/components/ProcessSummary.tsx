// @ts-nocheck
import React, { useState } from "react";

interface SequenceFlowProps {
  processes?: string[];
}

const SequenceFlow: React.FC<SequenceFlowProps> = ({ processes }) => {
  // Demo example when processes is null/undefined
  const demoProcesses = [
    "Initialize Agent System",
    "Receive User Request",
    "Parse and Validate Input\nwith comprehensive error handling\nand input sanitization",
    "Execute Business Logic",
    "Query External APIs\nincluding third-party services,\ndatabases, and microservices\nwith proper retry mechanisms\nand fallback strategies",
    "Process and Transform Data",
    "Generate Response\nwith proper formatting,\nvalidation, and optimization\nfor the target client application",
    "Send Result to User",
    "Log Transaction Complete\nwith detailed audit trail\nand performance metrics\nfor monitoring and debugging purposes",
  ];

  const processesToRender = processes || demoProcesses;
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return { text, isTruncated: false };
    return { text: text.substring(0, maxLength) + "...", isTruncated: true };
  };

  return (
    <div className="flex flex-col items-center gap-5 p-8 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Agent Process Flow
        </h2>

        <div className="flex flex-col items-center gap-2">
          {processesToRender.map((process, index) => {
            const isFirst = index === 0;
            const isLast = index === processesToRender.length - 1;
            const isExpanded = expandedItems.has(index);
            const { text: truncatedText, isTruncated } = truncateText(process);
            const displayText = isExpanded ? process : truncatedText;

            return (
              <React.Fragment key={index}>
                <div
                  className={`
                    relative p-4 rounded-xl w-96 text-center shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl flex flex-col justify-center
                    ${isExpanded ? "min-h-20" : "h-20"}
                    ${
                      isFirst
                        ? "bg-gradient-to-r from-green-400 to-blue-500 text-white"
                        : isLast
                        ? "text-white"
                        : "bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 border-2 border-blue-200"
                    }
                  `}
                  style={{
                    animation: `slideIn 0.6s ease forwards ${index * 0.1}s both`,
                    ...(isLast && {
                      background: "linear-gradient(to right, #f97316, #dc2626)",
                    }),
                  }}
                >
                  <div className="absolute -top-3 -left-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
                    {index + 1}
                  </div>

                  {isTruncated && (
                    <button
                      onClick={() => toggleExpanded(index)}
                      className={`
                        absolute -top-2 -right-2 w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-center text-xs font-bold shadow-md
                        ${
                          isFirst || isLast
                            ? "bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100 focus:ring-white"
                            : "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500"
                        }
                      `}
                      title={isExpanded ? "Show Less" : "Show More"}
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  )}

                  <div className="font-medium text-base whitespace-pre-line">{displayText}</div>
                </div>

                {!isLast && (
                  <div
                    className="flex flex-col items-center"
                    style={{
                      animation: `slideIn 0.6s ease forwards ${(index + 0.5) * 0.1}s both`,
                    }}
                  >
                    <div className="w-1 h-3 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                    <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-blue-500"></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SequenceFlow;
