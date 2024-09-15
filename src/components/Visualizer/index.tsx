import { useState, useEffect, useRef } from "react";
import Table from "./table";
import Chart from "./chart";
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
import { CalendarIcon } from "lucide-react";
import Title from "@/components/title";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

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

const Visualizer = ({ fileUrl }: { fileUrl: string }) => {
  const [data, setData] = useState<YAMLData | null>(null);
  const [rawFile, setRawFile] = useState<string>("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");

  const [hoveredTimestamp, setHoveredTimestamp] = useState<string | null>(null);
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
      } catch (error) {
        console.error("Error fetching YAML data:", error);
      }
    };

    fetchData();
  }, [fileUrl]);

  const handleMetricChange = (metric: string) => {
    setSelectedMetric(metric);
  };

  const handleChartHover = (timestamp: string | null) => {
    setHoveredTimestamp(timestamp);
  };

  const getTotalForMetric = (metric: string) => {
    if (data && data.tree && data.tree.aggregated) {
      const total = data.tree.aggregated[metric];
      if (total !== undefined) {
        const unit = data.explain[metric]?.unit || "";
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
          <div className="flex items-center justify-center space-x-2">
            {data?.tree.outputs && data.tree.outputs.length > 0 && (
              <Badge>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {`${new Date(data.tree.outputs[0].timestamp).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  }
                )} - ${new Date(
                  data.tree.outputs[data.tree.outputs.length - 1].timestamp
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}`}
              </Badge>
            )}
            {/* <Badge variant="secondary">
              <MapPinIcon className="h-4 w-4 mr-2" />
              London, UK
            </Badge> */}
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
          <div>
            <section className="py-8">
              <Title>Totals Over Time</Title>
              <Chart
                data={data}
                selectedMetric={selectedMetric}
                onHover={handleChartHover}
              />
            </section>
            <section className="py-8">
              <Title>Component Breakdown</Title>

              <div ref={tableRef}>
                <Table
                  data={data}
                  selectedMetric={selectedMetric}
                  hoveredTimestamp={hoveredTimestamp}
                />
              </div>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="rawFile">
          <div className="mt-4 p-4 rounded-lg bg-primary-lightest-1 border border-primary-lighter max-h-[600px] overflow-auto">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Visualizer;
