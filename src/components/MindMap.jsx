import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import CourseNode from "./CourseNode";
import Legend from "./Legend";
import {
  calculateCourseLayout,
  findPrerequisitePaths,
} from "../utils/layoutAlgorithm";

const nodeTypes = {
  course: CourseNode,
};

const MindMap = ({
  data,
  selectedDegrees,
  selectedMajors,
  selectedCourses,
  selectedCourse,
  setSelectedCourse,
  showArrows,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setCenter } = useReactFlow();

  useEffect(() => {
    if (selectedCourse) {
      const node = nodes.find((n) => n.id === selectedCourse.id);
      if (node) {
        // Zoom and center on the node
        setCenter(node.position.x + 100, node.position.y, {
          zoom: 0.6, // adjust zoom level as needed
          duration: 800, // smooth animation (ms)
        });
      }
    }
  }, [selectedCourse, nodes, setCenter]);

  // Filter courses based on selections
  const filteredCourses = useMemo(() => {
    let coursesToDisplay = new Set();

    // Add courses from selected degrees
    selectedDegrees.forEach((degreeId) => {
      const degree = data.degrees.find((d) => d.id === degreeId);
      if (degree && degree.course_array) {
        degree.course_array.forEach((courseId) =>
          coursesToDisplay.add(courseId)
        );
      }
    });

    // Add courses from selected majors
    selectedMajors.forEach((majorId) => {
      const major = data.majors.find((m) => m.id === majorId);
      if (major && major.course_array) {
        major.course_array.forEach((courseId) =>
          coursesToDisplay.add(courseId)
        );
      }
    });

    // Add explicitly selected courses
    selectedCourses.forEach((courseId) => coursesToDisplay.add(courseId));

    // If no degrees, majors, or specific courses are selected, show all courses
    if (coursesToDisplay.size === 0) {
      return data.courses;
    }

    return data.courses.filter((course) => coursesToDisplay.has(course.id));
  }, [
    data.courses,
    data.majors,
    data.degrees,
    selectedDegrees,
    selectedMajors,
    selectedCourses,
  ]);

  // Get course color based on selections
  const getCourseColor = useCallback(
    (course) => {
      // Priority: course > major > degree
      if (selectedCourses.includes(course.id)) {
        const color = course.color || "gray";
        return [color];
      }

      const selectedMajorColors = selectedMajors
        .map((majorId) => data.majors.find((m) => m.id === majorId))
        .filter(
          (major) =>
            major &&
            major.course_array &&
            major.course_array.includes(course.id)
        )
        .map((major) => major.color)
        .filter(Boolean);

      if (selectedMajorColors.length > 0) {
        return selectedMajorColors; // return all colors, not just the first
      }

      // Check if course belongs to any selected degree
      const selectedDegreeColors = selectedDegrees
        .map((degreeId) => data.degrees.find((d) => d.id === degreeId))
        .filter(
          (degree) =>
            degree &&
            degree.course_array &&
            degree.course_array.includes(course.id)
        )
        .map((degree) => degree.color)
        .filter(Boolean);

      if (selectedDegreeColors.length > 0) {
        return selectedDegreeColors;
      }
      const color = course.color || "gray";
      return [color];
    },
    [
      selectedCourses,
      selectedMajors,
      selectedDegrees,
      data.majors,
      data.degrees,
    ]
  );

  // Create nodes from filtered courses
  useEffect(() => {
    const positions = calculateCourseLayout(filteredCourses);

    const courseNodes = filteredCourses.map((course) => {
      const position = positions.get(course.id) || { x: 0, y: 0 };

      return {
        id: course.id,
        type: "course",
        position,
        data: {
          course,
          color: getCourseColor(course),
          isSelected: selectedCourse?.id === course.id,
          onClick: () => setSelectedCourse(course),
        },
      };
    });

    setNodes(courseNodes);
  }, [
    filteredCourses,
    getCourseColor,
    // selectedCourse,
    // setSelectedCourse,
    setNodes,
  ]);

  // Create edges from prerequisites
  useEffect(() => {
    if (!showArrows) {
      setEdges([]);
      return;
    }

    const courseIds = new Set(filteredCourses.map((c) => c.id));
    const prerequisiteEdges = [];

    // Get all prerequisite paths if a course is selected
    const relevantConnections = selectedCourse
      ? new Set(findPrerequisitePaths(selectedCourse.id, filteredCourses))
      : null;

    filteredCourses.forEach((course) => {
      if (!course.Prerequisite || !course.Prerequisite.prerequisites) return;

      const processPrerequisiteGroup = (
        group,
        targetCourseId,
        groupIndex = 0
      ) => {
        if (group.type === "AND") {
          group.items.forEach((item, itemIndex) => {
            if (item.type === "course" && courseIds.has(item.value)) {
              const edgeId = `${item.value}-${targetCourseId}-${groupIndex}-${itemIndex}`;
              const connectionKey = `${item.value}-${targetCourseId}`;

              // If a course is selected, only show relevant connections
              if (selectedCourse && !relevantConnections.has(connectionKey)) {
                return;
              }

              const isHighlighted =
                selectedCourse && relevantConnections.has(connectionKey);

              prerequisiteEdges.push({
                id: edgeId,
                source: item.value,
                target: targetCourseId,
                style: {
                  stroke: isHighlighted ? "#FF6B35" : "#000000",
                  strokeWidth: isHighlighted ? 4 : 2,
                },
                animated: isHighlighted,
                markerEnd: {
                  type: "arrowclosed",
                  width: 20,
                  height: 20,
                  color: isHighlighted ? "#FF6B35" : "#000000",
                },
              });
            } else if (item.type === "AND" || item.type === "OR") {
              processPrerequisiteGroup(
                item,
                targetCourseId,
                groupIndex * 100 + itemIndex
              );
            }
          });
        } else if (group.type === "OR") {
          const colors = [
            // "#FF6B6B",
            "#4ECDC4",
            // "#45B7D1",
            // "#96CEB4",
            // "#FFEAA7",
          ];
          // const orColor = colors[groupIndex % colors.length];
          const orColor = "#4ECDC4";

          group.items.forEach((item, itemIndex) => {
            if (item.type === "course" && courseIds.has(item.value)) {
              const edgeId = `${item.value}-${targetCourseId}-${groupIndex}-${itemIndex}`;
              const connectionKey = `${item.value}-${targetCourseId}`;

              // If a course is selected, only show relevant connections
              if (selectedCourse && !relevantConnections.has(connectionKey)) {
                return;
              }

              const isHighlighted =
                selectedCourse && relevantConnections.has(connectionKey);

              prerequisiteEdges.push({
                id: edgeId,
                source: item.value,
                target: targetCourseId,
                style: {
                  stroke: isHighlighted ? "#FF6B35" : orColor,
                  strokeWidth: isHighlighted ? 4 : 2,
                },
                animated: isHighlighted,
                markerEnd: {
                  type: "arrowclosed",
                  width: 20,
                  height: 20,
                  color: isHighlighted ? "#FF6B35" : orColor,
                },
              });
            } else if (item.type === "AND" || item.type === "OR") {
              processPrerequisiteGroup(
                item,
                targetCourseId,
                groupIndex * 100 + itemIndex
              );
            }
          });
        }
      };

      course.Prerequisite.prerequisites.forEach((group, groupIndex) => {
        processPrerequisiteGroup(group, course.id, groupIndex);
      });
    });

    setEdges(prerequisiteEdges);
  }, [filteredCourses, showArrows, selectedCourse, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div
      className="flex-1 h-full relative"
      onClick={(e) => {
        if (
          !e.target.closest(".react-flow__node") &&
          !e.target.closest(".react-flow__edge")
        ) {
          setSelectedCourse(null);
        }
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 500, y: 100, zoom: 0.3 }}
        minZoom={0.1}
        className="bg-background"
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      <Legend />
    </div>
  );
};

export default MindMap;
