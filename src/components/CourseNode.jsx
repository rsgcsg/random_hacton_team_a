import { Handle, Position } from '@xyflow/react'
import { Card, CardContent } from '@/components/ui/card.jsx'

const CourseNode = ({ data }) => {
  const { course, color = ['gray'], isSelected, onClick } = data;

  
  const colorCount = color.length;
  const step = 360 / colorCount; 
  const stops = color
    .map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`)
    .join(', ');

  const borderImageStyle = {
    borderWidth: '4px',
    borderStyle: 'solid',
    borderImage: `conic-gradient(${stops}) 1`,
    minWidth: '200px',
    padding: '10px'
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : ''
        }`}
        onClick={onClick}
        style={borderImageStyle}
      >
<CardContent className="p-3">
  <div className="flex items-center mb-2">
    {/* Color squares */}
    <div className="flex mr-2 space-x-1">
      {color.map((c, idx) => (
        <div
          key={idx}
          className="w-3 h-3 rounded"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>

    {/* Course ID */}
    <h3 className="font-semibold text-sm">{course.id}</h3>
  </div>

  <p className="text-xs text-muted-foreground leading-tight">
    {course.name}
  </p>
</CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

export default CourseNode;

