import { useEffect, useState } from "react";
import { useParams } from "react-router";
import axios from "axios";
import toast from "react-hot-toast";
import { Chessboard } from "react-chessboard";
import GameStateRender from "./GameStateRender";


const customPieces = {
  wP: ({ svgStyle }) => <img src="/assets/pieces/wp.png" alt="White Pawn" style={svgStyle} />,
  wR: ({ svgStyle }) => <img src="/assets/pieces/wr.png" alt="White Rook" style={svgStyle} />,
  wN: ({ svgStyle }) => <img src="/assets/pieces/wn.png" alt="White Knight" style={svgStyle} />,
  wB: ({ svgStyle }) => <img src="/assets/pieces/wb.png" alt="White Bishop" style={svgStyle} />,
  wQ: ({ svgStyle }) => <img src="/assets/pieces/wq.png" alt="White Queen" style={svgStyle} />,
  wK: ({ svgStyle }) => <img src="/assets/pieces/wk.png" alt="White King" style={svgStyle} />,
  bP: ({ svgStyle }) => <img src="/assets/pieces/bp.png" alt="Black Pawn" style={svgStyle} />,
  bR: ({ svgStyle }) => <img src="/assets/pieces/br.png" alt="Black Rook" style={svgStyle} />,
  bN: ({ svgStyle }) => <img src="/assets/pieces/bn.png" alt="Black Knight" style={svgStyle} />,
  bB: ({ svgStyle }) => <img src="/assets/pieces/bb.png" alt="Black Bishop" style={svgStyle} />,
  bQ: ({ svgStyle }) => <img src="/assets/pieces/bq.png" alt="Black Queen" style={svgStyle} />,
  bK: ({ svgStyle }) => <img src="/assets/pieces/bk.png" alt="Black King" style={svgStyle} />,
}

function GameReview() {
  const { gameid } = useParams();
  const [gameDetails,setGameDetails] = useState(null);
  const [currIdx,setCurrIdx] = useState(0);

  
  async function getGame() {
    const id = toast.loading("Loading game...");
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/game/review/${gameid}`
      )
      setGameDetails(response.data);
      toast.success("Game loaded");
    } catch (err) {
      toast.error("Failed to load game");
      console.log(err);
    } finally {
      toast.dismiss(id);
    }
  }

  useEffect(() => {
    getGame();
  },[gameid]);


  function prevMove() {
    if (currIdx > 0) {
      setCurrIdx(currIdx - 1);
    }
  }
  
  function nextMove() {
    if(!gameDetails || !gameDetails.fenhistory) return;
    if (currIdx < gameDetails.fenhistory.length-1) {
      setCurrIdx(currIdx+1);
    }
  }

  return (
    <section className="min-h-screen w-full bg-[#111319] text-white flex flex-row items-center p-6 justify-center">
      {gameDetails ? (
        <>
        <div>
          <Chessboard
            options={{
              position: gameDetails.fenhistory[currIdx],
              boardOrientation: "white",
              onPieceDrop: () => false, 
              boardStyle: {
                width: "75vmin",
                height: "75vmin",
                borderRadius: "0.40rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              },
              darkSquareStyle: { backgroundColor: "#ec4899" },
              lightSquareStyle: { backgroundColor: "#ffe4e6" },
              pieces: customPieces,
              allowDrawingArrows: true,
            }}
          />
          <div className="flex mt-4 items-center justify-center">
            <div className="join">
                <button className="join-item btn" onClick={prevMove}>«</button>
                <button className="join-item btn">{currIdx}/{gameDetails?.fenhistory?.length-1}</button>
                <button className="join-item btn" onClick={nextMove}>»</button>
            </div>
          </div>
        </div>
          <div>
            <GameStateRender gameDetails={gameDetails} />
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </section>
  )
}

export default GameReview;