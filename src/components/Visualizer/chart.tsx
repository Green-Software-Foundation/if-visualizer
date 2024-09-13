import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AggregatedData {
  [key: string]: number;
}

interface OutputData {
  timestamp: string;
  duration: number;
  [key: string]: string | number;
}

interface TreeNode {
  children?: { [key: string]: TreeNode };
  inputs?: OutputData[];
  outputs?: OutputData[];
  aggregated: AggregatedData;
}

interface YAMLData {
  name: string;
  description: string;
  aggregation: {
    metrics: string[];
    type: string;
  };
  tree: TreeNode;
}

interface ChartProps {
  data: YAMLData | null;
  selectedMetric: string;
}

const Chart: React.FC<ChartProps> = ({ data, selectedMetric }) => {
  const chartData = useMemo(() => {
    if (!data || !selectedMetric) return [];

    const treeOutputs = data.tree.outputs || [];
    return treeOutputs.map((output: OutputData) => ({
      timestamp: new Date(output.timestamp).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour12: false,
      }),
      value: output[selectedMetric] || 0,
    }));
  }, [data, selectedMetric]);

  if (!data || !selectedMetric) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          label={{ value: "Timestamp", position: "insideBottom", offset: -10 }}
        />
        <YAxis
          label={{ value: selectedMetric, angle: -90, position: "insideLeft" }}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          name={selectedMetric}
          stroke="#006d69"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default Chart;
