<<<<<<< HEAD
// Advanced layout algorithm with arrow-aware positioning and flexible routing
export const calculateCourseLayout = (courses) => {
  try {
    console.log("Advanced Layout Algorithm: Starting calculation with", courses.length, "courses");
    
    // Validate input
    if (!Array.isArray(courses) || courses.length === 0) {
      console.error("Layout Algorithm: Invalid courses input", courses);
      return new Map();
    }

    // Phase 1: Build dependency and similarity maps
    const dependencyMap = new Map();
    const reverseDependencyMap = new Map();
    const similarityGroups = new Map(); // OR groups for similarity clustering
    const arrowPaths = new Map(); // Track arrow paths for intersection avoidance
    
    // Initialize maps
    courses.forEach((course) => {
      if (!course || !course.id) return;
      dependencyMap.set(course.id, new Set());
      reverseDependencyMap.set(course.id, new Set());
    });
    
    console.log("Advanced Layout Algorithm: Initialized dependency maps for", dependencyMap.size, "courses");
    
    // Build dependency relationships and identify similarity groups
    courses.forEach((course) => {
      if (!course || !course.id || !course.Prerequisite || !course.Prerequisite.prerequisites) return;
      
      const targetCourse = course.id;
      
      const extractDependenciesAndSimilarity = (group, depth = 0, groupPath = []) => {
        if (depth > 10) return;
        if (!group || typeof group !== "object") return;
        
        if (group.type === "course") {
          if (group.value && typeof group.value === "string") {
            dependencyMap.get(targetCourse)?.add(group.value);
            reverseDependencyMap.get(group.value)?.add(targetCourse);
          }
        } else if (group.type === "AND") {
          if (Array.isArray(group.items)) {
            group.items.forEach((item, index) => 
              extractDependenciesAndSimilarity(item, depth + 1, [...groupPath, "AND", index])
            );
          }
        } else if (group.type === "OR") {
          // Identify similarity groups from OR relationships
          if (Array.isArray(group.items)) {
            const orCourses = group.items
              .filter(item => item.type === "course" && item.value)
              .map(item => item.value);
            
            if (orCourses.length > 1) {
              const groupKey = `${targetCourse}-OR-${depth}`;
              similarityGroups.set(groupKey, new Set(orCourses));
            }
            
            group.items.forEach((item, index) => 
              extractDependenciesAndSimilarity(item, depth + 1, [...groupPath, "OR", index])
            );
          }
=======
export const calculateCourseLayout = (courses) => {
  // Create a map of course dependencies
  const dependencyMap = new Map()
  const reverseDependencyMap = new Map()

  // Initialize maps
  courses.forEach(course => {
    dependencyMap.set(course.id, new Set())
    reverseDependencyMap.set(course.id, new Set())
  })

  // Build dependency relationships from course prerequisites
  courses.forEach(course => {
    if (!course.Prerequisite || !course.Prerequisite.prerequisites) return

    const targetCourse = course.id

    const extractDependencies = (group) => {
      if (group.type === 'course') {
        dependencyMap.get(targetCourse)?.add(group.value)
        reverseDependencyMap.get(group.value)?.add(targetCourse)
      } else if (group.type === 'AND' || group.type === 'OR') {
        group.items.forEach(item => extractDependencies(item))
      }
    }

    course.Prerequisite.prerequisites.forEach(group => extractDependencies(group))
  })

  // Calculate levels using topological sort
  const levels = new Map()
  const visited = new Set()
  const visiting = new Set()

  const calculateLevel = (courseId) => {
    // Base case
    if (visiting.has(courseId)) {
      return 0
    }

    if (visited.has(courseId)) {
      return levels.get(courseId) || 0
    }

    visiting.add(courseId)

    const dependencies = dependencyMap.get(courseId) || new Set()
    let maxLevel = 0

    dependencies.forEach(depId => {
      if (courses.find(c => c.id === depId)) {
        const depLevel = calculateLevel(depId)
        maxLevel = Math.max(maxLevel, depLevel + 1)
      }
    })

    visiting.delete(courseId)
    visited.add(courseId)
    levels.set(courseId, maxLevel)

    return maxLevel
  }

  // Calculate levels for all courses
  courses.forEach(course => {
    if (!visited.has(course.id)) {
      calculateLevel(course.id)
    }
  })

  // Group courses by level
  const levelGroups = new Map()
  courses.forEach(course => {
    const level = levels.get(course.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level).push(course)
  })

  // Identify OR groups to group courses with similar prerequisites together
  const orGroups = new Map()
  courses.forEach(course => {
    if (course.Prerequisite && course.Prerequisite.prerequisites) {
      course.Prerequisite.prerequisites.forEach((group, groupIndex) => {
        if (group.type === 'OR') {
          // Create a unique key for this OR group based on the course that depends on it
          const groupKey = `${course.id}_${groupIndex}`
          const courseIdsInGroup = group.items
            .filter(item => item.type === 'course')
            .map(item => item.value)

          orGroups.set(groupKey, {
            dependentCourse: course.id,
            courseIds: courseIdsInGroup
          })
>>>>>>> a77141f7d143642e331008e4f10f67e83e0fc0ab
        }
      };
      
      course.Prerequisite.prerequisites.forEach((group, index) => 
        extractDependenciesAndSimilarity(group, 0, [index])
      );
    });
    
    console.log("Advanced Layout Algorithm: Built dependency relationships and", similarityGroups.size, "similarity groups");
    
    // Phase 2: Calculate needness levels (vertical positioning priority)
    const needinessLevels = new Map();
    const visited = new Set();
    const visiting = new Set();
    
    const calculateNeedness = (courseId, depth = 0) => {
      if (depth > 100 || visiting.has(courseId)) return 0;
      if (visited.has(courseId)) return needinessLevels.get(courseId) || 0;
      
      visiting.add(courseId);
      const dependencies = dependencyMap.get(courseId) || new Set();
      let maxLevel = 0;
      
      dependencies.forEach(depId => {
        if (courses.find(c => c.id === depId)) {
          const depLevel = calculateNeedness(depId, depth + 1);
          maxLevel = Math.max(maxLevel, depLevel + 1);
        }
      });
      
      visiting.delete(courseId);
      visited.add(courseId);
      needinessLevels.set(courseId, maxLevel);
      return maxLevel;
    };

<<<<<<< HEAD
    courses.forEach(course => {
      if (course && course.id && !visited.has(course.id)) {
        calculateNeedness(course.id);
=======
  // Position courses with improved OR group handling
  const positions = new Map()
  const levelHeight = 400
  const courseWidth = 300
  const minHorizontalSpacing = 50
  const orGroupSpacing = 20

  Array.from(levelGroups.keys()).sort((a, b) => a - b).forEach(level => {
    const coursesInLevel = levelGroups.get(level)

    // Create positioning clusters for this level
    const clusters = []
    const processedCourses = new Set()

    // First, create clusters for OR/prereq groups
    // - Each course belongs to an OR group which is based on a particular prereq course
    // - All the courses within the group has a prerequisite containing this course
    // - Course can belong to multiple prereq groups, but will only be rendered once by
    //   tracking already added ones in a set.
    orGroups.forEach((orGroupInfo, groupKey) => {
      const orCoursesInLevel = coursesInLevel.filter(course =>
        orGroupInfo.courseIds.includes(course.id) && !processedCourses.has(course.id)
      )

      if (orCoursesInLevel.length > 1) {
        // Sort OR group courses by ID for consistency
        orCoursesInLevel.sort((a, b) => a.id.localeCompare(b.id))
        clusters.push({
          type: 'OR_GROUP',
          courses: orCoursesInLevel,
          spacing: orGroupSpacing
        })
        orCoursesInLevel.forEach(course => processedCourses.add(course.id))
>>>>>>> a77141f7d143642e331008e4f10f67e83e0fc0ab
      }
    });

<<<<<<< HEAD
    console.log("Advanced Layout Algorithm: Calculated needness levels for", needinessLevels.size, "courses");

    // Identify important courses based on out-degree (number of courses they are prerequisite for)
    const outDegrees = new Map();
    courses.forEach(course => {
      outDegrees.set(course.id, 0);
    });

    reverseDependencyMap.forEach((dependents, prereqId) => {
      outDegrees.set(prereqId, dependents.size);
    });

    // Sort courses by out-degree to identify the most important ones
    const sortedByOutDegree = Array.from(outDegrees.entries()).sort((a, b) => b[1] - a[1]);
    // Consider the top 10% (or at least 1) courses as important for centering
    const numImportantCourses = Math.max(1, Math.floor(courses.length * 0.1));
    const importantCourseIds = new Set(sortedByOutDegree.slice(0, numImportantCourses).map(entry => entry[0]));
    console.log("Advanced Layout Algorithm: Identified important courses:", Array.from(importantCourseIds));

    // Phase 3: Create similarity clusters (horizontal positioning priority)
    const similarityClusters = new Map();
    const processedCourses = new Set();
    
    // Group courses by similarity first
    similarityGroups.forEach((courseSet, groupKey) => {
      const availableCourses = Array.from(courseSet).filter(courseId => 
        courses.find(c => c.id === courseId) && !processedCourses.has(courseId)
      );
      
      if (availableCourses.length > 1) {
        const clusterId = `similarity-${similarityClusters.size}`;
        similarityClusters.set(clusterId, availableCourses);
        availableCourses.forEach(courseId => processedCourses.add(courseId));
=======
    // Add remaining courses as individual clusters
    coursesInLevel.forEach(course => {
      if (!processedCourses.has(course.id)) {
        clusters.push({
          type: 'INDIVIDUAL',
          courses: [course],
          spacing: minHorizontalSpacing
        })
>>>>>>> a77141f7d143642e331008e4f10f67e83e0fc0ab
      }
    });
    
    // Add remaining courses as individual clusters
    courses.forEach(course => {
      if (course && course.id && !processedCourses.has(course.id)) {
        const clusterId = `individual-${course.id}`;
        similarityClusters.set(clusterId, [course.id]);
        processedCourses.add(course.id);
      }
    });
    
    console.log("Advanced Layout Algorithm: Created", similarityClusters.size, "similarity clusters");

<<<<<<< HEAD
    // Phase 4: Group by needness levels and arrange clusters
    const levelGroups = new Map();
    courses.forEach(course => {
      if (!course || !course.id) return;
      const level = needinessLevels.get(course.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(course);
    });

    // Phase 5: Advanced positioning with arrow-aware optimization
    const positions = new Map();
    const nodeWidth = 280;
    const nodeHeight = 100;
    const levelHeight = 300;
    const clusterSpacing = 60;
    const nodeSpacing = 40;
    
    // Calculate arrow intersection potential
    const calculateArrowIntersectionScore = (positions, edges) => {
      let intersectionCount = 0;
      const edgeList = Array.from(edges);
      
      for (let i = 0; i < edgeList.length; i++) {
        for (let j = i + 1; j < edgeList.length; j++) {
          const edge1 = edgeList[i];
          const edge2 = edgeList[j];
          
          const pos1Source = positions.get(edge1.source);
          const pos1Target = positions.get(edge1.target);
          const pos2Source = positions.get(edge2.source);
          const pos2Target = positions.get(edge2.target);
          
          if (pos1Source && pos1Target && pos2Source && pos2Target) {
            // Simplified intersection check using bounding rectangles
            const rect1 = {
              left: Math.min(pos1Source.x, pos1Target.x) - 50,
              right: Math.max(pos1Source.x, pos1Target.x) + 50,
              top: Math.min(pos1Source.y, pos1Target.y) - 50,
              bottom: Math.max(pos1Source.y, pos1Target.y) + 50
            };
            
            const rect2 = {
              left: Math.min(pos2Source.x, pos2Target.x) - 50,
              right: Math.max(pos2Source.x, pos2Target.x) + 50,
              top: Math.min(pos2Source.y, pos2Target.y) - 50,
              bottom: Math.max(pos2Source.y, pos2Target.y) + 50};
            
              if (rect1.left < rect2.right && rect1.right > rect2.left &&
                  rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
                intersectionCount++;
              }
            }
          }
        }
        
        return intersectionCount;
      };
      
      // Build edge list for intersection calculation
      const buildEdgeList = () => {
        const edges = [];
        courses.forEach(course => {
          if (!course || !course.id || !course.Prerequisite || !course.Prerequisite.prerequisites) return;
          
          const extractEdges = (group) => {
            if (group.type === "course" && group.value) {
              edges.push({ source: group.value, target: course.id });
            } else if ((group.type === "AND" || group.type === "OR") && Array.isArray(group.items)) {
              group.items.forEach(item => extractEdges(item));
            }
          };
          
          course.Prerequisite.prerequisites.forEach(group => extractEdges(group));
        });
        
        return edges;
      };
      
      const allEdges = buildEdgeList();
      
      // Position courses level by level with arrow-aware optimization
      Array.from(levelGroups.keys()).sort((a, b) => a - b).forEach(level => {
        const coursesInLevel = levelGroups.get(level) || [];
        if (coursesInLevel.length === 0) return;
  
        // Group courses in this level by similarity clusters
        const levelClusters = new Map();
        coursesInLevel.forEach(course => {
          let foundCluster = false;
          similarityClusters.forEach((clusterCourses, clusterId) => {
            if (clusterCourses.includes(course.id)) {
              if (!levelClusters.has(clusterId)) {
                levelClusters.set(clusterId, []);
              }
              levelClusters.get(clusterId).push(course);
              foundCluster = true;
            }
          });
          
          if (!foundCluster) {
            const individualClusterId = `level-${level}-individual-${course.id}`;
            levelClusters.set(individualClusterId, [course]);
=======
    // Sort clusters for consistent positioning
    clusters.sort((a, b) => {
      const aFirstId = a.courses[0].id
      const bFirstId = b.courses[0].id
      return aFirstId.localeCompare(bFirstId)
    })

    // Calculate total width needed
    let totalWidth = 0
    clusters.forEach((cluster, index) => {
      const clusterWidth = cluster.courses.length * courseWidth +
        (cluster.courses.length - 1) * cluster.spacing
      totalWidth += clusterWidth
      if (index < clusters.length - 1) {
        totalWidth += minHorizontalSpacing * 2 // Space between clusters
      }
    })

    // Position clusters from center
    let currentX = -totalWidth / 2

    clusters.forEach((cluster, clusterIndex) => {
      let clusterStartX = currentX

      cluster.courses.forEach((course, courseIndex) => {
        const x = clusterStartX + courseIndex * (courseWidth + cluster.spacing)

        // Add slight vertical offset to break strict rows
        const verticalOffset = (courseIndex % 2 === 0 ? 1 : -1) * 40

        positions.set(course.id, {
          x: x + courseWidth / 2, // Center the course on its position
          y: level * levelHeight + verticalOffset
        })
      })

      // Move to next cluster position
      const clusterWidth = cluster.courses.length * courseWidth +
        (cluster.courses.length - 1) * cluster.spacing
      currentX += clusterWidth + (clusterIndex < clusters.length - 1 ? minHorizontalSpacing * 2 : 0)
    })
  })

  return positions
}

export const findPrerequisitePaths = (targetCourseId, courses) => {
  const paths = new Set()
  const courseIds = new Set(courses.map(c => c.id))

  const findPathsTo = (courseId, currentPath = []) => {
    if (currentPath.includes(courseId)) {
      return
    }

    const course = courses.find(c => c.id === courseId)
    if (!course || !course.Prerequisite || !course.Prerequisite.prerequisites) {
      return
    }

    const processGroup = (group) => {
      if (group.type === 'course') {
        if (courseIds.has(group.value)) {
          paths.add(`${group.value}-${courseId}`)
          findPathsTo(group.value, [...currentPath, courseId])
        }
      } else if (group.type === 'AND' || group.type === 'OR') {
        group.items.forEach(item => processGroup(item))
      }
    }

    course.Prerequisite.prerequisites.forEach(group => processGroup(group))
  }

  const findPathsFrom = (courseId) => {
    courses.forEach(course => {
      if (!courseIds.has(course.id) || !course.Prerequisite || !course.Prerequisite.prerequisites) return

      const processGroup = (group) => {
        if (group.type === 'course') {
          if (group.value === courseId) {
            paths.add(`${courseId}-${course.id}`)
>>>>>>> a77141f7d143642e331008e4f10f67e83e0fc0ab
          }
        });
  
        // Calculate total width needed for this level
        let totalWidth = 0;
        levelClusters.forEach(clusterCourses => {
          totalWidth += clusterCourses.length * nodeWidth + (clusterCourses.length - 1) * nodeSpacing;
        });
        totalWidth += (levelClusters.size - 1) * clusterSpacing;
  
        // Position clusters from left to right
        let currentX = -totalWidth / 2;
        
        Array.from(levelClusters.entries()).forEach(([clusterId, clusterCourses], clusterIndex) => {
          // Sort courses within cluster for consistent positioning
          clusterCourses.sort((a, b) => a.id.localeCompare(b.id));
          
          // Check if this cluster contains an important course
          const containsImportantCourse = clusterCourses.some(course => importantCourseIds.has(course.id));
  
          // If it contains an important course, try to center this cluster more
          let clusterOffsetX = 0;
          if (containsImportantCourse) {
            // Calculate the center of the current level's available space
            const levelCenter = 0; // Assuming the overall layout is centered around X=0
            const clusterCenter = currentX + (clusterCourses.length * nodeWidth + (clusterCourses.length - 1) * nodeSpacing) / 2;
            clusterOffsetX = levelCenter - clusterCenter; // Shift to center
            // Limit the shift to avoid breaking other layout principles too much
            clusterOffsetX = Math.max(-totalWidth / 4, Math.min(totalWidth / 4, clusterOffsetX));
          }
  
          // Position courses within this cluster
          clusterCourses.forEach((course, courseIndex) => {
            // Add organic variation to avoid grid-like appearance
            const organicOffsetX = Math.sin(clusterIndex * 0.7 + courseIndex * 0.5) * 40;
            const organicOffsetY = Math.cos(clusterIndex * 0.3 + courseIndex * 0.8) * 60;
            
            const baseX = currentX + courseIndex * (nodeWidth + nodeSpacing) + nodeWidth / 2;
            const baseY = level * levelHeight;
            
            positions.set(course.id, {
              x: baseX + organicOffsetX + clusterOffsetX,
              y: baseY + organicOffsetY
            });
          });
          
          // Move to next cluster position
          currentX += clusterCourses.length * nodeWidth + (clusterCourses.length - 1) * nodeSpacing + clusterSpacing;
        });
      });
  
      // Phase 6: Arrow-aware fine-tuning optimization
      console.log("Advanced Layout Algorithm: Starting arrow-aware optimization");
      
      const optimizationIterations = 200;
      let bestPositions = new Map(positions);
      let bestIntersectionScore = calculateArrowIntersectionScore(positions, allEdges);
      
      for (let iteration = 0; iteration < optimizationIterations; iteration++) {
        const testPositions = new Map(positions);
        
        // Apply small random adjustments to reduce arrow intersections
        courses.forEach(course => {
          if (!course || !course.id) return;
          
          const currentPos = testPositions.get(course.id);
          if (!currentPos) return;
          
          // Small random adjustments
          const deltaX = (Math.random() - 0.5) * 0;
          const deltaY = (Math.random() - 0.5) * 0;
          
          testPositions.set(course.id, {
            x: currentPos.x + deltaX,
            y: currentPos.y + deltaY
          });
        });
        
        // Check if this configuration reduces arrow intersections
        const testScore = calculateArrowIntersectionScore(testPositions, allEdges);
        
        if (testScore < bestIntersectionScore) {
          bestPositions = new Map(testPositions);
          bestIntersectionScore = testScore;
          console.log(`Advanced Layout Algorithm: Improved intersection score to ${testScore} at iteration ${iteration}`);
        }
        
        // Apply the best configuration found so far
        if (iteration % 50 === 0) {
          positions.clear();
          bestPositions.forEach((pos, courseId) => positions.set(courseId, pos));
        }
      }
<<<<<<< HEAD
      
      // Apply final best positions
      positions.clear();
      bestPositions.forEach((pos, courseId) => positions.set(courseId, pos));
  
      // Phase 7: Final collision avoidance for nodes
      console.log("Advanced Layout Algorithm: Final collision avoidance");
      
      const collisionAvoidanceIterations = 100;
      const minNodeDistance = nodeWidth + 50;
      
      for (let iteration = 0; iteration < collisionAvoidanceIterations; iteration++) {
        let hasCollision = false;
        
        courses.forEach(course1 => {
          if (!course1 || !course1.id) return;
          
          courses.forEach(course2 => {
            if (!course2 || !course2.id || course1.id === course2.id) return;
            
            const pos1 = positions.get(course1.id);
            const pos2 = positions.get(course2.id);
            
            if (!pos1 || !pos2) return;
            
            const distance = Math.sqrt(
              Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
            );
            
            if (distance < minNodeDistance) {
              hasCollision = true;
              
              // Push nodes apart
              const angle = Math.atan2(pos1.y - pos2.y, pos1.x - pos2.x);
              const pushDistance = (minNodeDistance - distance) / 2;
              
              positions.set(course1.id, {
                x: pos1.x + Math.cos(angle) * pushDistance,
                y: pos1.y + Math.sin(angle) * pushDistance
              });
              
              positions.set(course2.id, {
                x: pos2.x - Math.cos(angle) * pushDistance,
                y: pos2.y - Math.sin(angle) * pushDistance
              });
            }
          });
        });
        
        if (!hasCollision) break;}

        console.log("Advanced Layout Algorithm: Completed successfully with", positions.size, "positioned courses");
        console.log("Advanced Layout Algorithm: Final arrow intersection score:", calculateArrowIntersectionScore(positions, allEdges));
        
        return positions;
    
      } catch (error) {
        console.error("Advanced Layout Algorithm: Critical error:", error);
        
        // Return fallback positions
        const fallbackPositions = new Map();
        if (Array.isArray(courses)) {
          courses.forEach((course, index) => {
            if (course && course.id) {
              fallbackPositions.set(course.id, {
                x: (index % 6) * 300,
                y: Math.floor(index / 6) * 250
              });
            }
          });
        }
        
        return fallbackPositions;
      }
    };
    
    // Enhanced flexible arrow path calculation with intersection avoidance
    export const calculateFlexibleArrowPath = (sourcePos, targetPos, allPositions, existingArrows = []) => {
      try {
        if (!sourcePos || !targetPos || typeof sourcePos.x !== "number" || typeof sourcePos.y !== "number" ||
            typeof targetPos.x !== "number" || typeof targetPos.y !== "number") {
          return [];
        }
    
        const deltaX = targetPos.x - sourcePos.x;
        const deltaY = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (!isFinite(distance) || distance === 0) return [];
    
        // Calculate flexible control points for Bezier curves
        const controlPointDistance = Math.min(distance * 0.4, 200);
        
        // Add variation based on arrow density in the area
        const nearbyArrows = existingArrows.filter(arrow => {
          const arrowMidX = (arrow.sourcePos.x + arrow.targetPos.x) / 2;
          const arrowMidY = (arrow.sourcePos.y + arrow.targetPos.y) / 2;
          const currentMidX = (sourcePos.x + targetPos.x) / 2;
          const currentMidY = (sourcePos.y + targetPos.y) / 2;
          
          const midDistance = Math.sqrt(
            Math.pow(arrowMidX - currentMidX, 2) + Math.pow(arrowMidY - currentMidY, 2)
          );
          
          return midDistance < 300; // Consider arrows within 300px as nearby
        });
        
        // Adjust curvature based on nearby arrow density
        const densityFactor = Math.min(nearbyArrows.length * 0.3, 2);
        const curvatureOffset = 50 + densityFactor * 30;
        
        // Calculate control points with intelligent routing
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        
        // Perpendicular offset for curve
        const perpX = -deltaY / distance;
        const perpY = deltaX / distance;
        
        // Alternate curve direction based on arrow index to spread them out
        const curveDirection = (Math.abs(sourcePos.x + targetPos.x + sourcePos.y + targetPos.y) % 2) * 2 - 1;
        
        const controlPoint1 = {
          x: sourcePos.x + deltaX * 0.3 + perpX * curvatureOffset * curveDirection,
          y: sourcePos.y + deltaY * 0.3 + perpY * curvatureOffset * curveDirection
        };
        
        const controlPoint2 = {
          x: targetPos.x - deltaX * 0.3 + perpX * curvatureOffset * curveDirection,
          y: targetPos.y - deltaY * 0.3 + perpY * curvatureOffset * curveDirection
        };
        
        // Check for node collisions and adjust if necessary
        if (allPositions) {
          Array.from(allPositions.values()).forEach(nodePos => {
            [controlPoint1, controlPoint2].forEach(cp => {
              const distToNode = Math.sqrt(
                Math.pow(cp.x - nodePos.x, 2) + Math.pow(cp.y - nodePos.y, 2)
              );
              
              if (distToNode < 150) { // Too close to a node
                const avoidanceAngle = Math.atan2(cp.y - nodePos.y, cp.x - nodePos.x);
                cp.x = nodePos.x + Math.cos(avoidanceAngle) * 150;
                cp.y = nodePos.y + Math.sin(avoidanceAngle) * 150;
              }
            });
          });
        }
        
        return [
          { x: sourcePos.x, y: sourcePos.y },
          controlPoint1,
          controlPoint2,
          { x: targetPos.x, y: targetPos.y }
        ];
    
      } catch (error) {
        console.error("calculateFlexibleArrowPath: Error calculating path:", error);
        return [];
      }
    };
    
    // Find prerequisite paths for highlighting
    export const findPrerequisitePaths = (targetCourseId, courses) => {
      try {
        const paths = new Set();
        const visited = new Set();
        
        const findPaths = (courseId, depth = 0) => {
          if (depth > 20 || visited.has(courseId)) return;
          visited.add(courseId);
          
          const course = courses.find(c => c.id === courseId);
          if (!course || !course.Prerequisite || !course.Prerequisite.prerequisites) return;
          
          const extractPaths = (group) => {
            if (group.type === "course" && group.value) {
              paths.add(`${group.value}-${courseId}`);
              findPaths(group.value, depth + 1);
            } else if ((group.type === "AND" || group.type === "OR") && Array.isArray(group.items)) {
              group.items.forEach(item => extractPaths(item));
            }
          };
          
          course.Prerequisite.prerequisites.forEach(group => extractPaths(group));
        };
        
        findPaths(targetCourseId);
        return Array.from(paths);
        
      } catch (error) {
        console.error("findPrerequisitePaths: Error finding paths:", error);
        return [];
      }
    };
    
    
    
    
    













=======

      course.Prerequisite.prerequisites.forEach(group => processGroup(group))
    })
  }

  findPathsTo(targetCourseId)
  findPathsFrom(targetCourseId)

  return Array.from(paths)
}
>>>>>>> a77141f7d143642e331008e4f10f67e83e0fc0ab
