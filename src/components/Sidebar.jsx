import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import SearchBar from './SearchBar'

const Sidebar = ({
  data,
  selectedDegrees,
  setSelectedDegrees,
  selectedMajors,
  setSelectedMajors,
  selectedCourses,
  setSelectedCourses,
  showArrows,
  setShowArrows,
  onCourseSelect
}) => {
  const [expandedSections, setExpandedSections] = useState({
    degrees: true,
    majors: true,
    courses: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleDegreeChange = (degreeId, checked) => {
    if (checked) {
      setSelectedDegrees([...selectedDegrees, degreeId])
    } else {
      setSelectedDegrees(selectedDegrees.filter(id => id !== degreeId))
    }
  }

  const handleMajorChange = (majorId, checked) => {
    if (checked) {
      setSelectedMajors([...selectedMajors, majorId])
    } else {
      setSelectedMajors(selectedMajors.filter(id => id !== majorId))
    }
  }

  const handleCourseChange = (courseId, checked) => {
    if (checked) {
      setSelectedCourses([...selectedCourses, courseId])
    } else {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId))
    }
  }

  return (
    <div className="w-80 bg-card border-r border-border p-4 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Course Mind Map</h1>
      
      {/* Search Bar */}
      <SearchBar data={data} onCourseSelect={onCourseSelect} />
      
      {/* Show Arrows Toggle */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <label htmlFor="show-arrows" className="text-sm font-medium">
              Show Prerequisites
            </label>
            <Switch
              id="show-arrows"
              checked={showArrows}
              onCheckedChange={setShowArrows}
            />
          </div>
        </CardContent>
      </Card>

      {/* Degrees Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('degrees')}>
            <span>Degrees</span>
            {expandedSections.degrees ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </CardTitle>
        </CardHeader>
        {expandedSections.degrees && (
          <CardContent className="pt-0">
            {data.degrees.map(degree => (
              <div key={degree.id} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`degree-${degree.id}`}
                  checked={selectedDegrees.includes(degree.id)}
                  onCheckedChange={(checked) => handleDegreeChange(degree.id, checked)}
                />
                <label
                  htmlFor={`degree-${degree.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                >
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: degree.color }}
                  />
                  {degree.name}
                </label>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Majors Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('majors')}>
            <span>Majors</span>
            {expandedSections.majors ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </CardTitle>
        </CardHeader>
        {expandedSections.majors && (
          <CardContent className="pt-0">
            {data.majors.map(major => (
              <div key={major.id} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`major-${major.id}`}
                  checked={selectedMajors.includes(major.id)}
                  onCheckedChange={(checked) => handleMajorChange(major.id, checked)}
                />
                <label
                  htmlFor={`major-${major.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                >
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: major.color }}
                  />
                  {major.name}
                </label>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Courses Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('courses')}>
            <span>Courses</span>
            {expandedSections.courses ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </CardTitle>
        </CardHeader>
        {expandedSections.courses && (
          <CardContent className="pt-0">
            {data.courses.map(course => (
              <div key={course.id} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`course-${course.id}`}
                  checked={selectedCourses.includes(course.id)}
                  onCheckedChange={(checked) => handleCourseChange(course.id, checked)}
                />
                <label
                  htmlFor={`course-${course.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                >
                  <div
                    className="w-4 h-4 rounded mr-2"
                    style={{ backgroundColor: course.color }}
                  />
                  {course.name}
                </label>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default Sidebar

