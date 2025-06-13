
import { Routes, Route, Navigate } from "react-router-dom";
import { SuperAdminLayout } from "./SuperAdminLayout";
import YearGroupsManager from "./YearGroupsManager";
import QualificationsManager from "./QualificationsManager";
import BoardsManager from "./BoardsManager";
import SubjectsManager from "./SubjectsManager";
import CoursesManager from "./CoursesManager";
import ExamsManager from "./ExamsManager";
import AdminSchools from "../../pages/admin/AdminSchools";
import AdminUsers from "../../pages/admin/AdminUsers";

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

const SuperAdminDashboard = ({ onLogout }: SuperAdminDashboardProps) => {
  return (
    <SuperAdminLayout onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/schools" replace />} />
        <Route path="/schools" element={<AdminSchools />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/year-groups" element={<YearGroupsManager />} />
        <Route path="/subjects" element={<SubjectsManager />} />
        <Route path="/qualifications" element={<QualificationsManager />} />
        <Route path="/boards" element={<BoardsManager />} />
        <Route path="/courses" element={<CoursesManager />} />
        <Route path="/exams" element={<ExamsManager />} />
      </Routes>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
