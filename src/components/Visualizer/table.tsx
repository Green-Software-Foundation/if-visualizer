import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { Button } from "../ui/button";
import Title from "../title";

// Row Data Interface
interface IRow {
  [key: string]: string | number | boolean | undefined | IRow[];
  Component: string;
  Total: number;
  subRows?: IRow[];
}

interface OutputData {
  timestamp: string;
  [key: string]: string | number;
}

interface TreeNode {
  children?: { [key: string]: TreeNode };
  outputs?: OutputData[];
  inputs?: { [key: string]: number | string }[];
  pipeline?: { compute: string[] };
  defaults?: { [key: string]: number | string };
}

interface YAMLData {
  name: string;
  description: string;
  aggregation: {
    metrics: string[];
    type: string;
  };
  explain: {
    [key: string]: {
      plugins?: string[];
      unit?: string;
      description: string;
      "aggregation-method"?: string;
    };
  };
  explainer: boolean;
  tree: TreeNode;
}

interface TableProps {
  data: YAMLData | null;
  selectedMetric: string;
  hoveredTimestamp: string | null;
}

interface CellDetails {
  inputs: {
    [key: string]: number | string;
  };
  outputs: {
    [key: string]: number | string;
  };
  pipeline: string[];
  defaults: {
    [key: string]: number | string;
  };
}

interface Explanation {
  description?: string;
  plugins?: string[];
}

// Add this new generic component
interface DataSectionProps {
  title: string;
  data: { [key: string]: number | string } | string[];
  explanations: Record<string, Explanation>;
  onMouseEnter?: (plugins: string[]) => void;
  onMouseLeave?: () => void;
  highlightedPlugins?: string[];
}

