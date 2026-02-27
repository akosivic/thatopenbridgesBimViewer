import { useAuth } from "./authentication"
import { ReactNode } from "react";


const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div></div>;
  }
  else {
    return children;
  }
};
export default AuthGuard;