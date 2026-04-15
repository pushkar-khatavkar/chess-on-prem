import NavBar from "../NavBar/NavBar";
import BlitzIcon from "../SvgIcons/BlitzIcon";
import RapidIcon from "../SvgIcons/RapidIcons";
import BulletIcon from "../SvgIcons/BulletIcon";
import axios from "axios";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router";
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";
import { useState } from "react";

function InviteGame(){
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [InviteUrl,setInviteUrl] = useState('');

    async function generateInvite(mode) {
        const id = toast.loading("generating the invite id...");
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/game/generate-invite-url`,
                { mode: mode},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )
            toast.success("success");
            const data = response.data;
            toast.success(data?.message);
            setInviteUrl(data.redirect);
            console.log(response.data);
        } catch (err) {
            console.log(err);
            toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data || "some error occurred");
        }finally {
            toast.dismiss(id);
        }
    }

    return (
    <section className="h-[100vh] w-[100-vw] bg-[#111319] flex flex-col">
        <FramerMotionProvider>
            <NavBar/>
        </FramerMotionProvider>
        
        <div className="flex items-center justify-center flex-1">
            <FramerMotionProvider>
            {InviteUrl && <div className="bg-[#1a1c23] rounded-sm border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200 mb-10 p-2 w-auto"
            >
                    <input value={InviteUrl} disabled className="outline-none text-green-400 h-full w-full disable"></input>
                </div>
            }
            <div className="flex-1 flex flex-col gap-6">
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateInvite('rapid')}>
                    <RapidIcon className='w-6 h-6 text-yellow-400'/>
                    <p className="font-semibold text-white">Rapid</p>
                </button>
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateInvite('blitz')}>
                    <BlitzIcon className='w-6 h-6 text-blue-400'/>
                    <p className="font-semibold text-white">Blitz</p>
                </button>
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateInvite('bullet')}>
                    <BulletIcon className='w-6 h-6 text-red-400'/>
                    <p className="font-semibold text-white">Bullet</p>
                </button>
                
            </div>
            </FramerMotionProvider>
        </div>
        
    </section>)
}

export default InviteGame;