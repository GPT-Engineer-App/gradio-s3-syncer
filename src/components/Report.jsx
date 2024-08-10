import { useQuery } from "@tanstack/react-query";
import { fetchReport } from "../api/report";

const Report = ({ customerName }) => {
  const { data: report } = useQuery({
    queryKey: ["report", customerName],
    queryFn: () => fetchReport(customerName),
  });

  if (!report) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Database Report</h1>
      <p>Collection Name: {report.collectionName}</p>
      <p>Number of Points: {report.numPoints}</p>
      <h2 className="mt-4 mb-2 text-xl font-bold">Files in Database:</h2>
      <ul>
        {report.files.map((file, index) => (
          <li key={index}>{file}</li>
        ))}
      </ul>
    </div>
  );
};

export default Report;
