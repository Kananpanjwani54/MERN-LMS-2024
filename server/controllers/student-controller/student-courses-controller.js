const StudentCourses = require("../../models/StudentCourses");

const getCoursesByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find courses for the student
    const studentBoughtCourses = await StudentCourses.findOne({
      userId: studentId,
    }).populate("courses.courseId"); // optional: populate course details

    // If user has no record, return empty array
    const courses = studentBoughtCourses?.courses || [];

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("❌ Error fetching student courses:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { getCoursesByStudentId };
