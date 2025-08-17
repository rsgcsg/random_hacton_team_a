export default function convertCourses(data) {
  const result = Object.entries(data).map(([code, value]) => {
    return {
      id: code,
      name: code,
      description: value.summary ?? "",
      color: getRandomColor(),
      Prerequisite: formatPrereq(value.prereq)
    };
  });

  // Sort the data by the course level (the 5th character)
  result.sort((a, b) => {
    const aCourseLevel = parseInt(a.name.slice(-4));
    const bCourseLevel = parseInt(b.name.slice(-4));
    return aCourseLevel - bCourseLevel;
  })

  return result;
}

function getRandomColor() {
  const colors = ["red", "blue", "green", "yellow", "purple"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// function formatPrereq(prereq) {
//   if (!prereq || !prereq.args || !Array.isArray(prereq.args)) {
//     return { prerequisites: [] };
//   }

//   const items = prereq.args.map(arg => {
//     if (arg.op === "COURSE") {
//       return {
//         type: "course",
//         value: arg.code
//       };
//     }

//     return null; // or handle other op types
//   }).filter(Boolean);

//   return {
//     prerequisites: [
//       {
//         type: "AND",
//         items: items
//       }
//     ]
//   };
// }



function formatPrereq(prereq) {
  if (!prereq || !prereq.args || !Array.isArray(prereq.args)) {
    return { prerequisites: [] };
  }

  const recurse = (prereq) => {
    if (prereq.op === "COURSE") {
      return {
        type: "course",
        value: prereq.code
      };
    }

    const args = prereq.args || []; // fallback to empty array

    if (prereq.op === "AND") {
      return {
        type: "AND",
        items: args.map(recurse)
      };
    } else if (prereq.op === "N_OF" && prereq.n === 1) {
      return {
        type: "OR",
        items: args.map(recurse)
      };
    }

    return {
      type: "OR",
      items: args.map(recurse)
    };
  };


  return {
    prerequisites: [
      recurse(prereq)
    ]
  };
}
