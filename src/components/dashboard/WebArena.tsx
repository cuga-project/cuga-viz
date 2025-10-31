// @ts-nocheck
const WebArenaStatistics = () => {
  const overallStats = {
    averageScore: 0.617,
    totalExceptions: 14,
    totalRecords: 812,
  };

  const siteStats = [
    { site: "gitlab", count: 180, avgScore: 0.617, exceptions: 2 },
    { site: "map", count: 109, avgScore: 0.642, exceptions: 0 },
    { site: "multi", count: 48, avgScore: 0.354, exceptions: 5 },
    { site: "reddit", count: 106, avgScore: 0.755, exceptions: 6 },
    { site: "shopping", count: 187, avgScore: 0.583, exceptions: 0 },
    { site: "shopping_admin", count: 182, avgScore: 0.626, exceptions: 1 },
  ];

  const getScoreColor = (score) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getExceptionsBadge = (exceptions) => {
    if (exceptions === 0) return "bg-green-100 text-green-800";
    if (exceptions <= 2) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="max-w-7xl mx-auto p-4 overflow-hidden">
      {/* Compact Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">CUGA Results on WebArena Benchmark</h1>
        <p className="text-sm text-gray-600">Metrics</p>
      </div>

      {/* Main Content Grid - Two Column Layout with Equal Heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
        {/* Left Column - Overall Stats & Insights */}
        <div className="space-y-4">
          {/* Overall Statistics Card - Now takes full height */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Overall Statistics
            </h2>
            <div className="grid grid-cols-3 gap-4 flex-1 content-start">
              <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{overallStats.averageScore.toFixed(3)}</div>
                <div className="text-xs text-gray-600">Avg Score</div>
              </div>
              <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{overallStats.totalRecords.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Records</div>
              </div>
              <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-xl font-bold text-orange-600">{overallStats.totalExceptions}</div>
                <div className="text-xs text-gray-600">Exceptions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Site Statistics Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Site Performance
            </h2>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Exceptions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {siteStats.map((site, index) => (
                  <tr key={site.site} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-md flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-medium">{site.site.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {site.site.replace("_", " ")}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">{site.count.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <div className={`text-sm font-bold ${getScoreColor(site.avgScore)}`}>
                        {site.avgScore.toFixed(3)}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getExceptionsBadge(
                          site.exceptions
                        )}`}
                      >
                        {site.exceptions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebArenaStatistics;
