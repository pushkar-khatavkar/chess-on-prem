import NavBar from "../NavBar/NavBar";
import FramerMotionProvider from "../../Provider/FramerMotionProvider/FramerMotionProvider";
import axios from "axios";
import toast from "react-hot-toast";
import { useEffect,useState } from "react";
import { useNavigate,useParams } from "react-router";
import BlitzIcon from "../SvgIcons/BlitzIcon";
import RapidIcon from "../SvgIcons/RapidIcons";
import BulletIcon from "../SvgIcons/BulletIcon";

function Profile() {
  const {profileid} = useParams();
  const [Profile,setProfile] = useState(null);
  const navigate = useNavigate();

  async function getProfileDetails() {
    const id = toast.loading("Fetching user profile...");
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/profile/${profileid}`);
      toast.success("Profile fetched");
      setProfile(response.data);
    } catch (err) {
      toast.error("Failed to fetch profile");
      console.log(err);
    } finally {
      toast.dismiss(id);
    }
  }

  useEffect(() => {
    getProfileDetails();
  }, []);

  return (
    <section className="min-h-screen w-full bg-[#111319] text-white">
      <FramerMotionProvider>
        <NavBar />
        <div className="flex justify-center mt-4 px-4">
          <div className="bg-[#1a1c23] p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-700">
            <div className="text-center">
              <img
                src={Profile?.profilePic}
                className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-gray-500 shadow-md"
              />

              <h2 className="mt-4 text-xl font-semibold tracking-wide">
                {Profile?.name || "Loading..."}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{Profile?.email}</p>
              <p className="text-gray-500 text-xs mt-2">
                Joined:{" "}
                {Profile?.createdAt
                  ? new Date(Profile.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>

              <div className="mt-6 flex justify-between gap-3">
                <div className="flex flex-col items-center bg-[#2a2d36] px-4 py-2 rounded-lg flex-1">
                  <RapidIcon className="w-6 h-6 mb-1 text-yellow-400" />
                  <span className="text-sm font-medium">
                    {Profile?.RapidElo ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400">Rapid</span>
                </div>

                <div className="flex flex-col items-center bg-[#2a2d36] px-4 py-2 rounded-lg flex-1">
                  <BlitzIcon className="w-6 h-6 mb-1 text-blue-400" />
                  <span className="text-sm font-medium">
                    {Profile?.BlitzElo ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400">Blitz</span>
                </div>

                <div className="flex flex-col items-center bg-[#2a2d36] px-4 py-2 rounded-lg flex-1">
                  <BulletIcon className="w-6 h-6 mb-1 text-red-400" />
                  <span className="text-sm font-medium">
                    {Profile?.BulletElo ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400">Bullet</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 px-4 flex justify-center">
          <div className="w-full max-w-2xl bg-[#1a1c23] rounded-2xl shadow-lg p-6 border border-gray-700 mb-10">
            <h3 className="text-lg font-semibold border-b border-gray-700 pb-2">
              Game History
            </h3>

            {Profile?.gameHistory?.length > 0 ? (
              <ul className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {Profile.gameHistory.map((gameid,index) => (
                  <li
                    key={index}
                    onClick={() => navigate(`/game/review/${gameid}`)}
                    className="cursor-pointer px-4 py-2 rounded-lg bg-[#2a2d36] hover:bg-[#353841] transition-colors duration-200 text-sm text-gray-300 truncate"
                  >
                    {gameid}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm mt-4">
                No games played yet.
              </p>
            )}
          </div>
        </div>
      </FramerMotionProvider>
    </section>
  )
}

export default Profile;