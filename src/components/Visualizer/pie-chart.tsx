import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { generateColorScale } from "@/lib/utils";

interface TreeNode {
  children?: { [key: string]: TreeNode };
  outputs?: {
    [key: string]: string | number;
  }[];
  inputs?: {
    [key: string]: string | number;
  }[];
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

interface ChartData {
  name: string;
  value: number;
  children?: { [key: string]: TreeNode };
  node: TreeNode;
  path: string[];
  isLeaf: boolean;
}

interface SelectedNode {
  name: string;
  path: string[];
  data?: any;
}

interface DrilldownPieChartProps {
  data: YAMLData | null;
  selectedMetric: string;
  selectedNode: SelectedNode | null;
  onNodeSelect: (nodeName: string, path: string[], nodeData?: any) => void;
  showPercentages?: boolean;
}

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;
  return (
    <g>
    <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      </g>
  );
};

const renderCustomLabel = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, outerRadius, percent, name, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  // Calculate the position for the label and line
  const labelRadius = outerRadius * 1.2;
  const labelX = cx + labelRadius * cos;
  const labelY = cy + labelRadius * sin;

  // Calculate control point for the curved line
  const controlRadius = outerRadius * 1.1;
  const controlX = cx + controlRadius * cos;
  const controlY = cy + controlRadius * sin;

  // Calculate the starting point of the line (on the pie)
  const lineX = cx + (outerRadius + 10) * cos;
  const lineY = cy + (outerRadius + 10) * sin;

  // Determine text anchor based on angle
  const textAnchor = cos >= 0 ? 'start' : 'end';

  // Only show label if percent is above threshold (1%)
  if (percent < 0.01) return null;

  return (
    <g>
      <path
        d={`M ${lineX},${lineY} Q ${controlX},${controlY} ${labelX},${labelY}`}
        fill="none"
        stroke="#666"
        strokeWidth={1}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        fill="#666"
        dominantBaseline="middle"
        fontSize="12"
      >
        {props.showPercentages
          ? `${name}: ${(percent * 100).toFixed(1)}%`
          : `${name}: ${value.toFixed(2)}`}
      </text>
    </g>
  );
};

const DrilldownPieChart: React.FC<DrilldownPieChartProps> = ({
  data,
  selectedMetric,
  selectedNode,
  onNodeSelect,
  showPercentages = false
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentData, setCurrentData] = useState<ChartData[]>([]);

  // Transform tree data for pie chart
  const transformData = (node: TreeNode, currentPath: string[] = []): ChartData[] => {
    if (!node) return [];

    const nodeData = node.children
      ? Object.entries(node.children).map(([name, childNode]): ChartData => ({
        name,
        value: typeof childNode.outputs?.[0]?.[selectedMetric] === 'number'
          ? childNode.outputs[0][selectedMetric]
          : parseFloat(childNode.outputs?.[0]?.[selectedMetric] as string) || 0,
        children: childNode.children,
        isLeaf: !childNode.children,
        node: childNode,
        path: [...currentPath, name]
      }))
      : [];

    // Sort by value in descending order
    return nodeData.sort((a, b) => b.value - a.value);
  };

  useEffect(() => {
    if (data?.tree) {
      let currentNode = data.tree;
      const currentPath: string[] = [];

      // Navigate to current path
      if (selectedNode?.path) {
        for (const nodeName of selectedNode.path) {
          if (currentNode.children?.[nodeName]) {
            currentNode = currentNode.children[nodeName];
            currentPath.push(nodeName);
          } else {
            break;
          }
        }
      }

      const newData = transformData(currentNode, currentPath);
      setCurrentData(newData);
    }
  }, [data, selectedNode, selectedMetric]);

  const handleClick = (entry: ChartData) => {
    onNodeSelect(entry.name, entry.path, entry.node);
  };

  const handleBack = () => {
    if (!selectedNode?.path.length) return;

    const newPath = selectedNode.path.slice(0, -1);
    const parentName = newPath[newPath.length - 1] || 'root';
    onNodeSelect(parentName, newPath);
  };

  // Calculate total value for percentage
  const totalValue = currentData.reduce((sum, item) => sum + item.value, 0);

  // Define primary and secondary green colors
  const primaryHue = 178;
  const secondaryHue = 75;
  const maxLevels = 5; // Maximum expected drilldown levels

  // Calculate interpolated color values based on current level
  const level = selectedNode?.path.length || 0;
  const progress = level / maxLevels;

  // Interpolate between primary and secondary colors
  const hue = Math.round(primaryHue + (secondaryHue - primaryHue) * progress);
  const saturation = Math.round(100 + (54 - 100) * progress);
  const lightness = Math.round(21 + (56 - 21) * progress);

  const COLORS = generateColorScale(currentData.length, {
    hue,
    saturation,
    lightness,
    variation: "both"
  });

  return (
    <div className="w-full h-[400px] relative">
      {selectedNode !== null && selectedNode?.path.length > 0 && (
        <Button
          variant="ghost"
          className="absolute top-0 left-0 z-10"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to {selectedNode.path[selectedNode.path.length - 2] || 'Root'}
        </Button>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            activeIndex={activeIndex !== null ? activeIndex : undefined}
            activeShape={renderActiveShape}
            data={currentData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={150}
            dataKey="value"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(_, index) => handleClick(currentData[index])}
            label={(props) => renderCustomLabel({ ...props, showPercentages })}
            labelLine={false}
          >
            {currentData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index]}
                className="cursor-pointer"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className=" text-center text-sm text-gray-500">
        <div>
          {selectedNode !== null && selectedNode?.path.length > 0
            ? `Current: ${selectedNode.path.join(' > ')}`
            : 'Root Level'}
        </div>
        <div className="text-xs mt-1">
          {activeIndex !== null && currentData[activeIndex]
            ? `${currentData[activeIndex].name}: ${((currentData[activeIndex].value / totalValue) * 100).toFixed(1)}%`
            : 'Hover over slices to see details'}
        </div>
      </div>
    </div>
  );
};

export default DrilldownPieChart;