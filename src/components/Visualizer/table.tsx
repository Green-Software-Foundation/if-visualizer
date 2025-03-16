import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  getExpandedRowModel,
} from "@tanstack/react-table";
import type { ExpandedState } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, EyeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IRow {
  Component: string;
  Total: number;
  subRows?: IRow[];
  node?: TreeNode;
  path?: string[];
  [key: string]: string | number | boolean | undefined | IRow[] | TreeNode | string[];
}

interface OutputData {
  timestamp: string;
  [key: string]: string | number;
}

interface TreeNode {
  children?: { [key: string]: TreeNode };
  outputs?: OutputData[];
  inputs?: OutputData[];
  pipeline?: { compute: string[] };
  defaults?: { [key: string]: number | string };
}

interface YAMLData {
  tree: TreeNode;
  explain: {
    [key: string]: {
      plugins?: string[];
      unit?: string;
      description: string;
      "aggregation-method"?: string;
    };
  };
  explainer: boolean;
}

interface SelectedNode {
  name: string;
  path: string[];
  data?: any;
}

interface TableProps {
  data: YAMLData | null;
  selectedMetric: string;
  hoveredTimestamp: string | null;
  selectedNode: SelectedNode | null;
  onNodeSelect: (nodeName: string, path: string[], nodeData?: any) => void;
  showTimestamps?: boolean;
  showPercentages?: boolean;
}

const columnHelper = createColumnHelper<IRow>();

const DataTable: React.FC<TableProps> = ({
  data,
  selectedMetric,
  hoveredTimestamp,
  selectedNode,
  onNodeSelect,
  showTimestamps = false,
  showPercentages = false,
}) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [timestamps, setTimestamps] = useState<string[]>([]);

  const parseYamlData = useCallback(
    (data: YAMLData) => {
      const parseNode = (node: TreeNode, path: string[] = []): IRow => {
        const outputs = node.outputs || [];
        const row: IRow = {
          Component: path[path.length - 1] || "root",
          Total: 0,
          subRows: [],
          node: node,
          path: path,
        };

        outputs.forEach((output, index) => {
          const value = output[selectedMetric] || 0;
          row[`T${index + 1}`] = value;
          row.Total += Number(value);
        });

        if (node.children) {
          row.subRows = Object.entries(node.children).map(([key, value]) =>
            parseNode(value, [...path, key])
          );
        }

        return row;
      };

      const rows = [parseNode(data.tree)];
      const allOutputs = data.tree.outputs || [];
      const uniqueTimestamps = [
        ...new Set(allOutputs.map((output) => output.timestamp)),
      ].sort();

      return { timestamps: uniqueTimestamps, rows };
    },
    [selectedMetric]
  );

  const getComponentPath = useCallback((componentName: string): string[] => {
    const findPath = (rows: IRow[], target: string, currentPath: string[] = []): string[] => {
      for (const row of rows) {
        // Skip adding 'root' to the path
        const newPath = row.Component === 'root' ? [] : [...currentPath, row.Component];

        if (row.Component === target) {
          return row.Component === 'root' ? [] : newPath;
        }

        if (row.subRows) {
          const found = findPath(row.subRows, target, newPath);
          if (found.length > 0) return found;
        }
      }
      return [];
    };

    return findPath(rowData, componentName);
  }, [rowData]);

  const columns = useMemo(() => {
    if (!data) return [];

    const baseColumns = [
      columnHelper.accessor("Component", {
        header: "Component",
        cell: ({ row, getValue }) => {
          const value = getValue();
          const isSelected = value === selectedNode?.name;

          return (
            <div className={cn(
              "flex items-center gap-2",
              isSelected && "text-primary font-bold"
            )}>
              <div style={{ paddingLeft: `${row.depth * 32}px` }} className="flex items-center gap-2">
                {row.getCanExpand() ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      row.getToggleExpandedHandler()();
                    }}
                    className="focus:outline-none hover:bg-muted/50 rounded p-1"
                  >
                    {row.getIsExpanded() ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                ) : (
                  <div className="w-[24px]" />
                )}
                <span>{value}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const path = getComponentPath(value as string);
                  onNodeSelect(value as string, path, row.original.node);
                }}
                className="ml-2 hover:bg-muted/50 rounded p-1"
                title="View in pie chart"
              >
                <EyeIcon size={16} />
              </button>
            </div>
          );
        },
        size: 250,
      }),
      columnHelper.accessor("Total", {
        header: "Total",
        cell: (info) => {
          const value = Number(info.getValue());
          if (showPercentages) {
            const total = Number(rowData[0]?.Total || 1); // Use root total
            return `${((value / total) * 100).toFixed(1)}%`;
          }
          return value.toFixed(4);
        },
        size: 100,
      }),
    ];

    if (showTimestamps) {
      return [
        ...baseColumns,
        ...timestamps.map((_timestamp, index) =>
          columnHelper.accessor(`T${index + 1}` as const, {
            header: `T${index + 1}`,
            cell: (info) => {
              const value = info.getValue();
              if (value === undefined || value === null) return "N/A";
              if (showPercentages) {
                const total = Number(rowData[0]?.[`T${index + 1}`] || 1); // Use root total for the same timestamp
                return `${((Number(value) / total) * 100).toFixed(1)}%`;
              }
              return Number(value).toFixed(4);
            },
          })
        ),
      ];
    }

    return baseColumns;
  }, [data, selectedNode, getComponentPath, onNodeSelect, timestamps, showTimestamps, showPercentages, rowData]);
  const table = useReactTable({
    data: rowData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.subRows,
    onExpandedChange: setExpandedRows,
    state: {
      expanded: expandedRows,
    },
  });

  useEffect(() => {
    if (data) {
      const { rows, timestamps: times } = parseYamlData(data);
      setRowData(rows);
      setTimestamps(times);
    }
  }, [data, selectedMetric, parseYamlData]);

  // Auto-expand rows to show selected component
  useEffect(() => {
    if (selectedNode?.name && data) {
      const expandPath = (rows: IRow[], target: string): boolean => {
        for (const row of rows) {
          if (row.Component === target) return true;
          if (row.subRows) {
            const found = expandPath(row.subRows, target);
            if (found) {
              setExpandedRows((prev) => ({
                ...(typeof prev === 'object' ? prev : {}),
                [row.Component]: true,
              }));
              return true;
            }
          }
        }
        return false;
      };

      expandPath(rowData, selectedNode.name);
    }
  }, [selectedNode, rowData, data]);

  return (
    <div className="w-full overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "whitespace-nowrap",
                    header.id === "Component" && "sticky left-0 z-10 bg-primary-lightest-1 drop-shadow-md"
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                row.original.Component === selectedNode?.name && "bg-primary-lighter"
              )}
              onClick={() => {
                const path = getComponentPath(row.original.Component);
                onNodeSelect(row.original.Component, path, row.original.node);
              }}
            >
              {row.getVisibleCells().map((cell) => {
                const isHighlighted =
                  cell.column.id !== "Component" &&
                  cell.column.id !== "Total" &&
                  hoveredTimestamp ===
                  timestamps[parseInt(cell.column.id.slice(1)) - 1];

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "whitespace-nowrap",
                      cell.column.id === "Component" && "sticky left-0 z-10 bg-secondary-lightest-1 drop-shadow-md font-bold text-primary-dark",
                      isHighlighted && "bg-primary-lighter font-bold",
                      cell.column.id !== "Component" && "hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;