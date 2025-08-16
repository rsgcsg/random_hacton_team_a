import json
import os
from flask import Blueprint, jsonify

course_bp = Blueprint('course', __name__)

def load_courses_data():
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'courses.json')
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}

def extract_incompatible_codes(incompat_data):
    if not incompat_data or 'args' not in incompat_data:
        return []
    
    codes = []
    for arg in incompat_data['args']:
        if arg.get('op') == 'COURSE' and 'code' in arg:
            codes.append(arg['code'])
    return codes

def format_course_data(course_code, course_data):
    return {
        'name': course_code,
        'description': course_data.get('summary', ''),
        'incompatible': extract_incompatible_codes(course_data.get('incompat')),
        'units': int(course_data.get('units', 0)) if course_data.get('units', '').isdigit() else 0,
        'prerequisites': course_data.get('prereq')
    }

@course_bp.route('/courses', methods=['GET'])
def get_all_courses():
    courses_data = load_courses_data()
    
    if not courses_data:
        return jsonify({'error': 'No courses data found'}), 404
    
    formatted_courses = []
    for course_code, course_info in courses_data.items():
        formatted_courses.append(format_course_data(course_code, course_info))
    return jsonify(formatted_courses)

@course_bp.route('/courses/<course_code>', methods=['GET'])
def get_course(course_code):
    courses_data = load_courses_data()
    
    if course_code not in courses_data:
        return jsonify({'error': f'Course {course_code} not found'}), 404
    
    course_info = courses_data[course_code]
    formatted_course = format_course_data(course_code, course_info)
    return jsonify(formatted_course)

