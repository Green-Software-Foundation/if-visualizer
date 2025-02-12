import { useState, useEffect, useRef } from "react";
import Table from "./table";
import DrilldownPieChart from "./pie-chart";
import yaml from "js-yaml";
import { MetricGroup, MetricGroupItem } from "@/components/metric-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon, DownloadIcon } from "lucide-react";
import Title from "@/components/title";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  pipeline?: { compute: string[] };
  defaults?: { [key: string]: number | string };
  aggregated: AggregatedData;
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

interface SelectedNode {
  name: string;
  path: string[];
  data?: any;
}

const Visualizer = ({ fileUrl }: { fileUrl: string }) => {
  const [data, setData] = useState<YAMLData | null>(null);
  const [rawFile, setRawFile] = useState<string>("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [hoveredTimestamp] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cellDetails, setCellDetails] = useState<CellDetails | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(fileUrl);
        const text = await response.text();
        setRawFile(text);
        const parsedData = yaml.load(text) as YAMLData;
        setData(parsedData);
        const extractedMetrics = parsedData.aggregation.metrics;
        setMetrics(extractedMetrics);
        setSelectedMetric(extractedMetrics[0]);

        const githubRawRegex =
          /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/;
        const match = fileUrl.match(githubRawRegex);
        if (match) {
          const [, owner, repo, branch, path] = match;
          const githubFileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
          setGithubUrl(githubFileUrl);
        }
      } catch (error) {
        console.error("Error fetching YAML data:", error);
      }
    };

    fetchData();
  }, [fileUrl]);

  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
  };

  const handleNodeSelect = (nodeName: string, nodePath: string[], nodeData?: any) => {
    
    if (nodeData && !nodeData.children) {
      // It's a leaf node, show the drawer
      setCellDetails({
        inputs: nodeData.inputs?.[0] || {},
        outputs: nodeData.outputs?.[0] || {},
        pipeline: nodeData.pipeline?.compute || [],
        defaults: nodeData.defaults || {},
      });
      setIsDrawerOpen(true);
    }else{
      setSelectedNode({ name: nodeName, path: nodePath, data: nodeData });

    }
  };

  const getTotalForMetric = (metric: string) => {
    if (data && data.tree && data.tree.aggregated) {
      const total = data?.tree?.aggregated[metric];
      if (total !== undefined && data.explain) {
        const unit = data?.explain[metric]?.unit || "";
        return `${total.toFixed(3)} ${unit}`;
      }
    }
    return "";
  };

  return (
    <div className="py-10">
      <Card className="bg-primary-foreground text-center">
        <CardHeader>
          <CardTitle className="font-black text-primary text-xl">
            {data?.name}
          </CardTitle>
          <CardDescription>{data?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {githubUrl && (
              <a
                href={githubUrl}
                className="flex items-center justify-center space-x-2 text-sm text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 98 96"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-sm font-bold">
                  {new URL(githubUrl).pathname.split("/").pop()}
                </span>
              </a>
            )}
            <div className="flex items-center justify-center space-x-2">
              {data?.tree.outputs && data.tree.outputs.length > 0 && (
                <Badge>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {`${new Date(
                    data.tree.outputs[0].timestamp
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })} - ${new Date(
                    data.tree.outputs[data.tree.outputs.length - 1].timestamp
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })}`}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="visualizer" className="py-6">
        <div className="flex justify-center">
          <TabsList>
            <TabsTrigger value="visualizer">Visualizer</TabsTrigger>
            <TabsTrigger value="rawFile">Raw File</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="visualizer">
          <div className="flex flex-col space-y-2 mt-4">
            <MetricGroup
              value={selectedMetric}
              onValueChange={handleMetricChange}
              className="flex items-center justify-center"
            >
              {metrics.map((metric) => (
                <MetricGroupItem
                  key={metric}
                  value={metric}
                  label={metric}
                  total={getTotalForMetric(metric)}
                />
              ))}
            </MetricGroup>
          </div>

          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Component Details</DrawerTitle>
                <DrawerClose />
              </DrawerHeader>
              <ScrollArea className="h-[80vh]">
                {cellDetails && (
                  <div className="p-4">
                    {/* Add your drawer content here */}
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

          <div>
            <section className="py-8">
              <Title>Component Visualization</Title>
              <DrilldownPieChart
                data={data}
                selectedMetric={selectedMetric}
                selectedNode={selectedNode}
                onNodeSelect={handleNodeSelect}
              />
            </section>

            <section className="py-8">
              <Title>Component Breakdown</Title>
              <div ref={tableRef}>
                <Table
                  data={data}
                  selectedMetric={selectedMetric}
                  hoveredTimestamp={hoveredTimestamp}
                  selectedNode={selectedNode}
                  onNodeSelect={handleNodeSelect}
                />
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="rawFile">
          <div className="mt-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  const blob = new Blob([rawFile], { type: 'text/yaml' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = new URL(githubUrl).pathname.split("/").pop() || 'manifest.yaml';
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <DownloadIcon className="h-4 w-4" />
                Download
              </button>
            </div>
            <div className="p-4 rounded-lg bg-primary-lightest-1 border border-primary-lighter max-h-[600px] overflow-auto">
              <SyntaxHighlighter
                language="yaml"
                style={a11yLight}
                customStyle={{
                  backgroundColor: "transparent",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
                wrapLines={true}
                wrapLongLines={true}
              >
                {rawFile}
              </SyntaxHighlighter>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Visualizer;