import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface DrilldownPieChartProps {
  data: any;
  selectedMetric: string;
  onNodeClick: (nodeName: string, nodeData: any) => void;
  onPathChange: (path: string[]) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
  } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#888">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#333" fontSize="16px">
        {value.toFixed(4)}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const DrilldownPieChart: React.FC<DrilldownPieChartProps> = ({ 
  data, 
  selectedMetric, 
  onNodeClick,
  onPathChange 
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [currentData, setCurrentData] = useState<any[]>([]);

  // Transform tree data for pie chart
  const transformData = (node: any, currentPath: string[] = []) => {
    if (!node) return [];
    
    const nodeData = node.children 
      ? Object.entries(node.children).map(([name, childNode]: [string, any]) => ({
          name,
          value: childNode.outputs?.[0]?.[selectedMetric] || 0,
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
      // Navigate to current path
      for (const nodeName of path) {
        if (currentNode.children?.[nodeName]) {
          currentNode = currentNode.children[nodeName];
        } else {
          // Reset path if invalid
          setPath([]);
          currentNode = data.tree;
          break;
        }
      }
      const newData = transformData(currentNode, path);
      setCurrentData(newData);
    }
  }, [data, path, selectedMetric]);

  const handleClick = (entry: any) => {
    if (entry.isLeaf) {
      // If it's a leaf node, show the flyout
      onNodeClick(entry.name, entry.node);
    } else {
      // If it has children, drill down
      const newPath = [...path, entry.name];
      setPath(newPath);
      onPathChange(newPath);
    }
  };

  const handleBack = () => {
    if (path.length === 0) return;
    
    const newPath = path.slice(0, -1);
    setPath(newPath);
    onPathChange(newPath);
    setActiveIndex(null);
  };

  // Calculate total value for percentage
  const totalValue = currentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full h-[400px] relative">
      {path.length > 0 && (
        <Button
          variant="ghost"
          className="absolute top-0 left-0 z-10"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to {path[path.length - 2] || 'Root'}
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
            innerRadius={80}
            outerRadius={150}
            dataKey="value"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(entry) => handleClick(entry)}
          >
            {currentData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                className="cursor-pointer"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 right-0 text-center text-sm text-gray-500">
        <div>{path.length > 0 ? `Current: ${path.join(' > ')}` : 'Root Level'}</div>
        <div className="text-xs mt-1">
          {activeIndex !== null && currentData[activeIndex] ? 
            `${currentData[activeIndex].name}: ${((currentData[activeIndex].value / totalValue) * 100).toFixed(1)}%` 
            : 'Hover over slices to see details'}
        </div>
      </div>
    </div>
  );
};

export default DrilldownPieChart;