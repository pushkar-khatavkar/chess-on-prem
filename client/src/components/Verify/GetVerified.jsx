import { Link } from "react-router";
import { useState } from "react";
import axios from "axios";
import toast from 'react-hot-toast';
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";

function GetVerified() {
  const [email,setEmail] = useState("");
  const token = localStorage.getItem("token");

  async function sendVerfificationEmail(){
    const id = toast.loading("sending verfication mail");
    try{
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/generate-Verification-Token`,
            {email},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
    toast.success("check your inbox");
    }catch(err){
        toast.error(err.response?.data?.message || err.response?.data?.error || "error sending mail");
    }finally{
        toast.dismiss(id);
    }
  }
  return (
      <section className="h-[100vh] w-[100vw] flex items-center justify-center bg-[#111319]">
        <FramerMotionProvider>
        <fieldset className="rounded-xl w-[30rem] h-[24rem] p-8 shadow-xl bg-[#2D3748]">
          <legend className="text-2xl font-bold text-[#FF33AE] mb-6">
            Get Verified
          </legend>

          <p className="text-lg text-[#F9F1F1] mb-4">
            Enter your email to get verified.
          </p>

          <label className="block text-lg font-medium text-[#F9F1F1]">Email</label>
          <input
            type="email"
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2"
            placeholder="Enter your email"
            onChange={(e)=>setEmail(e.target.value)}
          />

          <button className="btn mt-6 w-full bg-[#FF33AE] hover:bg-[#FF33AE]/70 text-white rounded-lg text-lg font-semibold p-2"
          onClick={sendVerfificationEmail}>
            Send Verification Token
          </button>

          <div className="text-lg text-[#F9F1F1] mt-6 text-center">
            Already verified?{" "}
            <Link
              to="/login"
              className="text-[#F75904]/60 text-[#FF33AE] font-semibold hover:underline"
            >
              Login
            </Link>
          </div>
        </fieldset>
        </FramerMotionProvider>
      </section>
  );
}

export default GetVerified;