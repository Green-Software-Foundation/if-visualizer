import { useState, useEffect, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "../../styles/ag-grid-theme-builder.css";
import "ag-grid-enterprise";
// Row Data Interface
interface IRow {
  [key: string]: string | number | boolean | IRow[] | undefined;
  Component: string;
  children?: IRow[];
  expanded?: boolean;
  level: number;
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

  const parseYamlData = useCallback(
    (data: YAMLData) => {
      const parseNode = (
        node: TreeNode,
        path: string[] = [],
        level: number = 0
      ): IRow => {
        const outputs = node.outputs || [];
        const row: IRow = {
          Component: path[path.length - 1] || data.name,
          level,
          expanded: false,
        };

        outputs.forEach((output, index) => {
          row[`T${index + 1}`] = output[selectedMetric] || "";
        });

        if (node.children) {
          row.children = Object.entries(node.children).map(([key, value]) =>
            parseNode(value, [...path, key], level + 1)
          );
        }

        return row;
      };

      const rows = Object.entries(data.tree.children || {}).map(
        ([key, value]) => parseNode(value, [key])
      );

      const allOutputs = data.tree.outputs || [];
      const uniqueTimestamps = [
        ...new Set(allOutputs.map((output) => output.timestamp)),
      ].sort();

      return { timestamps: uniqueTimestamps, rows };
    },
    [selectedMetric]
  );

  const getExpandedChildCount = useCallback((row: IRow): number => {
    let count = row.children?.length || 0;
    row.children?.forEach((child) => {
      if (child.expanded) {
        count += getExpandedChildCount(child);
      }
    });
    return count;
  }, []);

  const toggleExpand = useCallback(
    (rowIndex: number) => {
      setRowData((prevData) => {
        const newData = [...prevData];
        const row = newData[rowIndex];
        row.expanded = !row.expanded;

        if (row.expanded && row.children) {
          newData.splice(rowIndex + 1, 0, ...row.children);
        } else if (!row.expanded && row.children) {
          const removeCount = getExpandedChildCount(row);
          newData.splice(rowIndex + 1, removeCount);
        }

        return newData;
      });
    },
    [getExpandedChildCount]
  );
  const updateColumnDefs = useCallback(
    (timestamps: string[]) => {
      const columnDefs: ColDef[] = [
        {
          field: "Component",
          headerName: "Component",
          cellRenderer: (params: {
            data: IRow;
            node: { rowIndex: number };
          }) => {
            const { data, node } = params;
            const indent = data.level * 20;
            const expandIcon = data.children ? (data.expanded ? "▼" : "▶") : "";
            return (
              <div style={{ paddingLeft: `${indent}px` }}>
                <span
                  style={{ cursor: "pointer", marginRight: "5px" }}
                  onClick={() => toggleExpand(node.rowIndex)}
                >
                  {expandIcon}
                </span>
                {data.Component}
              </div>
            );
          },
        },
        ...timestamps.map((_, index) => ({
          field: `T${index + 1}`,
          headerName: `T${index + 1}`,
          valueFormatter: (params: { value: string }) => params.value || "N/A",
        })),
      ];
      setColDefs(columnDefs);
    },
    [toggleExpand]
  );

  useEffect(() => {
    if (data) {
      const { timestamps, rows } = parseYamlData(data);
      setRowData(rows);
      updateColumnDefs(timestamps);
    }
  }, [data, selectedMetric, parseYamlData, updateColumnDefs]);

  return (
    <div className="ag-theme-custom" style={{ height: 500 }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        autoSizeStrategy={{
          type: "fitCellContents",
        }}
        animateRows={true}
      />
    </div>
  );
};

export default Table;
