import { Navigate } from "react-router";
import useUserStore from "../../store/userStore";

function ProtectedRoute({ children }) {
  const {isAuthenticated,isLoading} = useUserStore();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;