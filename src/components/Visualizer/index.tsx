import { useState, useEffect, useRef } from "react";
import Table from "./table";
import Chart from "./chart";
import yaml from "js-yaml";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { CalendarIcon, MapPinIcon } from "lucide-react";

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
  const [metrics, setMetrics] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");

  const [hoveredTimestamp, setHoveredTimestamp] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(fileUrl);
        const text = await response.text();

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

  return (
    <div className="py-12 md:py-16">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{data?.name }</CardTitle>
          <CardDescription>{data?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {data?.tree.outputs?.[0]?.timestamp ? 
                new Date(data.tree.outputs[0].timestamp).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: '2-digit' 
                }) 
                : '13 Jun 24 - 18 Aug 24'}
            </Badge>
            <Badge variant="secondary">
              <MapPinIcon className="h-4 w-4 mr-2" />
              London, UK
            </Badge>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col space-y-2">
        <Label>Select Metric</Label>
        <RadioGroup value={selectedMetric} onValueChange={handleMetricChange}>
          <div className="flex flex-col space-y-2">
            {metrics.map((metric) => (
              <div key={metric} className="flex items-center space-x-2">
                <RadioGroupItem value={metric} id={metric} />
                <Label htmlFor={metric}>{metric}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Chart 
          data={data} 
          selectedMetric={selectedMetric} 
          onHover={handleChartHover}
        />
        <div ref={tableRef}>
          <Table 
            data={data} 
            selectedMetric={selectedMetric} 
            hoveredTimestamp={hoveredTimestamp}
          />
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
