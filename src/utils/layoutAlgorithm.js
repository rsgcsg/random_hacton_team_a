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
  
  // Group courses by level
  const levelGroups = new Map()
  courses.forEach(course => {
    const level = levels.get(course.id) || 0
    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }
    levelGroups.get(level).push(course)
  })
  
  // Position courses
  const positions = new Map()
  const levelHeight = 200
  const courseWidth = 280
  
  Array.from(levelGroups.keys()).sort((a, b) => a - b).forEach(level => {
    const coursesInLevel = levelGroups.get(level)
    const totalWidth = coursesInLevel.length * courseWidth
    const startX = -totalWidth / 2
    
    coursesInLevel.forEach((course, index) => {
      positions.set(course.id, {
        x: startX + (index * courseWidth) + (courseWidth / 2),
        y: level * levelHeight
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