const DataSection: React.FC<DataSectionProps> = ({
  title,
  data,
  explanations,
  onMouseEnter,
  onMouseLeave,
  highlightedPlugins = [],
}) => (
  <div className="flex flex-col gap-2">
    <Title className="mb-0">{title}</Title>
    {Array.isArray(data)
      ? data.map((item, index) => (
          <div key={index}>
            <p
              className={`p-1 rounded-md text-primary-darker font-bold ${
                highlightedPlugins.includes(item) ? "bg-primary-lighter" : ""
              }`}
              onMouseEnter={() => onMouseEnter?.([item])}
              onMouseLeave={() => onMouseLeave?.()}
            >
              {item}
            </p>
          </div>
        ))
      : Object.entries(data).map(([key, value]) => {
          const hasTooltip =
            explanations[key]?.description || explanations[key]?.plugins;
          return (
            <div key={key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`p-1 rounded-md text-primary-darker ${hasTooltip ? "cursor-help" : ""} ${
                      highlightedPlugins.some((plugin) =>
                        explanations[key]?.plugins?.includes(plugin)
                      )
                        ? "bg-primary-lighter"
                        : ""
                    }`}
                    onMouseEnter={() =>
                      onMouseEnter?.(explanations[key]?.plugins || [])
                    }
                    onMouseLeave={() => onMouseLeave?.()}
                  >
                    <span className="font-bold">{key}: </span>
                    <span>{value}</span>
                  </div>
                </TooltipTrigger>
                {hasTooltip && (
                  <TooltipContent>
                    {explanations[key]?.description && (
                      <p>{explanations[key].description}</p>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          );
        })}
  </div>
);

const DataTable: React.FC<TableProps> = ({
  data,
  selectedMetric,
  hoveredTimestamp,
}) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cellDetails, setCellDetails] = useState<CellDetails | null>(null);
  const [explanations, setExplanations] = useState<Record<string, Explanation>>(
    {}
  );
  const [highlightedPlugins, setHighlightedPlugins] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>({});
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  const columnHelper = createColumnHelper<IRow>();

  const parseYamlData = useCallback(
    (data: YAMLData) => {
      const parseNode = (node: TreeNode, path: string[] = []): IRow => {
        const outputs = node.outputs || [];
        const row: IRow = {
          Component: path[path.length - 1] || "root",
          Total: 0, // Initialize Total column
          subRows: [],
        };

        outputs.forEach((output, index) => {
          const value = output[selectedMetric] || 0;
          row[`T${index + 1}`] = value;
          row.Total += Number(value); // Add to Total
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

  const columns = useMemo(() => {
    if (!data) return [];

    const { timestamps } = parseYamlData(data);
    return [
      columnHelper.accessor("Component", {
        header: "Component",
        cell: ({ row, getValue }) => (
          <div
            className="flex items-center cursor-pointer"
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
        size: 250, // Set a wider fixed width for the Component column
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
  }, [data, parseYamlData, columnHelper]);

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
    const timestamp = columnId;

    // Find the corresponding data in the YAML structure
    const componentData = findComponentData(data?.tree || null, componentName);
    if (!componentData) return;

    const timeIndex = parseInt(timestamp.slice(1)) - 1;
    const inputData = componentData.inputs?.[timeIndex] || {};
    const outputData = componentData.outputs?.[timeIndex] || {};
    const pipelineData = componentData.pipeline?.compute || [];
    const defaultsData = componentData.defaults || {};

    const details: CellDetails = {
      defaults: defaultsData,
      inputs: inputData,
      outputs: outputData,
      pipeline: pipelineData,
    };

    setCellDetails(details);
    setIsDrawerOpen(true);
  };

  // Helper function to find component data in the tree
  const findComponentData = (
    tree: TreeNode | null,
    componentName: string
  ): TreeNode | null => {
    if (!tree) return null;

    // Check if the current node is the component we're looking for
    if (tree.children && tree.children[componentName]) {
      return tree.children[componentName];
    }

    // If not, recursively search through all children
    for (const childName in tree.children) {
      const result = findComponentData(tree.children[childName], componentName);
      if (result) return result;
    }

    // If we've searched all children and haven't found it, return null
    return null;
  };

  useEffect(() => {
    if (data) {
      const { rows, timestamps } = parseYamlData(data);
      setRowData(rows);
      setTimestamps(timestamps);
    }
  }, [data, selectedMetric, parseYamlData]);

  useEffect(() => {
    if (data && data.explainer) {
      setExplanations(data.explain);
    }
  }, [data]);

  useEffect(() => {
    if (hoveredTimestamp && tableRef.current) {
      const columnIndex = timestamps.findIndex((t) => t === hoveredTimestamp);
      if (columnIndex !== -1) {
        const columnElement = tableRef.current.querySelector(
          `th:nth-child(${columnIndex + 2})`
        );
        if (columnElement) {
          columnElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    }
  }, [hoveredTimestamp, timestamps]);

  return (
    <div className="overflow-auto relative" ref={tableRef}>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="flex flex-col bg-primary-lightest-2 justify-between">
            <DrawerClose className="self-end">
              <Button variant="link">
                <XIcon size={16} />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-2xl font-bold text-primary">
              Cell Details
            </DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-full p-4">
            {cellDetails && (
              <TooltipProvider>
                {/* Use the new DataSection component for all sections */}
                {cellDetails.defaults &&
                  Object.keys(cellDetails.defaults).length > 0 && (
                    <>
                      <DataSection
                        title="Defaults"
                        data={cellDetails.defaults}
                        explanations={explanations}
                        onMouseEnter={setHighlightedPlugins}
                        onMouseLeave={() => setHighlightedPlugins([])}
                        highlightedPlugins={highlightedPlugins}
                      />
                      {(cellDetails.inputs ||
                        cellDetails.pipeline ||
                        cellDetails.outputs) && (
                        <hr className="my-4 border-t border-gray-200" />
                      )}
                    </>
                  )}

                {cellDetails.inputs &&
                  Object.keys(cellDetails.inputs).length > 0 && (
                    <>
                      <DataSection
                        title="Inputs"
                        data={cellDetails.inputs}
                        explanations={explanations}
                        onMouseEnter={setHighlightedPlugins}
                        onMouseLeave={() => setHighlightedPlugins([])}
                        highlightedPlugins={highlightedPlugins}
                      />
                      {(cellDetails.pipeline || cellDetails.outputs) && (
                        <hr className="my-4 border-t border-gray-200" />
                      )}
                    </>
                  )}

                {cellDetails.pipeline && cellDetails.pipeline.length > 0 && (
                  <>
                    <DataSection
                      title="Pipeline"
                      data={cellDetails.pipeline}
                      explanations={explanations}
                      onMouseEnter={setHighlightedPlugins}
                      onMouseLeave={() => setHighlightedPlugins([])}
                      highlightedPlugins={highlightedPlugins}
                    />
                    {cellDetails.outputs &&
                      Object.keys(cellDetails.outputs).length > 0 && (
                        <hr className="my-4 border-t border-gray-200" />
                      )}
                  </>
                )}

                {cellDetails.outputs &&
                  Object.keys(cellDetails.outputs).length > 0 && (
                    <DataSection
                      title="Outputs"
                      data={cellDetails.outputs}
                      explanations={explanations}
                      onMouseEnter={setHighlightedPlugins}
                      onMouseLeave={() => setHighlightedPlugins([])}
                      highlightedPlugins={highlightedPlugins}
                    />
                  )}
              </TooltipProvider>
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const isHighlighted =
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
                    onClick={() => {
                      if (cell.column.id === "Component") {
                        row.getToggleExpandedHandler()();
                      } else {
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
