import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoPlayer from "@/components/video-player";
import { AuthContext } from "@/context/auth-context";
import { StudentContext } from "@/context/student-context";
import {
  getCurrentCourseProgressService,
  markLectureAsViewedService,
  resetCourseProgressService,
} from "@/services";
import { Check, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useNavigate, useParams } from "react-router-dom";

function StudentViewCourseProgressPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { studentCurrentCourseProgress, setStudentCurrentCourseProgress } =
    useContext(StudentContext);
  const [lockCourse, setLockCourse] = useState(false);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [showCourseCompleteDialog, setShowCourseCompleteDialog] =
    useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSideBarOpen, setIsSideBarOpen] = useState(true);
  const { id } = useParams();

  // =============================
  // ✅ Fetch course progress
  // =============================
  async function fetchCurrentCourseProgress() {
    try {
      const response = await getCurrentCourseProgressService(auth?.user?._id, id);
      console.log("📦 API Response:", response?.data);

      if (response?.success) {
        const courseDetails = response?.data?.courseDetails;
        const progress = response?.data?.progress || [];
        const curriculum = courseDetails?.curriculum || [];

        if (!response?.data?.isPurchased) {
          setLockCourse(true);
          return;
        }

        // Update context
        setStudentCurrentCourseProgress({
          courseDetails,
          progress,
        });

        // ✅ Handle completed course
        if (response?.data?.completed) {
          setCurrentLecture(curriculum?.[0] || null);
          setShowCourseCompleteDialog(true);
          setShowConfetti(true);
          return;
        }

        // ✅ No progress yet (start with first)
        if (progress.length === 0) {
          setCurrentLecture(curriculum?.[0] || null);
          return;
        }

        // ✅ Find last viewed lecture
        const lastIndexOfViewedAsTrue = progress.reduceRight(
          (acc, obj, index) => (acc === -1 && obj.viewed ? index : acc),
          -1
        );

        // ✅ Determine next lecture safely
        const nextIndex = lastIndexOfViewedAsTrue + 1;
        if (nextIndex >= curriculum.length || nextIndex < 0) {
          // All lectures done
          setCurrentLecture(curriculum?.[curriculum.length - 1] || null);
          setShowCourseCompleteDialog(true);
          setShowConfetti(true);
        } else {
          setCurrentLecture(curriculum?.[nextIndex] || curriculum?.[0] || null);
        }
      }
    } catch (err) {
      console.error("❌ Error fetching course progress:", err);
    }
  }

  // =============================
  // ✅ Update course progress
  // =============================
  async function updateCourseProgress() {
    try {
      if (currentLecture && studentCurrentCourseProgress?.courseDetails?._id) {
        const response = await markLectureAsViewedService(
          auth?.user?._id,
          studentCurrentCourseProgress?.courseDetails?._id,
          currentLecture._id
        );

        if (response?.success) {
          await fetchCurrentCourseProgress();
        }
      }
    } catch (err) {
      console.error("❌ Error updating course progress:", err);
    }
  }

  // =============================
  // ✅ Handle rewatch course
  // =============================
  async function handleRewatchCourse() {
    try {
      const response = await resetCourseProgressService(
        auth?.user?._id,
        studentCurrentCourseProgress?.courseDetails?._id
      );

      if (response?.success) {
        setCurrentLecture(null);
        setShowConfetti(false);
        setShowCourseCompleteDialog(false);
        await fetchCurrentCourseProgress();
      }
    } catch (err) {
      console.error("❌ Error resetting course progress:", err);
    }
  }

  // =============================
  // ✅ Effects
  // =============================
  useEffect(() => {
    fetchCurrentCourseProgress();
  }, [id]);

  useEffect(() => {
    if (currentLecture?.progressValue === 1) updateCourseProgress();
  }, [currentLecture]);

  useEffect(() => {
    if (showConfetti) setTimeout(() => setShowConfetti(false), 15000);
  }, [showConfetti]);

  useEffect(() => {
    console.log("🎥 Current Lecture:", currentLecture);
  }, [currentLecture]);

  // =============================
  // ✅ UI Rendering
  // =============================
  return (
    <div className="flex flex-col h-screen bg-[#1c1d1f] text-white">
      {showConfetti && <Confetti />}

      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between p-4 bg-[#1c1d1f] border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => navigate("/student-courses")}
            className="text-black"
            variant="ghost"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to My Courses Page
          </Button>
          <h1 className="text-lg font-bold hidden md:block">
            {studentCurrentCourseProgress?.courseDetails?.title}
          </h1>
        </div>
        <Button onClick={() => setIsSideBarOpen(!isSideBarOpen)}>
          {isSideBarOpen ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Section */}
        <div
          className={`flex-1 ${
            isSideBarOpen ? "mr-[400px]" : ""
          } transition-all duration-300`}
        >
          <VideoPlayer
            width="100%"
            height="500px"
            url={currentLecture?.videoUrl}
            onProgressUpdate={setCurrentLecture}
            progressData={currentLecture}
          />
          <div className="p-6 bg-[#1c1d1f]">
            <h2 className="text-2xl font-bold mb-2">
              {currentLecture?.title || "Loading..."}
            </h2>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={`fixed top-[64px] right-0 bottom-0 w-[400px] bg-[#1c1d1f] border-l border-gray-700 transition-all duration-300 ${
            isSideBarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <Tabs defaultValue="content" className="h-full flex flex-col">
            <TabsList className="grid bg-[#1c1d1f] w-full grid-cols-2 p-0 h-14">
              <TabsTrigger
                value="content"
                className=" text-black rounded-none h-full"
              >
                Course Content
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className=" text-black rounded-none h-full"
              >
                Overview
              </TabsTrigger>
            </TabsList>

            {/* ===== Course Content Tab ===== */}
            <TabsContent value="content">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {studentCurrentCourseProgress?.courseDetails?.curriculum?.map(
                    (item) => (
                      <div
                        className="flex items-center space-x-2 text-sm text-white font-bold cursor-pointer"
                        key={item._id}
                      >
                        {studentCurrentCourseProgress?.progress?.find(
                          (p) => p.lectureId === item._id
                        )?.viewed ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Play className="h-4 w-4 " />
                        )}
                        <span>{item?.title}</span>
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== Overview Tab ===== */}
            <TabsContent value="overview" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-4">About this course</h2>
                  <p className="text-gray-400">
                    {studentCurrentCourseProgress?.courseDetails?.description}
                  </p>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== DIALOGS ===== */}
      <Dialog open={lockCourse}>
        <DialogContent className="sm:w-[425px]">
          <DialogHeader>
            <DialogTitle>You can't view this page</DialogTitle>
            <DialogDescription>
              Please purchase this course to get access
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showCourseCompleteDialog}>
        <DialogContent showOverlay={false} className="sm:w-[425px]">
          <DialogHeader>
            <DialogTitle>Congratulations!</DialogTitle>
            <DialogDescription className="flex flex-col gap-3">
              <Label>You have completed the course</Label>
              <div className="flex flex-row gap-3">
                <Button onClick={() => navigate("/student-courses")}>
                  My Courses Page
                </Button>
                <Button onClick={handleRewatchCourse}>Rewatch Course</Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentViewCourseProgressPage;
