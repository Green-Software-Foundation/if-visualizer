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
  DrawerFooter,
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
import { ChevronRight, ChevronDown } from "lucide-react";

// Row Data Interface
interface IRow {
  [key: string]: string | number | boolean | undefined | IRow[];
  Component: string;
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

const Table: React.FC<TableProps> = ({ data, selectedMetric, hoveredTimestamp }) => {
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
          subRows: [],
        };

        outputs.forEach((output, index) => {
          row[`T${index + 1}`] = output[selectedMetric] || "";
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
          <div className="flex items-center">
            <div
              style={{ paddingLeft: `${row.depth * 32}px` }}
              className="flex items-center gap-2"
            >
              {row.getCanExpand() ? (
                <button
                  {...{
                    onClick: (e) => {
                      e.stopPropagation();
                      row.getToggleExpandedHandler()();
                    },
                    style: { cursor: "pointer" },
                  }}
                >
                  {row.getIsExpanded() ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ) : null}
              <span>{getValue()}</span>
            </div>
          </div>
        ),
        size: 250, // Set a wider fixed width for the Component column
      }),
      ...timestamps.map((timestamp, index) =>
        columnHelper.accessor(`T${index + 1}` as const, {
          header: `T${index + 1}`,
          cell: (info) => {
            const value = info.getValue();
            const isHighlighted = hoveredTimestamp === timestamp;
            return (
              <div className={isHighlighted ? 'bg-yellow-200' : ''}>
                {value !== undefined && value !== null ? String(value) : 'N/A'}
              </div>
            );
          },
        })
      ),
    ];
  }, [data, parseYamlData, columnHelper, hoveredTimestamp]);

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
      const columnIndex = timestamps.findIndex(t => t === hoveredTimestamp);
      if (columnIndex !== -1) {
        const columnElement = tableRef.current.querySelector(`th:nth-child(${columnIndex + 2})`);
        if (columnElement) {
          columnElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [hoveredTimestamp, timestamps]);

  const isHighlighted = (key: string) => {
    return (
      explanations[key]?.plugins?.some((plugin) =>
        highlightedPlugins.includes(plugin)
      ) || false
    );
  };

  return (
    <div className="overflow-auto relative" ref={tableRef}>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Cell Details</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="h-full p-4">
            {cellDetails && (
              <TooltipProvider>
                {/* Defaults section */}
                {cellDetails.defaults &&
                  Object.keys(cellDetails.defaults).length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Defaults</h3>
                      {Object.entries(cellDetails.defaults).map(
                        ([key, value]) => (
                          <div key={key}>
                            {explanations[key]?.description ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <p>{`${key}: ${value}`}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {explanations[key].description}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <p>{`${key}: ${value}`}</p>
                            )}
                          </div>
                        )
                      )}
                    </>
                  )}

                {/* Inputs section */}
                {cellDetails.inputs &&
                  Object.keys(cellDetails.inputs).length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Inputs</h3>
                      {Object.entries(cellDetails.inputs).map(
                        ([key, value]) => (
                          <div key={key}>
                            {explanations[key]?.description ||
                            explanations[key]?.plugins ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p
                                    className={`cursor-help ${
                                      isHighlighted(key) ? "bg-primary/50" : ""
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedPlugins(
                                        explanations[key]?.plugins || []
                                      )
                                    }
                                    onMouseLeave={() =>
                                      setHighlightedPlugins([])
                                    }
                                  >{`${key}: ${value}`}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {explanations[key]?.description && (
                                    <p>{explanations[key].description}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <p>{`${key}: ${value}`}</p>
                            )}
                          </div>
                        )
                      )}
                    </>
                  )}

                {/* Pipeline section */}
                {cellDetails.pipeline && cellDetails.pipeline.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold mt-4 mb-2">
                      Pipeline
                    </h3>
                    {cellDetails.pipeline.map((step, index) => (
                      <div key={index}>
                        <p
                          className={`cursor-pointer ${
                            highlightedPlugins.includes(step)
                              ? "bg-primary/50"
                              : ""
                          }`}
                          onMouseEnter={() => setHighlightedPlugins([step])}
                          onMouseLeave={() => setHighlightedPlugins([])}
                        >
                          {step}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Outputs section */}
                {cellDetails.outputs &&
                  Object.keys(cellDetails.outputs).length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold mt-4 mb-2 ">
                        Outputs
                      </h3>
                      {Object.entries(cellDetails.outputs).map(
                        ([key, value]) => (
                          <div key={key}>
                            {explanations[key]?.description ||
                            explanations[key]?.plugins ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p
                                    className={`cursor-help ${
                                      isHighlighted(key) ? "bg-primary/50" : ""
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedPlugins(
                                        explanations[key]?.plugins || []
                                      )
                                    }
                                    onMouseLeave={() =>
                                      setHighlightedPlugins([])
                                    }
                                  >{`${key}: ${value}`}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {explanations[key]?.description && (
                                    <p>{explanations[key].description}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <p>{`${key}: ${value}`}</p>
                            )}
                          </div>
                        )
                      )}
                    </>
                  )}
              </TooltipProvider>
            )}
          </ScrollArea>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`border whitespace-nowrap p-2 ${
                    header.id === "Component"
                      ? "sticky left-0 z-10 bg-white"
                      : ""
                  }`}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`border whitespace-nowrap p-2 cursor-pointer hover:bg-gray-100 ${
                    cell.column.id === "Component"
                      ? "sticky left-0 z-10 bg-white"
                      : ""
                  }`}
                  onClick={() => {
                    if (cell.column.id !== "expander") {
                      handleCellClick(row.original, cell.column.id);
                    }
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
