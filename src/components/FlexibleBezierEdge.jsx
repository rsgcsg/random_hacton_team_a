import React from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

const FlexibleBezierEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  // Advanced flexible path calculation with intersection avoidance
  const calculateAdvancedFlexiblePath = () => {
    const deltaX = targetX - sourceX;
    const deltaY = targetY - sourceY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance === 0) {
      return getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        curvature: 0.25
      });
    }
    
    // Calculate intelligent control points for better arrow routing
    const baseOffset = Math.min(distance * 0.4, 200);
    
    // Create unique variation for each arrow to spread them out
    const idHash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const variation = (Math.abs(idHash) % 100) / 100; // 0-1 range
    const offsetMultiplier = 0.7 + variation * 0.6; // 0.7-1.3 range
    const curvatureOffset = baseOffset * offsetMultiplier;
    
    // Calculate perpendicular direction for curve offset
    const perpX = -deltaY / distance;
    const perpY = deltaX / distance;
    
    // Determine curve direction to spread arrows
    const curveDirection = ((Math.abs(sourceX + targetX + sourceY + targetY) % 2) * 2 - 1);
    
    // Enhanced control point calculation for better arrow separation
    const controlPoint1X = sourceX + deltaX * 0.25 + perpX * curvatureOffset * curveDirection;
    const controlPoint1Y = sourceY + deltaY * 0.25 + perpY * curvatureOffset * curveDirection;
    
    const controlPoint2X = targetX - deltaX * 0.25 + perpX * curvatureOffset * curveDirection;
    const controlPoint2Y = targetY - deltaY * 0.25 + perpY * curvatureOffset * curveDirection;
    
    // Add additional offset for similar arrows (same source or target)
    const similarArrowOffset = Math.sin(sourceX * 0.01 + targetX * 0.01) * 30;
    
    // Apply the calculated control points
    const customPath = `M ${sourceX},${sourceY} C ${controlPoint1X + similarArrowOffset},${controlPoint1Y} ${controlPoint2X + similarArrowOffset},${controlPoint2Y} ${targetX},${targetY}`;
    
    // Return custom path with label position
    const labelX = (sourceX + controlPoint1X + controlPoint2X + targetX) / 4;
    const labelY = (sourceY + controlPoint1Y + controlPoint2Y + targetY) / 4;
    
    return [customPath, labelX, labelY];
  };
  
  const [edgePath, labelX, labelY] = calculateAdvancedFlexiblePath();
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
    </>
  );
};

export default FlexibleBezierEdge;







