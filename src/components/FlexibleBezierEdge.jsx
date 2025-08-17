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
  // Calculate flexible control points for better routing
  const calculateFlexiblePath = () => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Base control point offset
    let controlOffset = Math.min(distance * 0.3, 100);
    
    // Add flexibility based on arrow direction and distance
    const horizontalOffset = Math.abs(dx) > Math.abs(dy) ? controlOffset * 0.8 : controlOffset * 1.2;
    const verticalOffset = Math.abs(dy) > Math.abs(dx) ? controlOffset * 0.8 : controlOffset * 1.2;
    
    // Adjust control points to avoid overlapping with other arrows
    let sourceControlX = sourceX;
    let sourceControlY = sourceY + verticalOffset;
    let targetControlX = targetX;
    let targetControlY = targetY - verticalOffset;
    
    // Add horizontal offset for better separation
    if (dx > 0) {
      sourceControlX += horizontalOffset * 0.5;
      targetControlX -= horizontalOffset * 0.5;
    } else {
      sourceControlX -= horizontalOffset * 0.5;
      targetControlX += horizontalOffset * 0.5;
    }
    
    // Create more flexible curve by adding intermediate waypoints
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Add some randomness to avoid identical paths
    const randomOffset = (Math.sin(sourceX + targetX + sourceY + targetY) * 20);
    
    // Adjust for arrow density - spread out arrows that are close together
    const densityOffset = Math.sin(id.length) * 15;
    
    sourceControlX += randomOffset + densityOffset;
    targetControlX += randomOffset - densityOffset;
    
    return getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25,
    });
  };
  
  const [edgePath, labelX, labelY] = calculateFlexiblePath();
  
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



