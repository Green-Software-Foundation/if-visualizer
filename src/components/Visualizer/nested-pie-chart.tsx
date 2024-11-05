import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Define distinct color schemes for each level
const COLOR_SCHEMES = {
  0: [ // Root level - Teals
    '#006d69',
    '#00918e',
    '#00b4b0',
    '#00d7d2',
  ],
  1: [ // First nested level - Blues
    '#0066cc',
    '#0080ff',
    '#3399ff',
    '#66b3ff',
  ],
  2: [ // Second nested level - Purples
    '#6600cc',
    '#7f00ff',
    '#9933ff',
    '#b366ff',
  ],
  3: [ // Third nested level - Greens
    '#006633',
    '#008040',
    '#00994d',
    '#00b359',
  ],
  4: [ // Fourth nested level - Oranges
    '#cc6600',
    '#ff8000',
    '#ff9933',
    '#ffb366',
  ]
};

const NestedPieChart = ({ data, onSliceClick, selectedComponent }) => {
  // Function to get color for a specific item based on its depth and index
  const getColor = (depth: number, index: number) => {
    const colorScheme = COLOR_SCHEMES[depth] || COLOR_SCHEMES[0];
    return colorScheme[index % colorScheme.length];
  };

  // Recursively process data to create nested pie chart data structure
  const processData = (rows, depth = 0, parentIndex = 0) => {
    return rows.map((row, index) => ({
      name: row.Component,
      value: row.Total,
      depth,
      children: row.subRows ? processData(row.subRows, depth + 1, index) : [],
      fill: getColor(depth, parentIndex * rows.length + index)
    }));
  };

  // Generate different radius for each level
  const generatePies = (data, startRadius = 70, increment = 30) => {
    const maxDepth = Math.max(...data.flatMap(item => getDepths(item)));
    return Array.from({ length: maxDepth + 1 }, (_, i) => ({
      outerRadius: startRadius + (i * increment),
      innerRadius: i === 0 ? 0 : startRadius + ((i - 1) * increment)
    }));
  };

  // Get all depths in the data
  const getDepths = (node, currentDepth = 0) => {
    const depths = [currentDepth];
    if (node.children) {
      depths.push(...node.children.flatMap(child => getDepths(child, currentDepth + 1)));
    }
    return depths;
  };

  // Flatten data for each level
  const flattenData = (data, depth = 0) => {
    const result = [];
    data.forEach(item => {
      result.push({ ...item, depth });
      if (item.children && item.children.length > 0) {
        result.push(...flattenData(item.children, depth + 1));
      }
    });
    return result;
  };

  const processedData = useMemo(() => processData(data), [data]);
  const pies = useMemo(() => generatePies(processedData), [processedData]);
  const flatData = useMemo(() => flattenData(processedData), [processedData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-primary">{data.name}</p>
          <p className="text-gray-600">Value: {data.value.toFixed(4)}</p>
          <p className="text-gray-500 text-sm">Level: {data.depth + 1}</p>
          {data.percentageOfParent && (
            <p className="text-gray-500 text-sm">
              % of Parent: {data.percentageOfParent.toFixed(2)}%
            </p>
          )}
          {data.percentageOfTotal && (
            <p className="text-gray-500 text-sm">
              % of Total: {data.percentageOfTotal.toFixed(2)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate total value for percentage calculations
  const totalValue = flatData
    .filter(item => item.depth === 0)
    .reduce((sum, item) => sum + item.value, 0);

  // Add percentage calculations to the data
  const addPercentages = (items, parentValue) => {
    return items.map(item => {
      const percentageOfTotal = (item.value / totalValue) * 100;
      const percentageOfParent = parentValue ? (item.value / parentValue) * 100 : 100;
      return {
        ...item,
        percentageOfTotal,
        percentageOfParent,
        children: item.children ? addPercentages(item.children, item.value) : []
      };
    });
  };

  const dataWithPercentages = useMemo(
    () => addPercentages(processedData, null),
    [processedData, totalValue]
  );

  const flatDataWithPercentages = useMemo(
    () => flattenData(dataWithPercentages),
    [dataWithPercentages]
  );

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          {pies.map((pie, depth) => (
            <Pie
              key={depth}
              data={flatDataWithPercentages.filter(item => item.depth === depth)}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              {...pie}
              onClick={(data) => onSliceClick(data.name)}
            >
              {flatDataWithPercentages
                .filter(item => item.depth === depth)
                .map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.fill}
                    opacity={selectedComponent === entry.name ? 1 : 0.8}
                    stroke={selectedComponent === entry.name ? "#000" : "white"}
                    strokeWidth={selectedComponent === entry.name ? 2 : 1}
                  />
                ))
              }
            </Pie>
          ))}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NestedPieChart;