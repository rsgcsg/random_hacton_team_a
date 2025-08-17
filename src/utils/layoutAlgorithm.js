// Enhanced layout algorithm to position courses based on prerequisites with arrow-aware optimization
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
    if (visiting.has(courseId)) {
      // Circular dependency detected, assign level 0
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

  // Group courses by level and identify OR groups for horizontal clustering
  const levelGroups = new Map()
  const orGroups = new Map() // Map to store courses belonging to the same OR group

  courses.forEach(course => {
    const level = levels.get(course.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level).push(course)

    // Identify OR groups
    if (course.Prerequisite && course.Prerequisite.prerequisites) {
      course.Prerequisite.prerequisites.forEach(group => {
        if (group.type === 'OR') {
          const groupKey = JSON.stringify(group.items.map(item => item.value).sort())
          if (!orGroups.has(groupKey)) {
            orGroups.set(groupKey, new Set())
          }
          group.items.forEach(item => {
            if (item.type === 'course') {
              orGroups.get(groupKey).add(item.value)
            }
          })
        }
      })
    }
  })

  // Arrow intersection detection utilities
  const calculateArrowPath = (sourcePos, targetPos) => {
    // Calculate bezier control points for curved arrows
    const deltaX = targetPos.x - sourcePos.x
    const deltaY = targetPos.y - sourcePos.y
    
    // Control points for bezier curve
    const controlPoint1 = {
      x: sourcePos.x + deltaX * 0.25,
      y: sourcePos.y + Math.abs(deltaX) * 0.3
    }
    
    const controlPoint2 = {
      x: targetPos.x - deltaX * 0.25,
      y: targetPos.y - Math.abs(deltaX) * 0.3
    }
    
    return {
      start: sourcePos,
      end: targetPos,
      control1: controlPoint1,
      control2: controlPoint2,
      boundingBox: {
        minX: Math.min(sourcePos.x, targetPos.x, controlPoint1.x, controlPoint2.x),
        maxX: Math.max(sourcePos.x, targetPos.x, controlPoint1.x, controlPoint2.x),
        minY: Math.min(sourcePos.y, targetPos.y, controlPoint1.y, controlPoint2.y),
        maxY: Math.max(sourcePos.y, targetPos.y, controlPoint1.y, controlPoint2.y)
      }
    }
  }

  const arrowsIntersect = (arrow1, arrow2) => {
    // Simple bounding box intersection check
    const box1 = arrow1.boundingBox
    const box2 = arrow2.boundingBox
    
    return !(box1.maxX < box2.minX || box2.maxX < box1.minX || 
             box1.maxY < box2.minY || box2.maxY < box1.minY)
  }

  const calculateArrowIntersections = (positions) => {
    const arrows = []
    let intersectionCount = 0
    
    // Generate all arrows based on current positions
    courses.forEach(course => {
      if (!course.Prerequisite || !course.Prerequisite.prerequisites) return
      
      const targetPos = positions.get(course.id)
      if (!targetPos) return
      
      const extractArrows = (group) => {
        if (group.type === 'course') {
          const sourcePos = positions.get(group.value)
          if (sourcePos) {
            arrows.push(calculateArrowPath(sourcePos, targetPos))
          }
        } else if (group.type === 'AND' || group.type === 'OR') {
          group.items.forEach(item => extractArrows(item))
        }
      }
      
      course.Prerequisite.prerequisites.forEach(group => extractArrows(group))
    })
    
    // Count intersections
    for (let i = 0; i < arrows.length; i++) {
      for (let j = i + 1; j < arrows.length; j++) {
        if (arrowsIntersect(arrows[i], arrows[j])) {
          intersectionCount++
        }
      }
    }
    
    return { arrows, intersectionCount }
  }

  // Position courses with enhanced algorithm
  const positions = new Map()
  const levelHeight = 280 // Optimized height for better arrow spacing
  const courseWidth = 300
  const courseHeight = 100
  const horizontalSpacing = 40 // Optimized spacing

  Array.from(levelGroups.keys()).sort((a, b) => a - b).forEach(level => {
    let coursesInLevel = levelGroups.get(level)

    // Apply horizontal clustering for OR groups
    const clusteredCourses = []
    const placedCourseIds = new Set()

    orGroups.forEach(courseIdsInOrGroup => {
      const orCoursesInLevel = coursesInLevel.filter(course => 
        courseIdsInOrGroup.has(course.id) && !placedCourseIds.has(course.id)
      )
      if (orCoursesInLevel.length > 0) {
        clusteredCourses.push(...orCoursesInLevel.sort((a, b) => a.id.localeCompare(b.id)))
        orCoursesInLevel.forEach(c => placedCourseIds.add(c.id))
      }
    })

    // Add remaining courses
    coursesInLevel.forEach(course => {
      if (!placedCourseIds.has(course.id)) {
        clusteredCourses.push(course)
      }
    })

    // Sort the clustered courses for consistent positioning
    clusteredCourses.sort((a, b) => {
      const aInOr = Array.from(orGroups.values()).some(g => g.has(a.id))
      const bInOr = Array.from(orGroups.values()).some(g => g.has(b.id))

      if (aInOr && !bInOr) return -1
      if (!aInOr && bInOr) return 1
      return a.id.localeCompare(b.id)
    })

    const totalWidth = clusteredCourses.length * courseWidth + (clusteredCourses.length - 1) * horizontalSpacing
    let currentX = -totalWidth / 2

    // Initial positioning with organic distribution
    const adjustedPositions = new Map()
    clusteredCourses.forEach((course, index) => {
      // Add slight wave pattern for organic look
      const waveOffset = Math.sin(index * 0.7) * 60
      adjustedPositions.set(course.id, currentX + (courseWidth / 2) + waveOffset)
      currentX += courseWidth + horizontalSpacing
    })

    // PHASE 1: Node-first optimization (prioritized)
    const nodeOptimizationIterations = 800
    const nodeForceFactor = 0.08
    const nodeDampingFactor = 0.85
    const maxNodeForce = 600

    for (let i = 0; i < nodeOptimizationIterations; i++) {
      clusteredCourses.forEach(course => {
        let totalForce = 0
        let connectedCount = 0

        // Attract to prerequisites and dependents
        courses.forEach(otherCourse => {
          const dependencies = dependencyMap.get(course.id) || new Set()
          const reverseDependencies = reverseDependencyMap.get(course.id) || new Set()
          
          if (dependencies.has(otherCourse.id)) {
            const otherX = adjustedPositions.get(otherCourse.id) || 0
            totalForce += (otherX - adjustedPositions.get(course.id)) * nodeForceFactor
            connectedCount++
          }
          
          if (reverseDependencies.has(otherCourse.id)) {
            const otherX = adjustedPositions.get(otherCourse.id) || 0
            totalForce += (otherX - adjustedPositions.get(course.id)) * nodeForceFactor
            connectedCount++
          }
        })

        // Strong repulsion to prevent node overlap
        clusteredCourses.forEach(otherCourse => {
          if (course.id !== otherCourse.id) {
            const distance = adjustedPositions.get(course.id) - adjustedPositions.get(otherCourse.id)
            const minDistance = courseWidth + 80
            
            if (Math.abs(distance) < minDistance) {
              const repulsionForce = (minDistance - Math.abs(distance)) * 120
              totalForce += distance > 0 ? repulsionForce : -repulsionForce
              connectedCount++
            }
          }
        })

        // Apply node forces
        if (connectedCount > 0) {
          let deltaX = (totalForce / connectedCount) * nodeDampingFactor
          deltaX = Math.max(-maxNodeForce, Math.min(maxNodeForce, deltaX))
          adjustedPositions.set(course.id, adjustedPositions.get(course.id) + deltaX)
        }
      })
    }

    // Set initial positions for this level
    clusteredCourses.forEach((course, index) => {
      const verticalOffset = Math.sin(index * 0.5) * 80 // Organic vertical distribution
      positions.set(course.id, {
        x: adjustedPositions.get(course.id),
        y: level * levelHeight + verticalOffset
      })
    })

    // PHASE 2: Arrow-aware optimization (secondary priority)
    const arrowOptimizationIterations = 300
    const arrowForceFactor = 0.04
    const arrowDampingFactor = 0.75

    let bestIntersectionCount = Infinity
    let bestPositions = new Map(positions)

    for (let i = 0; i < arrowOptimizationIterations; i++) {
      // Calculate current arrow intersections
      const { intersectionCount } = calculateArrowIntersections(positions)
      
      // Track best configuration
      if (intersectionCount < bestIntersectionCount) {
        bestIntersectionCount = intersectionCount
        bestPositions = new Map(positions)
      }
      
      // Stop if we achieve minimal intersections
      if (intersectionCount <= 2) break

      // Apply arrow-aware forces
      clusteredCourses.forEach(course => {
        let arrowForce = 0
        let arrowForceCount = 0

        // Calculate force to reduce arrow intersections
        const currentPos = positions.get(course.id)
        if (!currentPos) return

        // Test small position adjustments to see if they reduce intersections
        const testPositions = new Map(positions)
        const testOffsets = [-30, -15, 15, 30]
        
        let bestOffset = 0
        let minIntersections = intersectionCount

        testOffsets.forEach(offset => {
          testPositions.set(course.id, { ...currentPos, x: currentPos.x + offset })
          const { intersectionCount: testIntersections } = calculateArrowIntersections(testPositions)
          
          if (testIntersections < minIntersections) {
            minIntersections = testIntersections
            bestOffset = offset
          }
        })

        // Apply the best offset as a force
        if (bestOffset !== 0) {
          arrowForce += bestOffset * arrowForceFactor
          arrowForceCount++
        }

        // Apply arrow forces with damping
        if (arrowForceCount > 0) {
          let deltaX = (arrowForce / arrowForceCount) * arrowDampingFactor
          deltaX = Math.max(-50, Math.min(50, deltaX)) // Smaller force cap for arrow optimization
          
          const newX = currentPos.x + deltaX
          positions.set(course.id, { ...currentPos, x: newX })
        }
      })
    }

    // Use the best configuration found
    bestPositions.forEach((pos, courseId) => {
      if (clusteredCourses.some(c => c.id === courseId)) {
        positions.set(courseId, pos)
      }
    })
  })

  return positions
}

