import json

sample_data = {
    "degrees": [
        {
            "id": "CS",
            "name": "Computer Science",
            "color": "#FF5733",
            "major_array": ["SWE", "AI"],
            "course_array": ["CS101", "CS102", "MA101", "CS201", "CS202", "CS301", "CS302", "CS401"]
        },
        {
            "id": "EE",
            "name": "Electrical Engineering",
            "color": "#337AFF",
            "major_array": ["CE"],
            "course_array": ["CS101", "MA101", "PH101", "EE201"]
        }
    ],
    "majors": [
        {
            "id": "SWE",
            "name": "Software Engineering",
            "color": "#FFC300",
            "course_array": ["CS101", "CS102", "CS202", "CS301"]
        },
        {
            "id": "AI",
            "name": "Artificial Intelligence",
            "color": "#DAF7A6",
            "course_array": ["CS101", "CS102", "CS201", "CS401"]
        },
        {
            "id": "CE",
            "name": "Computer Engineering",
            "color": "#C70039",
            "course_array": ["CS101", "PH101", "EE201"]
        }
    ],
    "courses": [
        {
            "id": "CS101",
            "name": "Introduction to Programming",
            "description": "Fundamental concepts of programming.",
            "color": "#900C3F",
            "Prerequisite": {"prerequisites": []}
        },
        {
            "id": "CS102",
            "name": "Data Structures",
            "description": "Advanced data structures and algorithms.",
            "color": "#581845",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "CS101"}]}
            ]}
        },
        {
            "id": "MA101",
            "name": "Calculus I",
            "description": "Introduction to differential and integral calculus.",
            "color": "#FF8C00",
            "Prerequisite": {"prerequisites": []}
        },
        {
            "id": "PH101",
            "name": "Physics I",
            "description": "Introduction to classical mechanics.",
            "color": "#4682B4",
            "Prerequisite": {"prerequisites": []}
        },
        {
            "id": "CS201",
            "name": "Algorithms",
            "description": "Design and analysis of algorithms.",
            "color": "#FFD700",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "CS102"}]}
            ]}
        },
        {
            "id": "CS202",
            "name": "Object-Oriented Programming",
            "description": "Concepts of object-oriented programming.",
            "color": "#ADFF2F",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "CS101"}]}
            ]}
        },
        {
            "id": "EE201",
            "name": "Circuit Analysis",
            "description": "Analysis of electrical circuits.",
            "color": "#8A2BE2",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "PH101"}, {"type": "course", "value": "MA101"}]}
            ]}
        },
        {
            "id": "CS301",
            "name": "Database Systems",
            "description": "Introduction to database management systems.",
            "color": "#8B0000",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "CS102"}]}
            ]}
        },
        {
            "id": "CS302",
            "name": "Operating Systems",
            "description": "Concepts of operating systems.",
            "color": "#4B0082",
            "Prerequisite": {"prerequisites": [
                {"type": "AND", "items": [{"type": "course", "value": "CS102"}]}
            ]}
        },
        {
            "id": "CS401",
            "name": "Machine Learning",
            "description": "Introduction to machine learning algorithms.",
            "color": "#FF4500",
            "Prerequisite": {"prerequisites": [
                {"type": "OR", "items": [
                    {"type": "course", "value": "CS201"},
                    {"type": "AND", "items": [
                        {"type": "course", "value": "CS102"},
                        {"type": "course", "value": "MA101"}
                    ]}
                ]}
            ]}
        }
    ],
    "prerequisites": []
}

with open("sample_data.json", "w") as f:
    json.dump(sample_data, f, indent=2)
