import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from "react-router";
import { useState } from 'react';
import NavBar from '../NavBar/NavBar';
import FramerMotionProvider from '../../Provider/FramerMotionProvider/FramerMotionProvider';
import { FaRobot } from "react-icons/fa";

function StockFishStart() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [isWhite,setIsWhite] = useState(true);
  const [depth,setDepth] = useState(15);

  async function initStockfishGame() {
    const id = toast.loading("Get Ready To Be Cooked...");
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_STOCKFISH_SERVER_API_URL}/api/stockfish/create-stockfish-game`,
        {
          depth,
          isWhite
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );
      toast.success("Game created!");
      const data = response.data;
      navigate(`/stockfish/game/${data.gameid}`);
    } catch (err) {
      console.log(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data || "Some error occurred");
    } finally {
      toast.dismiss(id);
    }
  }

  return (
    <FramerMotionProvider>
    <div className='bg-[#111319] text-white h-[100vh] w-[100vw] flex flex-col'>
       
            <NavBar/>
    <div className="flex flex-col items-center justify-center  space-y-8 flex-1">  
      <div className="flex space-x-6">
        <button
          onClick={() => setIsWhite(true)}
          className={`px-6 py-3 rounded-sm font-bold transition cursor-pointer ${
            isWhite
              ? "bg-pink-500 text-white shadow-lg"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          White
        </button>
        <button
          onClick={() => setIsWhite(false)}
          className={`px-6 py-3 rounded-sm font-bold transition cursor-pointer ${
            !isWhite
              ? "bg-pink-500 text-white shadow-lg"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Black
        </button>
      </div>

      <div className="flex flex-col items-center space-y-2">
        <label className="text-lg font-semibold">Stockfish Depth: {depth}</label>
        <input
          type="range"
          min="1"
          max="30"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          className="w-64 accent-pink-500"
        />
      </div>

        <div className="flex justify-center items-center gap-4 text-white bg-[#FF33AE] p-5 w-98 rounded-md cursor-pointer hover:border-2 hover:border-white hover:bg-[#111319] hover:text-[#FF33AE] font-semibold"
            onClick={initStockfishGame}>
            <div className="text-2xl"><FaRobot /></div>
            <div>Play With Stockfish</div>
        </div>
      </div>
    </div>
    </FramerMotionProvider>
  )
}

export default StockFishStart;