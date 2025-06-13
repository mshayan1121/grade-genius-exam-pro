
import { useState } from "react";
import SuperAdminAuth from "./SuperAdminAuth";
import SchoolAuth from "./SchoolAuth";

interface AuthSelectorProps {
  onAuthSuccess: () => void;
}

const AuthSelector = ({ onAuthSuccess }: AuthSelectorProps) => {
  const [authType, setAuthType] = useState<'school' | 'superadmin'>('school');

  if (authType === 'superadmin') {
    return (
      <SuperAdminAuth 
        onAuthSuccess={onAuthSuccess}
        onSwitchToSchool={() => setAuthType('school')}
      />
    );
  }

  return (
    <SchoolAuth 
      onAuthSuccess={onAuthSuccess}
      onSwitchToSuperAdmin={() => setAuthType('superadmin')}
    />
  );
};

export default AuthSelector;
