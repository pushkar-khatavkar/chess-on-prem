import { useEffect, useState} from "react";
import { io } from "socket.io-client";
import useUserStore from "../../store/userStore";
import axios from "axios";
import { useParams,useNavigate } from "react-router";
import toast from 'react-hot-toast';
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";

let socket;

function FindGame() {
    const { userid } = useUserStore();
    const {mode,requestid} = useParams();
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    const [chessQuote,setChessQuote] = useState(null);

    async function getChessQuote(){
        try{
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/game/chess-quotes`);
            const data = response.data;
            console.log(data);
            setChessQuote(data);
        }catch(err){
            console.log(err);
        }
    }

    async function findGameMatch(){
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/game/find-match`,{
            mode : mode,
            requestId : requestid,
        },{
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        const data = response.data;
        console.log(data);
        // if(data.status == 'waiting');
        if(data.status == 'match_found') toast.success('Match Found');
        if(data.status == 'resolved'){
            toast.error('Request Id already Resolved');
            navigate('/');
        }
    }

    async function canceltheSearch(){
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/game/remove-from-queue`,{
            mode : mode,
            requestId : requestid,
        },{
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        const data = response.data;
        console.log(data);
        if(data.status == 'not_in_queue' || data.status == 'removed_from_queue'){
            toast.success("Removed from Queue");
            navigate("/");
        }
    }

    useEffect(() => {
        if (!socket) {
            socket = io(import.meta.env.VITE_API_URL,{
                auth: { userid }
            });

            socket.connect();
        }

        socket.on("socket:registered",async (data) => {
            console.log(data);
            try {
                await findGameMatch();
            } catch (err) {
                console.log(err);
            }
        })

        socket.on("match_found",(data)=>{
            console.log(data);
            navigate(`/game/${data.gameid}`);

        })


        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    },[userid]);


   useEffect(()=>{
        getChessQuote();
   },[])


   // will implement later 
//    useEffect(() => {
//     if (!userid) return;
//     const intervalId = setInterval(() => {
//         console.log(`heartbeat emitted for ${userid} at ${new Date()}...`);
//         socket.emit('heartbeat');
//     }, 15 * 1000); // 15 sec
//     return () => clearInterval(intervalId);
//     },[userid,socket]);

   return (
    <section className="bg-[#111319] h-screen w-screen flex flex-col items-center justify-center text-white">
      <div className="max-w-xl text-center mb-8">
        <p className="text-lg italic text-gray-300">"{chessQuote?.quote}"</p>
        <p className="mt-2 text-sm text-gray-400">— {chessQuote?.name}</p>
      </div>
  
      <div className="text-2xl font-semibold text-gray-200 animate-pulse">
        Waiting for opponent...
      </div>
      <button onClick={canceltheSearch} className="p-4 text-[#FF33AE] hover:text-[#FF33AE]/70 cursor-pointer font-bold text-md">Cancel The Search</button>
    </section>
  )
}

export default FindGame;