import { useParams ,useNavigate} from "react-router";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";

function VerifyYourAccount() {
  const { token } = useParams();
  const [loading,setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async () => {
    const toastId = toast.loading("Verifying your account...");
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/user/verify/${token}`,
      )
      toast.success(response?.data?.message || "Account verified!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Verification failed");
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  };

  return (
      <section className="h-[100vh] w-[100vw] flex items-center justify-center bg-[#111319]">
        <FramerMotionProvider>
        <fieldset className="rounded-xl w-[30rem] h-[18rem] p-8 shadow-xl bg-[#2D3748]">
          <legend className="text-2xl font-bold text-[#FF33AE] mb-6">
            Verify Your Account
          </legend>

          <p className="text-lg text-[#F9F1F1] mb-4">
            Click the button below to verify your account.
          </p>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="btn mt-6 w-full  bg-[#FF33AE] hover:bg-[#FF33AE]/70 text-white rounded-lg text-lg font-semibold disabled:opacity-50 p-2"
          >
            {loading ? "Verifying..." : "Verify Account"}
          </button>
        </fieldset>
        </FramerMotionProvider>
      </section>
  );
}

export default VerifyYourAccount;