import { Link, useNavigate } from "react-router";
import axios from "axios";
import { useState } from "react";
import toast from 'react-hot-toast';
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";
import useUserStore from "../../store/userStore";

function Signup() {

   const [username,setUsername] = useState("");
   const [email,setEmail] = useState("");
   const [password,setPassword] = useState("");
   const [confirm_password,setConfirmPassword] = useState("");

   const navigate = useNavigate();
   const { loginAsGuest } = useUserStore();

   function getAxiosErrorMessage(err) {
    const data = err?.response?.data;
    if (!data) return err?.message || "some error occurred";
    if (typeof data === "string") return data;
    if (typeof data === "object") return data.message || data.error || "some error occurred";
    return "some error occurred";
  }

   async function signup(){
    const id = toast.loading("Creating your account...");
    try{
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/signup`,{
            email : email,
            password : password,
            confirm_password : confirm_password,
            name : username
        })

        const data = response.data;
        console.log(data);
        localStorage.setItem('token',data.token);
        toast.success("Signup successful!");
        navigate("/verify");

    }catch(err){
        console.log(err);
        toast.error(getAxiosErrorMessage(err));
    }finally{
        toast.dismiss(id);
    }
   }

   async function continueAsGuest() {
    const id = toast.loading("Starting guest session...");
    try {
      await loginAsGuest();
      toast.success("Continuing as guest");
      navigate("/start");
    } catch (err) {
      console.log(err);
      toast.error(getAxiosErrorMessage(err));
    } finally {
      toast.dismiss(id);
    }
  }

  return (
      <section className="h-[100vh] w-[100vw] flex items-center justify-center bg-[#111319]">
        <FramerMotionProvider>
        <fieldset className="rounded-xl w-[30rem] h-[40rem] p-8 shadow-xl bg-[#2D3748]">
          <legend className="text-2xl font-bold text-[#FF33AE] mb-6">Sign Up</legend>

          <label className="block text-lg font-medium text-[#F9F1F1]">Name</label>
          <input 
            type="text" 
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2" 
            placeholder="Enter your name" 
            onChange={(e)=>setUsername(e.target.value)}
          />

          <label className="block text-lg font-medium text-[#F9F1F1] mt-4">Email</label>
          <input 
            type="email" 
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2" 
            placeholder="Enter your email" 
            onChange={(e)=>setEmail(e.target.value)}
          />

          <label className="block text-lg font-medium text-[#F9F1F1] mt-4">Password</label>
          <input 
            type="password" 
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2" 
            placeholder="Enter your password" 
            onChange={(e)=>setPassword(e.target.value)}
          />

          <label className="block text-lg font-medium text-[#F9F1F1] mt-4">Confirm Password</label>
          <input 
            type="password" 
            className="input input-bordered w-full mt-1 rounded-lg bg-gray-100 text-black p-2" 
            placeholder="Confirm your password" 
            onChange={(e)=>setConfirmPassword(e.target.value)}
          />

          <button className="btn mt-6 w-full bg-[#FF33AE] hover:bg-[#FF33AE]/70 text-white rounded-lg text-lg font-semibold p-2"
          onClick={signup} >
            Sign Up
          </button>

          <button
            className="btn mt-3 w-full bg-[#111319] hover:bg-[#111319]/70 text-white rounded-lg text-lg font-semibold p-2 border border-white/10"
            onClick={continueAsGuest}
          >
            Continue as Guest
          </button>

          <p className="text-lg text-[#F9F1F1] mt-6 text-center">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-[#FF33AE] hover:text-[#FF33AE] font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </fieldset>
        </FramerMotionProvider>
      </section>
  )
}

export default Signup;
