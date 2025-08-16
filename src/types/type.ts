// ID = Course Code

type Degree = {
  id: string;
  name: string;
  color: string;
  major_array: string[]; // IDs of Majors
  course_array: string[]; // IDs of Courses
  core_courses_array: string[];
  program_elective_courses_array: string[];
  total_units: number;
};

type Major = {
  id: string;
  name: string;
  color: string;
  course_array: string[]; // IDs of Courses
};

type Course = {
  id: string;
  name: string;
  description: string;
  units: number;
  color: string;
  Prerequisite: {
    prerequisites: PrerequisiteItem[];
  };
  incompatible: string[]; // IDs of Courses
};

// Recursive prerequisite types
/**
 * CS102 corresponds to:
  {
    "type": "AND",
    "items": [
      {
        "type": "course",
        "value": "CS102"
      }
    ]
  }

 * CS201 OR (CS102 + MA101) corresponds to:
 {
    "type": "OR",
    "items": [
      {
        "type": "course",
        "value": "CS201"
      },
      {
        "type": "AND",
        "items": [
          {
            "type": "course",
            "value": "CS102"
          },
          {
            "type": "course",
            "value": "MA101"
          }
        ]
      }
    ]
  }
 */
type PrerequisiteItem =
  | {
      type: "AND" | "OR";
      items: PrerequisiteItem[];
    }
  | {
      type: "course";
      value: string; // Course ID
    };

type Data = {
  degrees: Degree[];
  majors: Major[];
  courses: Course[];
};
