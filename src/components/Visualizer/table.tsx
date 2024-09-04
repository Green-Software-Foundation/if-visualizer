import { useState, useEffect } from "react";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "../../styles/ag-grid-theme-builder.css";

// Row Data Interface
interface IRow {
  [key: string]: string | number;
  timestamp: string;
}

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

interface TableProps {
  data: YAMLData | null;
  selectedMetric: string;
}

const defaultColDef: ColDef = {
  flex: 1,
  sortable: true,
  filter: true,
};

// Create new Table component
const Table: React.FC<TableProps> = ({ data, selectedMetric }) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [colDefs, setColDefs] = useState<ColDef[]>([]);

  const parseYamlData = (data: YAMLData) => {
    const metrics = data.aggregation.metrics;

    const extractOutputs = (
      node: TreeNode,
      path: string[] = []
    ): OutputData[] => {
      if (node.outputs && !node.children) {
        return node.outputs.map((output) => ({
          ...output,
          path: path.join("/"),
        }));
      }
      if (node.children) {
        return Object.entries(node.children).flatMap(([key, value]) => {
          return extractOutputs(value, [...path, key]);
        });
      }
      return [];
    };

    const allOutputs = extractOutputs(data.tree);
    const uniqueTimestamps = [
      ...new Set(allOutputs.map((output) => output.timestamp)),
    ];
    const uniquePaths = [...new Set(allOutputs.map((output) => output.path))];

    const columns = ["timestamp", ...uniquePaths];
    const rows = uniqueTimestamps.map((timestamp) => {
      const row: IRow = { timestamp };
      uniquePaths.forEach((path) => {
        const output = allOutputs.find(
          (o) => o.timestamp === timestamp && o.path === path
        );
        metrics.forEach((metric) => {
          row[`${path}_${metric}`] = output ? output[metric] : "";
        });
      });
      return row;
    });

    return { columns, rows };
  };

  const updateColumnDefs = (columns: (string | number)[], metric: string) => {
    const columnDefs: ColDef[] = columns.map((col) => {
      if (col === "timestamp") {
        return {
          field: col,
          headerName: "Timestamp",
          pinned: "left",
          valueFormatter: (params) => {
            return new Date(params.value).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });
          },
        };
      } else {
        return {
          field: `${col}_${metric}`,
          headerName: `${col}`,
          valueFormatter: (params) => {
            return params.value ? params.value : "N/A";
          },
        };
      }
    });
    setColDefs(columnDefs);
  };

  useEffect(() => {
    if (data) {
      const { columns, rows } = parseYamlData(data);
      setRowData(rows);
      updateColumnDefs(columns, selectedMetric);
    }
  }, [data, selectedMetric]);

  return (
    <div className="ag-theme-custom" style={{ height: 500 }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        autoSizeStrategy={{
          type: "fitCellContents",
        }}
      />
    </div>
  );
};

export default Table;
