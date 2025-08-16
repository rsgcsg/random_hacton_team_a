import { useState } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Search, X } from 'lucide-react'

const SearchBar = ({ data, onCourseSelect }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)

  const handleSearch = (term) => {
    setSearchTerm(term)
    
    if (term.trim() === '') {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const results = data.courses.filter(course => 
      course.id.toLowerCase().includes(term.toLowerCase()) ||
      course.name.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 5) // Limit to 5 results

    setSearchResults(results)
    setShowResults(true)
  }

  const handleCourseClick = (course) => {
    onCourseSelect(course)
    setSearchTerm('')
    setSearchResults([])
    setShowResults(false)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setShowResults(false)
  }

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          type="text"
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X size={14} />
          </Button>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1">
          <CardContent className="p-2">
            {searchResults.map(course => (
              <div
                key={course.id}
                className="flex items-center p-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => handleCourseClick(course)}
              >
                <div
                  className="w-3 h-3 rounded mr-2 flex-shrink-0"
                  style={{ backgroundColor: course.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{course.id}</div>
                  <div className="text-xs text-muted-foreground">{course.name}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SearchBar

