import { useNavigate } from "react-router";
function GameStateRender({ gameDetails }) {
    const navigate = useNavigate();
    if (!gameDetails) return <div className="text-gray-400">No game details available.</div>;
  
    const {gameid,white_id,black_id,mode,history,moves,startTime,result} = gameDetails;
  
    return (
      <section className="p-4 bg-[#1f2330] rounded-xl w-full max-w-3xl m-4 text-white shadow-lg border border-gray-700">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-3 text-pink-400">Game Details</h2>
          <p className="text-gray-300">Game ID: <span className="text-white">{gameid}</span></p>
          <p className="text-gray-300 cursor-pointer" onClick={()=>navigate(`/profile/${white_id}`)}>White Player: <span className="text-white">{white_id}</span></p>
          <p className="text-gray-300 cursor-pointer" onClick={()=>navigate(`/profile/${black_id}`)}>Black Player: <span className="text-white">{black_id}</span></p>
          <p className="text-gray-300">Mode: <span className="text-white">{mode}</span></p>
          <p className="text-gray-300">Start Time: <span className="text-white">{startTime}</span></p>
          <p className="text-gray-300">Result: <span className="text-white">{JSON.stringify(result)}</span></p>
        </div>
  
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-pink-400">Moves History</h3>
          <div className="p-2 bg-[#2a2d36] rounded border border-gray-600 max-h-30 overflow-y-auto">
            {history.map((move, index) => (
              <p key={index} className="border-b border-gray-700 py-1 text-gray-300">
                {index + 1}. <span className="text-white">{move}</span>
              </p>
            ))}
          </div>
        </div>
  
        <div>
          <h3 className="text-xl font-semibold mb-2 text-pink-400">Detailed Moves</h3>
          <div className="overflow-x-auto bg-[#2a2d36] rounded border border-gray-600 p-2 max-h-50">
            <table className="w-full border-collapse text-gray-300">
              <thead>
                <tr className="text-pink-400">
                  <th className="px-2 py-1 border">#</th>
                  <th className="px-2 py-1 border">Player</th>
                  <th className="px-2 py-1 border">Move</th>
                  <th className="px-2 py-1 border">SAN</th>
                  <th className="px-2 py-1 border">Before FEN</th>
                  <th className="px-2 py-1 border">After FEN</th>
                  <th className="px-2 py-1 border">Move Time</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((movee, idx) => (
                  <tr key={idx} className="hover:bg-[#3f4457] text-gray-300">
                    <td className="px-2 py-1 border">{idx + 1}</td>
                    <td className="px-2 py-1 border capitalize">{movee.color}</td>
                    <td className="px-2 py-1 border">{movee.lan}</td>
                    <td className="px-2 py-1 border">{movee.san}</td>
                    <td className="px-2 py-1 border text-xs">{movee.before}</td>
                    <td className="px-2 py-1 border text-xs">{movee.after}</td>
                    <td className="px-2 py-1 border text-sm">{new Date(movee.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };
  
  export default GameStateRender;