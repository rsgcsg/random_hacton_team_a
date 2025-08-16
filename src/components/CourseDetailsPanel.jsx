import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { X } from 'lucide-react'

const CourseDetailsPanel = ({ course, data, onClose }) => {
  // Get degree and major names based on the new structure
  const degrees = data.degrees.filter(degree => 
    degree.course_array && degree.course_array.includes(course.id)
  ).map(degree => degree.name)
  
  const majors = data.majors.filter(major => 
    major.course_array && major.course_array.includes(course.id)
  ).map(major => major.name)

  // Get prerequisites from the course itself
  const prerequisites = course.Prerequisite

  const renderPrerequisiteGroup = (group, depth = 0) => {
    if (group.type === 'course') {
      const prereqCourse = data.courses.find(c => c.id === group.value)
      return (
        <span 
          key={group.value}
          className="inline-block bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs mr-1 mb-1"
        >
          {prereqCourse?.name || group.value}
        </span>
      )
    }

    const connector = group.type === 'AND' ? ' AND ' : ' OR '
    const bgColor = group.type === 'AND' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'
    
    return (
      <div key={`group-${depth}`} className={`${bgColor} p-2 rounded mb-2`}>
        <div className="text-xs font-semibold mb-1">{group.type}:</div>
        <div className="flex flex-wrap gap-1">
          {group.items.map((item, index) => (
            <div key={index}>
              {renderPrerequisiteGroup(item, depth + 1)}
              {index < group.items.length - 1 && (
                <span className="text-xs text-muted-foreground mx-1">{connector}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Course Details</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: course.color }}
            />
            {course.id}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Course Name</h4>
            <p className="text-sm text-muted-foreground">{course.name}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">{course.description}</p>
          </div>

          {degrees.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Degrees</h4>
              <div className="flex flex-wrap gap-1">
                {degrees.map((degree, index) => (
                  <span 
                    key={index}
                    className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs"
                  >
                    {degree}
                  </span>
                ))}
              </div>
            </div>
          )}

          {majors.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Majors</h4>
              <div className="flex flex-wrap gap-1">
                {majors.map((major, index) => (
                  <span 
                    key={index}
                    className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
                  >
                    {major}
                  </span>
                ))}
              </div>
            </div>
          )}

          {prerequisites && prerequisites.prerequisites && prerequisites.prerequisites.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Prerequisites</h4>
              <div className="space-y-2">
                {prerequisites.prerequisites.map((group, index) => (
                  <div key={index}>
                    {renderPrerequisiteGroup(group)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CourseDetailsPanel

