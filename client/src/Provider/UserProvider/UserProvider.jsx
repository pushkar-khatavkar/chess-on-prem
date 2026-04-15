import { ClipLoader } from "react-spinners";
import useUserStore from "../../store/userStore";

function UserProvider({ children }) {
  const { isLoading } = useUserStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#111319] text-white">
        <ClipLoader
          color="#FF33AE"
          loading={true}
          size={60}
          aria-label="Loading Spinner"
        />
      </div>
    );
  }

  return children;
}

export default UserProvider;