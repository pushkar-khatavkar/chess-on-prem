import { useEffect, useState} from "react";
import { io } from "socket.io-client";
import useUserStore from "../../store/userStore";
import axios from "axios";
import { useParams,useNavigate } from "react-router";
import toast from 'react-hot-toast';

let socket;

function InviteWaiting() {
    const { userid } = useUserStore();
    const {inviteid} = useParams();
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
        const id = toast.loading("waiting for opponent");
        try{
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/game/invite/${inviteid}`,{
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            const data = response.data;
            console.log(data);
            toast.success(`${JSON.stringify(data)}`);
        }catch(err){
            console.log(err);
            toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data || "some error occurred");
        }finally {
            toast.dismiss(id);
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

   return (
    <section className="bg-[#111319] h-screen w-screen flex flex-col items-center justify-center text-white">
      <div className="max-w-xl text-center mb-8">
        <p className="text-lg italic text-gray-300">"{chessQuote?.quote}"</p>
        <p className="mt-2 text-sm text-gray-400">— {chessQuote?.name}</p>
      </div>
  
      <p className="text-2xl font-semibold text-gray-200 animate-pulse">
        Waiting for opponent...
      </p>
    </section>
  )
}

export default InviteWaiting;