// Layout algorithm to position courses based on prerequisites
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

  // Position courses
  const positions = new Map()
  const levelHeight = 300 // Increased height to allow more vertical spread
  const courseWidth = 300
  const courseHeight = 100 // Approximate height of a course node
  const horizontalSpacing = 30 // Increased horizontal spacing

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
      // Prioritize OR grouped courses, then by ID
      const aInOr = Array.from(orGroups.values()).some(g => g.has(a.id))
      const bInOr = Array.from(orGroups.values()).some(g => g.has(b.id))

      if (aInOr && !bInOr) return -1
      if (!aInOr && bInOr) return 1
      return a.id.localeCompare(b.id)
    })

    const totalWidth = clusteredCourses.length * courseWidth + (clusteredCourses.length - 1) * horizontalSpacing
    let currentX = -totalWidth / 2

    // Introduce a simple force-directed adjustment for horizontal positioning
    // This is a simplified approach, a full force-directed algorithm would be more complex
    const adjustedPositions = new Map()
    clusteredCourses.forEach(course => {
      adjustedPositions.set(course.id, currentX + (courseWidth / 2) + (Math.random() - 0.5) * 100) // Add more randomness
      currentX += courseWidth + horizontalSpacing
    })

    // Apply a simple force-directed adjustment to minimize edge crossings
    // This is a very basic heuristic and not a full force-directed algorithm
    const forceFactor = 0.1 // Reduced force factor for more stability
    const dampingFactor = 0.8 // Damping to prevent overshooting
    const maxIterations = 1500 // Further increased iterations for better convergence
    const maxForce = 800 // Further increased cap for the maximum force applied in one step

    for (let i = 0; i < maxIterations; i++) {
      clusteredCourses.forEach(course => {
        let totalForce = 0
        let connectedCount = 0

        // Attract to prerequisites
        courses.forEach(prereqCourse => {
          if (prereqCourse.Prerequisite && prereqCourse.Prerequisite.prerequisites) {
            const hasPrerequisite = prereqCourse.Prerequisite.prerequisites.some(group => 
              group.items.some(item => item.type === 'course' && item.value === course.id)
            )
            if (hasPrerequisite) {
              const prereqX = positions.get(prereqCourse.id)?.x || 0
              totalForce += (prereqX - adjustedPositions.get(course.id)) * forceFactor
              connectedCount++
            }
          }
        })

        // Attract to dependents
        courses.forEach(dependentCourse => {
          if (course.Prerequisite && course.Prerequisite.prerequisites) {
            const isPrerequisiteFor = course.Prerequisite.prerequisites.some(group => 
              group.items.some(item => item.type === 'course' && item.value === dependentCourse.id)
            )
            if (isPrerequisiteFor) {
              const dependentX = positions.get(dependentCourse.id)?.x || 0
              totalForce += (dependentX - adjustedPositions.get(course.id)) * forceFactor
              connectedCount++
            }
          }
        })

        // Repel from other courses in the same level to prevent overlap
        clusteredCourses.forEach(otherCourse => {
          if (course.id !== otherCourse.id) {
            const distanceX = adjustedPositions.get(course.id) - adjustedPositions.get(otherCourse.id)
            const distanceY = (level * levelHeight + (clusteredCourses.indexOf(course) % 2 === 0 ? 1 : -1) * 50) - (level * levelHeight + (clusteredCourses.indexOf(otherCourse) % 2 === 0 ? 1 : -1) * 75)
            const minDistanceX = courseWidth + 100 // Further increased minimum horizontal distance to avoid overlap
            const minDistanceY = courseHeight + 100 // Further increased minimum vertical distance to avoid overlap

            if (Math.abs(distanceX) < minDistanceX && Math.abs(distanceY) < minDistanceY) {
              // Overlap detected, apply strong repulsion in both dimensions
              const overlapX = minDistanceX - Math.abs(distanceX)
              const overlapY = minDistanceY - Math.abs(distanceY)

              if (overlapX > 0 && overlapY > 0) { // Only if there's actual overlap in both dimensions
                const repulsionForceX = overlapX * 100 // Even Stronger linear repulsion
                const repulsionForceY = overlapY * 100

                if (distanceX > 0) {
                  totalForce += repulsionForceX
                } else {
                  totalForce -= repulsionForceX
                }

                if (distanceY > 0) {
                  // Apply vertical repulsion force by modifying the current position
                  const currentPos = positions.get(course.id) || { x: adjustedPositions.get(course.id), y: level * levelHeight + (clusteredCourses.indexOf(course) % 2 === 0 ? 1 : -1) * 75 }
                  positions.set(course.id, { ...currentPos, y: currentPos.y + repulsionForceY })
                } else {
                  // Apply vertical repulsion force by modifying the current position
                  const currentPos = positions.get(course.id) || { x: adjustedPositions.get(course.id), y: level * levelHeight + (clusteredCourses.indexOf(course) % 2 === 0 ? 1 : -1) * 75 }
                  positions.set(course.id, { ...currentPos, y: currentPos.y - repulsionForceY })
                }
              }
            }
          }
        })

        let deltaX = 0
        if (connectedCount > 0) {
          deltaX = (totalForce / connectedCount) * dampingFactor
        } else {
          deltaX = totalForce * dampingFactor
        }

        // Cap the force to prevent extreme movements
        deltaX = Math.max(-maxForce, Math.min(maxForce, deltaX))

        adjustedPositions.set(course.id, adjustedPositions.get(course.id) + deltaX)
      })
    }

    clusteredCourses.forEach((course, index) => {
      // Introduce vertical offset to break strict rows
      const verticalOffset = (index % 2 === 0 ? 1 : -1) * 150 // Increased vertical offset
      positions.set(course.id, {
        x: adjustedPositions.get(course.id),
        y: level * levelHeight + verticalOffset
      })
    })
  })

  return positions
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



