import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.jsx";
import Sidebar from "./components/Sidebar";
import MindMap from "./components/MindMap";
import CourseDetailsPanel from "./components/CourseDetailsPanel";
import sampleData from "./assets/sample_data.json";
import newSampleData from "./assets/other_sample_data.json";
import coursesData from "./data/prereq_structured.json";
import "./App.css";
import convertCourses from "./utils/jsonConvert";

function App() {
  const [data, setData] = useState(null);
  const [visibleData, setVisibleData] = useState(null);
  const [selectedDegrees, setSelectedDegrees] = useState([]);
  const [selectedMajors, setSelectedMajors] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showArrows, setShowArrows] = useState(true);

  useEffect(() => {
    setData(sampleData);

    // Sort the data
    const newCourses = convertCourses(newSampleData);
    // const newCourses = convertCourses(coursesData);

    // console.log("Original courses:", newSampleData);
    // console.log("New courses data:", coursesData.length);

    const newData = sampleData;
    newData.courses = newCourses;

    console.log(newData);
    setData(newData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        data={data}
        selectedDegrees={selectedDegrees}
        setSelectedDegrees={setSelectedDegrees}
        selectedMajors={selectedMajors}
        setSelectedMajors={setSelectedMajors}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        showArrows={showArrows}
        setShowArrows={setShowArrows}
        onCourseSelect={setSelectedCourse}
        setData={setData}
      />
      <div className="flex-1 flex">
        <MindMap
          data={data}
          selectedDegrees={selectedDegrees}
          selectedMajors={selectedMajors}
          selectedCourses={selectedCourses}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
          showArrows={showArrows}
        />
        {selectedCourse && (
          <CourseDetailsPanel
            course={selectedCourse}
            data={data}
            onClose={() => setSelectedCourse(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