// Enhanced arrow path calculation for flexible routing
export const calculateFlexibleArrowPath = (sourcePos, targetPos, allPositions, existingArrows = []) => {
  const deltaX = targetPos.x - sourcePos.x
  const deltaY = targetPos.y - sourcePos.y
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  
  // Calculate curvature based on distance and potential conflicts
  let curvature = Math.min(distance * 0.25, 100)
  
  // Increase curvature if there are many existing arrows
  if (existingArrows.length > 10) {
    curvature *= 1.5
  }
  
  // Calculate control points for bezier curve
  const midX = sourcePos.x + deltaX * 0.5
  const midY = sourcePos.y + deltaY * 0.5
  
  // Add horizontal offset to avoid overlaps
  const horizontalOffset = deltaX > 0 ? curvature : -curvature
  const verticalOffset = Math.abs(deltaY) > 150 ? curvature * 0.6 : curvature * 0.8
  
  // Create waypoints for flexible path
  const waypoints = [
    { x: sourcePos.x, y: sourcePos.y + 25 },
    { x: sourcePos.x + deltaX * 0.2, y: sourcePos.y + verticalOffset },
    { x: midX + horizontalOffset, y: midY },
    { x: targetPos.x - deltaX * 0.2, y: targetPos.y - verticalOffset },
    { x: targetPos.x, y: targetPos.y - 25 }
  ]
  
  return waypoints
}

// Find all prerequisite paths to a target course and courses that depend on it
export const findPrerequisitePaths = (targetCourseId, courses) => {
  const paths = new Set()
  const courseIds = new Set(courses.map(c => c.id))
  
  // Find all paths leading TO the target course (prerequisites)
  const findPathsTo = (courseId, currentPath = []) => {
    if (currentPath.includes(courseId)) {
      // Circular dependency, stop here
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
  
  // Find all paths leading FROM the target course (dependents)
  const findPathsFrom = (courseId) => {
    courses.forEach(course => {
      if (!courseIds.has(course.id) || !course.Prerequisite || !course.Prerequisite.prerequisites) return
      
      const processGroup = (group) => {
        if (group.type === 'course') {
          if (group.value === courseId) {
            paths.add(`${courseId}-${course.id}`)
          }
        } else if (group.type === 'AND' || group.type === 'OR') {
          group.items.forEach(item => processGroup(item))
        }
      }
      
      course.Prerequisite.prerequisites.forEach(group => processGroup(group))
    })
  }
  
  // Find paths both to and from the target course
  findPathsTo(targetCourseId)
  findPathsFrom(targetCourseId)
  
  return Array.from(paths)
}



