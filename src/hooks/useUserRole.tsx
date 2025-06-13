
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserRole {
  id: string;
  role: AppRole;
  school_id: string | null;
}

export const useUserRole = (user: User | null) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    } else {
      setUserRoles([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (role: AppRole, schoolId?: string) => {
    return userRoles.some(userRole => {
      if (schoolId && userRole.school_id !== schoolId) {
        return false;
      }
      return userRole.role === role;
    });
  };

  const isSuperAdmin = () => hasRole('super_admin');
  const isSchoolAdmin = (schoolId?: string) => hasRole('school_admin', schoolId);
  const isTeacher = (schoolId?: string) => hasRole('school_teacher', schoolId);
  const isStudent = (schoolId?: string) => hasRole('school_student', schoolId);

  return {
    userRoles,
    isLoading,
    hasRole,
    isSuperAdmin,
    isSchoolAdmin,
    isTeacher,
    isStudent,
    refetch: fetchUserRoles
  };
};
