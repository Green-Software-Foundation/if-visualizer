import React, { useState, useEffect } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions, AgChartTheme } from "ag-charts-community";

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

const gsfTheme: AgChartTheme = {
  palette: {
    fills: [
      "#006d69",
      "#80b6b4",
      "#bfdbd9",
      "#e5f0f0",
      "#f2f8f7",
      "#00524f",
      "#003734",
      "#002c2a",
      "#002625",
    ],
    strokes: ["#3c3c3c"],
  },
};

const Chart: React.FC<ChartProps> = ({ data, selectedMetric }) => {
  const [chartOptions, setChartOptions] = useState<AgChartOptions>({});

  useEffect(() => {
    if (data && selectedMetric) {
      const treeOutputs = data.tree.outputs || [];

      const chartData = treeOutputs.map((output: OutputData) => ({
        timestamp: output.timestamp,
        value: output[selectedMetric] || 0,
      }));

      const options: AgChartOptions = {
        theme: gsfTheme,
        title: {
          text: `Total ${selectedMetric} Over Time`,
        },
        data: chartData,
        series: [
          {
            type: "line",
            xKey: "timestamp",
            yKey: "value",
            yName: selectedMetric,
          },
        ],
        axes: [
          {
            type: "category",
            position: "bottom",
            label: {
              autoRotate: false,
              formatter: function (params) {
                return new Date(params.value).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour12: false,
                });
              },
            },
          },
          {
            type: "number",
            position: "left",
            label: {},
          },
        ],
      };

      setChartOptions(options);
    }
  }, [data, selectedMetric]);

  return <AgCharts options={chartOptions} />;
};

export default Chart;
