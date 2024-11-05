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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, ChevronDown, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Title from "@/components/title";

interface IRow {
  [key: string]: string | number | boolean | undefined | IRow[];
  Component: string;
  Total: number;
  subRows?: IRow[];
}

interface TableProps {
  data: any;
  selectedMetric: string;
  selectedComponent: string | null;
  onRowClick: (component: string) => void;
  showTimeSeries: boolean;
  hoveredTimestamp: string | null;
}

interface CellDetails {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  pipeline: string[];
  defaults: Record<string, any>;
}

const DataTable: React.FC<TableProps> = ({
  data,
  selectedMetric,
  selectedComponent,
  onRowClick,
  showTimeSeries,
  hoveredTimestamp,
}) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cellDetails, setCellDetails] = useState<CellDetails | null>(null);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [timestamps, setTimestamps] = useState<string[]>([]);

  const columnHelper = createColumnHelper<IRow>();

  const parseYamlData = useCallback(
    (data: any) => {
      const parseNode = (node: any, path: string[] = []): IRow => {
        const row: IRow = {
          Component: path[path.length - 1] || "root",
          Total: node.aggregated?.[selectedMetric] || 0,
          subRows: [],
        };

        if (showTimeSeries && node.outputs) {
          node.outputs.forEach((output: any, index: number) => {
            row[`T${index + 1}`] = output[selectedMetric] || 0;
          });
        }

        if (node.children) {
          row.subRows = Object.entries(node.children).map(([key, value]) =>
            parseNode(value, [...path, key])
          );
        }

        return row;
      };

      const newData = [parseNode(data.tree)];
      const newTimestamps = showTimeSeries && data.tree.outputs 
        ? data.tree.outputs.map((output: any) => output.timestamp)
        : [];

      return { rows: newData, timestamps: newTimestamps };
    },
    [selectedMetric, showTimeSeries]
  );

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor("Component", {
        header: "Component",
        cell: ({ row, getValue }) => (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => row.getToggleExpandedHandler()()}
          >
            <div
              style={{ paddingLeft: `${row.depth * 32}px` }}
              className="flex items-center gap-2"
            >
              {row.getCanExpand() ? (
                <span>
                  {row.getIsExpanded() ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </span>
              ) : null}
              <span>{getValue()}</span>
            </div>
          </div>
        ),
        size: 250,
      }),
      columnHelper.accessor("Total", {
        header: "Total",
        cell: (info) => info.getValue().toFixed(4),
        size: 100,
      }),
    ];

    if (showTimeSeries) {
      const timeSeriesColumns = timestamps.map((_timestamp, index) =>
        columnHelper.accessor(`T${index + 1}` as const, {
          header: `T${index + 1}`,
          cell: (info) => {
            const value = info.getValue();
            return value !== undefined && value !== null
              ? Number(value).toFixed(4)
              : "N/A";
          },
        })
      );
      return [...baseColumns, ...timeSeriesColumns];
    }

    return baseColumns;
  }, [columnHelper, timestamps, showTimeSeries]);

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

  const handleCellClick = (rowData: IRow, columnId: string) => {
    const componentName = rowData.Component;
    const componentData = findComponentData(data?.tree || null, componentName);
    if (!componentData) return;

    const timeIndex = parseInt(columnId.slice(1)) - 1;
    const inputData = componentData.inputs?.[timeIndex] || {};
    const outputData = componentData.outputs?.[timeIndex] || {};
    const pipelineData = componentData.pipeline?.compute || [];
    const defaultsData = componentData.defaults || {};

    setCellDetails({
      inputs: inputData,
      outputs: outputData,
      pipeline: pipelineData,
      defaults: defaultsData,
    });
    setIsDrawerOpen(true);
  };

  const findComponentData = (tree: any, componentName: string): any => {
    if (!tree) return null;
    if (tree.children && tree.children[componentName]) {
      return tree.children[componentName];
    }
    for (const childName in tree.children) {
      const result = findComponentData(tree.children[childName], componentName);
      if (result) return result;
    }
    return null;
  };

  useEffect(() => {
    if (data) {
      const { rows, timestamps: newTimestamps } = parseYamlData(data);
      setRowData(rows);
      setTimestamps(newTimestamps);
    }
  }, [data, selectedMetric, parseYamlData]);

  useEffect(() => {
    if (selectedComponent) {
      const expandToComponent = (rows: IRow[]): string[] => {
        for (const row of rows) {
          if (row.Component === selectedComponent) {
            return [];
          }
          if (row.subRows) {
            const path = expandToComponent(row.subRows);
            if (path.length >= 0) {
              return [row.Component, ...path];
            }
          }
        }
        return [-1];
      };

      const pathToExpand = expandToComponent(rowData);
      if (pathToExpand.length >= 0) {
        const newExpanded: ExpandedState = {};
        pathToExpand.forEach((component) => {
          newExpanded[component] = true;
        });
        setExpandedRows(newExpanded);
      }
    }
  }, [selectedComponent, rowData]);

  return (
    <div className="overflow-auto relative">
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="flex flex-col bg-primary-lightest-2 justify-between">
            <DrawerClose className="self-end">
              <Button variant="link">
                <XIcon size={16} />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-2xl font-bold text-primary">
              Component Details
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-full p-4">
            <TooltipProvider>
              {cellDetails && (
                <div className="space-y-4">
                  {Object.keys(cellDetails.defaults).length > 0 && (
                    <div>
                      <Title>Defaults</Title>
                      <pre className="bg-gray-50 p-4 rounded-lg">
                        {JSON.stringify(cellDetails.defaults, null, 2)}
                      </pre>
                    </div>
                  )}
                  {Object.keys(cellDetails.inputs).length > 0 && (
                    <div>
                      <Title>Inputs</Title>
                      <pre className="bg-gray-50 p-4 rounded-lg">
                        {JSON.stringify(cellDetails.inputs, null, 2)}
                      </pre>
                    </div>
                  )}
                  {cellDetails.pipeline.length > 0 && (
                    <div>
                      <Title>Pipeline</Title>
                      <pre className="bg-gray-50 p-4 rounded-lg">
                        {JSON.stringify(cellDetails.pipeline, null, 2)}
                      </pre>
                    </div>
                  )}
                  {Object.keys(cellDetails.outputs).length > 0 && (
                    <div>
                      <Title>Outputs</Title>
                      <pre className="bg-gray-50 p-4 rounded-lg">
                        {JSON.stringify(cellDetails.outputs, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </TooltipProvider>
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
              data-component={row.original.Component}
              className={
                selectedComponent === row.original.Component
                  ? "bg-primary-lighter"
                  : ""
              }
              onClick={() => onRowClick(row.original.Component)}
            >
              {row.getVisibleCells().map((cell) => {
                const isHighlighted =
                  showTimeSeries &&
                  cell.column.id !== "Component" &&
                  cell.column.id !== "Total" &&
                  hoveredTimestamp ===
                    timestamps[parseInt(cell.column.id.slice(1)) - 1];

                return (
                  <TableCell
                    key={cell.id}
                    className={`whitespace-nowrap cursor-pointer hover:bg-gray-100 ${
                      cell.column.id === "Component"
                        ? "sticky left-0 z-10 bg-secondary-lightest-1 drop-shadow-md font-bold text-primary-dark"
                        : ""
                    } ${isHighlighted ? "bg-primary-lighter font-bold" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cell.column.id !== "Component" && showTimeSeries && cell.column.id !== "Total") {
                        handleCellClick(row.original, cell.column.id);
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