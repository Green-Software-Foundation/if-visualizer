import { useState, useEffect, useCallback } from "react";
import type { ColDef, AgGridEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "../../styles/ag-grid-theme-builder.css";
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

// Row Data Interface
interface IRow {
  [key: string]: string | number | boolean | undefined;
  Component: string;
  level: number;
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

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
};

// Create new Table component
const Table: React.FC<TableProps> = ({ data, selectedMetric }) => {
  const [rowData, setRowData] = useState<IRow[]>([]);
  const [colDefs, setColDefs] = useState<ColDef[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cellDetails, setCellDetails] = useState<CellDetails | null>(null);
  const [explanations, setExplanations] = useState<Record<string, Explanation>>(
    {}
  );
  const [highlightedPlugins, setHighlightedPlugins] = useState<string[]>([]);
  const parseYamlData = useCallback(
    (data: YAMLData) => {
      const parseNode = (
        node: TreeNode,
        path: string[] = [],
        level: number = 0,
        rows: IRow[] = []
      ): IRow[] => {
        const outputs = node.outputs || [];
        const row: IRow = {
          Component: path[path.length - 1] || data.name,
          level,
        };

        outputs.forEach((output, index) => {
          row[`T${index + 1}`] = output[selectedMetric] || "";
        });

        rows.push(row);

        if (node.children) {
          Object.entries(node.children).forEach(([key, value]) => {
            parseNode(value, [...path, key], level + 1, rows);
          });
        }

        return rows;
      };

      const rows = parseNode(data.tree, []);

      const allOutputs = data.tree.outputs || [];
      const uniqueTimestamps = [
        ...new Set(allOutputs.map((output) => output.timestamp)),
      ].sort();

      return { timestamps: uniqueTimestamps, rows };
    },
    [selectedMetric]
  );

  const updateColumnDefs = useCallback((timestamps: string[]) => {
    const columnDefs: ColDef[] = [
      {
        field: "Component",
        headerName: "Component",
        cellRenderer: (params: { data: IRow }) => {
          const { data } = params;
          const indent = data.level * 20;
          return (
            <div style={{ paddingLeft: `${indent}px` }}>{data.Component}</div>
          );
        },
        pinned: "left",
        lockPosition: true,
      },
      ...timestamps.map((_, index) => ({
        field: `T${index + 1}`,
        headerName: `T${index + 1}`,
        valueFormatter: (params: { value: string }) => params.value || "N/A",
      })),
    ];
    setColDefs(columnDefs);
  }, []);

  const handleCellClick = (params: AgGridEvent) => {
    const { data: rowData, colDef } = params as unknown as {
      data: IRow;
      colDef: { field: string };
    };
    const timestamp = colDef.field;
    const componentName = rowData.Component;

    // Find the corresponding data in the YAML structure
    const componentData = findComponentData(data?.tree || null, componentName);
    if (!componentData) return;

    const timeIndex = parseInt(timestamp.slice(1)) - 1; // Convert T1, T2, etc. to 0-based index
    const inputData = componentData.inputs?.[timeIndex] || {};
    const outputData = componentData.outputs?.[timeIndex] || {};
    const pipelineData = componentData.pipeline?.compute || [];
    const defaultsData = componentData.defaults || {};
    // Construct cell details
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
      const { timestamps, rows } = parseYamlData(data);
      setRowData(rows);
      updateColumnDefs(timestamps);
    }
  }, [data, selectedMetric, parseYamlData, updateColumnDefs]);

  useEffect(() => {
    if (data && data.explainer) {
      setExplanations(data.explain);
    }
  }, [data]);

  const isHighlighted = (key: string) => {
    return (
      explanations[key]?.plugins?.some((plugin) =>
        highlightedPlugins.includes(plugin)
      ) || false
    );
  };

  return (
    <div className="ag-theme-custom" style={{ height: 500 }}>
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

      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={{
          ...defaultColDef,
          onCellClicked: handleCellClick,
        }}
        autoSizeStrategy={{
          type: "fitCellContents",
        }}
        animateRows={true}
      />
    </div>
  );
};

export default Table;
