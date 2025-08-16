import { Handle, Position } from '@xyflow/react'
import { Card, CardContent } from '@/components/ui/card.jsx'

const CourseNode = ({ data }) => {
  const { course, color, isSelected, onClick } = data

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : ''
        }`}
        onClick={onClick}
        style={{ 
          borderColor: color,
          borderWidth: '2px',
          minWidth: '200px'
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-center mb-2">
            <div
              className="w-4 h-4 rounded mr-2 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-semibold text-sm">{course.id}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {course.name}
          </p>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

export default CourseNode

