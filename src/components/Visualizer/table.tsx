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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, XIcon, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Title from "@/components/title";

interface IRow {
  Component: string;
  Total: number;
  subRows?: IRow[];
  [key: string]: string | number | boolean | undefined | IRow[];
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

interface CellDetails {
  inputs: { [key: string]: number | string };
  outputs: { [key: string]: number | string };
  pipeline: string[];
  defaults: { [key: string]: number | string };
}

interface TableProps {
  data: YAMLData | null;
  selectedMetric: string;
  hoveredTimestamp: string | null;
  highlightedComponent: string;
  onViewComponent: (path: string[]) => void; // Add this new prop
}

const DataTable: React.FC<TableProps> = ({
  data,
  selectedMetric,
  hoveredTimestamp,
  highlightedComponent,
  onViewComponent,
}) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cellDetails, setCellDetails] = useState<CellDetails | null>(null);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [timestamps, setTimestamps] = useState<string[]>([]);

  const columnHelper = createColumnHelper<IRow>();

  const parseYamlData = useCallback(
    (data: YAMLData) => {
      const parseNode = (node: TreeNode, path: string[] = []): IRow => {
        const outputs = node.outputs || [];
        const row: IRow = {
          Component: path[path.length - 1] || "root",
          Total: 0,
          subRows: [],
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

  const findNodeInTree = useCallback(
    (tree: TreeNode, path: string[]): TreeNode | null => {
      let current = tree;
      for (const component of path) {
        if (!current.children?.[component]) return null;
        current = current.children[component];
      }
      return current;
    },
    []
  );

  const showDrawer = useCallback(
    (nodePath: string[]) => {
      if (!data) return;

      const node = findNodeInTree(data.tree, nodePath);
      if (!node) return;

      setCellDetails({
        inputs: node.inputs?.[0] || {},
        outputs: node.outputs?.[0] || {},
        pipeline: node.pipeline?.compute || [],
        defaults: node.defaults || {},
      });
      setIsDrawerOpen(true);
    },
    [data, findNodeInTree]
  );

  const getComponentPath = useCallback((componentName: string): string[] => {
    const findPath = (rows: IRow[], target: string, currentPath: string[] = []): string[] => {
      for (const row of rows) {
        if (row.Component === target) return [...currentPath, target];
        if (row.subRows) {
          const found = findPath(row.subRows, target, [...currentPath, row.Component]);
          if (found.length > 0) return found;
        }
      }
      return [];
    };
    
    return findPath(rowData, componentName);
  }, [rowData]);

  const columns = useMemo(() => {
   if (!data) return [];

    const { timestamps } = parseYamlData(data);
    return [
      columnHelper.accessor("Component", {
        header: "Component",
        cell: ({ row, getValue }) => {
          const value = getValue();
          const isHighlighted = value === highlightedComponent;
          
          return (
            <div className={`flex items-center gap-2 ${
              isHighlighted ? "text-primary font-bold" : ""
            }`}>
              <div style={{ paddingLeft: `${row.depth * 32}px` }} className="flex items-center gap-2">
                {row.getCanExpand() ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      row.getToggleExpandedHandler()();
                    }}
                    className="focus:outline-none hover:bg-gray-100 rounded p-1"
                  >
                    {row.getIsExpanded() ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                ) : (
                  // Add padding to align with rows that have chevrons
                  <div className="w-[24px]" /> 
                )}
                <span>{value}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const path = getComponentPath(value as string);
                  onViewComponent(path);
                }}
                className="ml-2 hover:bg-gray-100 rounded p-1"
                title="View in pie chart"
              >
                <Eye size={16} />
              </button>
            </div>
          );
        },
        size: 250,
      }),
      columnHelper.accessor("Total", {
        header: "Total",
        cell: (info) => info.getValue().toFixed(4),
        size: 100,
      }),
      ...timestamps.map((_timestamp, index) =>
        columnHelper.accessor(`T${index + 1}` as const, {
          header: `T${index + 1}`,
          cell: (info) => {
            const value = info.getValue();
            return value !== undefined && value !== null
              ? Number(value).toFixed(4)
              : "N/A";
          },
        })
      ),
    ];
  }, [data, parseYamlData, columnHelper, highlightedComponent, getComponentPath, onViewComponent]);

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

  // Auto-expand rows to show highlighted component
  useEffect(() => {
    if (highlightedComponent && data) {
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

      expandPath(rowData, highlightedComponent);
    }
  }, [highlightedComponent, rowData, data]);

  return (
    <div className="overflow-auto">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Component Details</DrawerTitle>
            <DrawerClose>
              <Button variant="ghost">
                <XIcon size={16} />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <ScrollArea className="h-[80vh] p-4">
            {cellDetails && (
              <div className="space-y-4">
                {Object.keys(cellDetails.defaults).length > 0 && (
                  <div>
                    <Title>Defaults</Title>
                    {Object.entries(cellDetails.defaults).map(([key, value]) => (
                      <div key={key} className="p-1">
                        <span className="font-bold">{key}: </span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {Object.keys(cellDetails.inputs).length > 0 && (
                  <div>
                    <Title>Inputs</Title>
                    {Object.entries(cellDetails.inputs).map(([key, value]) => (
                      <div key={key} className="p-1">
                        <span className="font-bold">{key}: </span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {cellDetails.pipeline.length > 0 && (
                  <div>
                    <Title>Pipeline</Title>
                    {cellDetails.pipeline.map((item, index) => (
                      <div key={index} className="p-1">
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(cellDetails.outputs).length > 0 && (
                  <div>
                    <Title>Outputs</Title>
                    {Object.entries(cellDetails.outputs).map(([key, value]) => (
                      <div key={key} className="p-1">
                        <span className="font-bold">{key}: </span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

     <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={`whitespace-nowrap ${
                    header.id === "Component"
                      ? "sticky left-0 z-10 bg-primary-lightest-2 drop-shadow-md"
                      : ""
                  }`}
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
              className={row.original.Component === highlightedComponent ? "bg-primary-lighter" : ""}
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
                    className={`whitespace-nowrap ${
                      cell.column.id === "Component"
                        ? "sticky left-0 z-10 bg-secondary-lightest-1 drop-shadow-md font-bold text-primary-dark"
                        : "hover:bg-gray-100 cursor-pointer"
                    } ${isHighlighted ? "bg-primary-lighter font-bold" : ""}`}
                    onClick={() => {
                      if (cell.column.id !== "Component" && !row.original.subRows?.length) {
                        showDrawer([row.original.Component]);
                      }
                    }}
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