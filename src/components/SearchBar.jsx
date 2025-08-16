import { useState } from "react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Search, X } from "lucide-react";

const SearchBar = ({ data, onCourseSelect, setData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (term) => {
    // Fetch data from the API
    const fetchDegreeData = async () => {
      try {
        const response = await fetch(`https://api.example.com/data/${term}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const degreeData = await response.json();

        // Go through each degree within data, and add the current data to it
        setData((prev) => ({
          ...prev,
          degrees: prev.degrees.map((degree) =>
            degree.id === updatedDegree.id ? degreeData : degree
          ),
        }));

        console.log("Fetched data:", degreeData);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    const fetchMajorData = async () => {
      try {
        const response = await fetch(`https://api.example.com/data/${term}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const majorData = await response.json();

        // Go through each degree within data, and add the current data to it
        setData((prev) => ({
          ...prev,
          majors: prev.majors.map((major) =>
            major.id === updatedDegree.id ? majorData : major
          ),
        }));

        console.log("Fetched data:", majorData);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    const fetchCourseData = async () => {
      try {
        const response = await fetch(`https://api.example.com/data/${term}`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const courseData = await response.json();

        // Go through each degree within data, and add the current data to it
        setData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.id === updatedDegree.id ? courseData : course
          ),
        }));

        console.log("Fetched data:", courseData);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    // fetchDegreeData();
    // fetchMajorData();
    // fetchCourseData();

    setSearchTerm(term);

    if (term.trim() === "") {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const results = data.courses
      .filter(
        (course) =>
          course.id.toLowerCase().includes(term.toLowerCase()) ||
          course.name.toLowerCase().includes(term.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 results

    setSearchResults(results);
    setShowResults(true);
  };

  const handleCourseClick = (course) => {
    onCourseSelect(course);
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          size={16}
        />
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
            {searchResults.map((course) => (
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
                  <div className="text-xs text-muted-foreground">
                    {course.name}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;
