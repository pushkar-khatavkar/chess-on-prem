import { Link } from "react-router";
import axios from "axios";
import toast from "react-hot-toast";
import { useState } from "react";
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";

function ForgetPassword() {
  const [email,setEmail] = useState("");

  async function sendPasswordResetLink() {
    const id = toast.loading("Sending password reset link...");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/resetPasswordToken`,
        { email }
      )
  
      toast.success(response.data?.message || "Reset link sent!");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to send reset link");
    } finally {
      toast.dismiss(id);
    }
  }
  return (
      <section className="flex items-center justify-center bg-[#111319] h-[100vh] w-[100vw]">
        <FramerMotionProvider>
        <fieldset className="rounded-xl w-[30rem] h-[26rem] p-8 shadow-xl bg-[#2D3748]">
          <legend className="text-2xl font-bold text-[#FF33AE] mb-6">
            Forgot Password
          </legend>

          <p className="text-lg text-[#F9F1F1] mb-4">
            Enter your email to get reset password link.
          </p>

          <label className="block text-lg font-medium text-[#F9F1F1]">Email</label>
          <input
            type="email"
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2"
            placeholder="Enter your email"
            onChange={(e)=>setEmail(e.target.value)}
          />

          <button className="btn mt-6 w-full bg-[#FF33AE] hover:bg-[#FF33AE]/70 text-white rounded-lg text-lg font-semibold p-2"
          onClick={sendPasswordResetLink}>
            Send Reset Link
          </button>

          <p className="text-lg text-[#F9F1F1] mt-6 text-center">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-[#FF33AE] font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </fieldset>
        </FramerMotionProvider>
    </section>
  )
}
export default ForgetPassword;