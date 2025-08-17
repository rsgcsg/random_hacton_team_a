// Improved layout algorithm with better OR group horizontal positioning
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
      return 0 // Circular dependency
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
        }
      })
    }
  })

  // Position courses with improved OR group handling
  const positions = new Map()
  const levelHeight = 300
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
      }
    })

    // Add remaining courses as individual clusters
    coursesInLevel.forEach(course => {
      if (!processedCourses.has(course.id)) {
        clusters.push({
          type: 'INDIVIDUAL',
          courses: [course],
          spacing: minHorizontalSpacing
        })
      }
    })

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
          }
        } else if (group.type === 'AND' || group.type === 'OR') {
          group.items.forEach(item => processGroup(item))
        }
      }

      course.Prerequisite.prerequisites.forEach(group => processGroup(group))
    })
  }

  findPathsTo(targetCourseId)
  findPathsFrom(targetCourseId)

  return Array.from(paths)
}