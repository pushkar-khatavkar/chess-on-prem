import NavBar from "../NavBar/NavBar";
import BlitzIcon from "../SvgIcons/BlitzIcon";
import RapidIcon from "../SvgIcons/RapidIcons";
import BulletIcon from "../SvgIcons/BulletIcon";
import axios from "axios";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router";
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";
import { FaRobot } from "react-icons/fa";

function Start(){
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

async function generateRequestId(mode) {
    const id = toast.loading("generating the request id...");
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/game/get-requestid`,
            { mode: mode},
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )
        toast.success("success");
        const data = response.data;
        navigate(`${data.redirect}`);
        console.log(response.data);
    } catch (err) {
        console.log(err);
        toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data || "some error occurred");
    }finally {
        toast.dismiss(id);
    }
}

const modes = [
    { name: "Rapid",icon: RapidIcon,key: "rapid",color: "yellow-400" },
    { name: "Blitz",icon: BlitzIcon,key: "blitz",color: "blue-400" },
    { name: "Bullet",icon: BulletIcon,key: "bullet",color: "red-400" },
    { name: "Stockfish",icon: FaRobot,key: "stockfish",color: "green-400" },
];

function StockfishOptions(){
    navigate("/stockfish/start");
}


    return (
    <section className="h-[100vh] w-[100-vw] bg-[#111319] flex flex-col">
        <FramerMotionProvider>
            <NavBar/>
        </FramerMotionProvider>
        
        <div className="flex items-center justify-center flex-1">
            <FramerMotionProvider>
            <div className="flex-1 flex items-center justify-center">
                <img src="/logo.ico"></img>
            </div>
            </FramerMotionProvider>
            <FramerMotionProvider>
            <div className="flex-1 flex flex-col gap-6">
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateRequestId('rapid')}>
                    <RapidIcon className='w-6 h-6 text-yellow-400'/>
                    <p className="font-semibold text-white">Rapid</p>
                </button>
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateRequestId('blitz')}>
                    <BlitzIcon className='w-6 h-6 text-blue-400'/>
                    <p className="font-semibold text-white">Blitz</p>
                </button>
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={()=>generateRequestId('bullet')}>
                    <BulletIcon className='w-6 h-6 text-red-400'/>
                    <p className="font-semibold text-white">Bullet</p>
                </button>
                <button className="flex items-center justify-center w-98 gap-4 bg-[#1a1c23] p-4 rounded-2xl cursor-pointer border border-gray-700 hover:bg-[#2a2d36] transition-colors duration-200"
                onClick={StockfishOptions}>
                <div className="text-2xl text-green-400"><FaRobot /></div>
                <p className="font-semibold text-white">Play With Stockfish</p>
                </button>
                
            </div>
            </FramerMotionProvider>
        </div>
        
    </section>)
}

export default Start;