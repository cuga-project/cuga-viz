//@ts-nocheck
import GenericDataTable from "../StatsTable";

const StatsSection = ({ statsTables = [] }) => {
  if (!statsTables.length) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-2/5 p-4">
        {statsTables[1] && (
          <GenericDataTable
            alertKey="total_exceptions"
            scoreKey="average_score"
            //@ts-ignore
            title={statsTables[1].title}
            //@ts-ignore
            data={statsTables[1].records}
          />
        )}
      </div>
      <div className="w-full md:w-3/5 p-4">
        {statsTables[0] && (
          <GenericDataTable
            alertKey="total_exceptions"
            scoreKey="average_score"
            //@ts-ignore
            title={statsTables[0].title}
            //@ts-ignore
            data={statsTables[0].records}
          />
        )}
      </div>
    </div>
  );
};

export default StatsSection;
