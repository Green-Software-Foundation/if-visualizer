import { useState, useEffect, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "../../styles/ag-grid-theme-builder.css";

// Row Data Interface
interface IRow {
  [key: string]: string | number;
  Component: string;
}

interface OutputData {
  timestamp: string;
  [key: string]: string | number;
}

interface TreeNode {
  children?: { [key: string]: TreeNode };
  outputs?: OutputData[];
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
  sortable: true,
  filter: true,
};

// Create new Table component
const Table: React.FC<TableProps> = ({ data, selectedMetric }) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [colDefs, setColDefs] = useState<ColDef[]>([]);

  const parseYamlData = useCallback((data: YAMLData) => {
    const extractOutputs = (node: TreeNode, path: string[] = []): OutputData[] => {
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
    const uniqueTimestamps = [...new Set(allOutputs.map((output) => output.timestamp))].sort();
    const uniquePaths = [...new Set(allOutputs.map((output) => output.path))];

    const rows = uniquePaths.map((path) => {
      const row: IRow = { Component: path as string };
      uniqueTimestamps.forEach((timestamp, index) => {
        const output = allOutputs.find(
          (o) => o.timestamp === timestamp && o.path === path
        );
        row[`T${index + 1}`] = output ? output[selectedMetric] : "";
      });
      return row;
    });

    return { timestamps: uniqueTimestamps, rows };
  }, [selectedMetric]);

  const updateColumnDefs = (timestamps: string[]) => {
    const columnDefs: ColDef[] = [
      {
        field: 'Component',
        headerName: 'Component',
        pinned: 'left',
      },
      ...timestamps.map((_, index) => ({
        field: `T${index + 1}`,
        headerName: `T${index + 1}`,
        valueFormatter: (params: {value : string}) => params.value || 'N/A',
      })),
    ];
    setColDefs(columnDefs);
  };

  useEffect(() => {
    if (data) {
      const { timestamps, rows } = parseYamlData(data);
      setRowData(rows);
      updateColumnDefs(timestamps);
    }
  }, [data, selectedMetric, parseYamlData]);

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
