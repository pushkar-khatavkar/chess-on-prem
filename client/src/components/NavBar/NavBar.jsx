import { FaGithub } from "react-icons/fa";
import { Link } from "react-router";
import { useState } from "react";
import useUserStore from "../../store/userStore";

function NavBar() {
  const { username,isAuthenticated,clearUser,userid } = useUserStore();
  const [menuOpen,setMenuOpen] = useState(false);

  function logout() {
    clearUser();
    setMenuOpen(false);
  }

  return (
    <nav className="p-7 bg-[#111724] text-[#C3CCDA]">
      <div className="flex md:hidden justify-between items-center">
        <div className="flex gap-2 items-center text-xl">
          <FaGithub />
          <Link to="https://github.com/">GitHub</Link>
        </div>
        <div className="text-xl font-semibold">64</div>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="p-2 rounded-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-3 flex flex-col gap-3 rounded-lg shadow p-4 text-lg">
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/start" onClick={() => setMenuOpen(false)}>Start</Link>
          <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>

          {isAuthenticated ? (
            <>
              <Link to={`/profile/${userid}`} onClick={() => setMenuOpen(false)} className="font-semibold">{username}</Link>
              <div onClick={logout} className="cursor-pointer p-3 pl-6 pr-6 rounded-l-full rounded-r-full bg-[#FF33AE] hover:bg-[#E81896] text-white w-25">Logout</div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}

          <div
            onClick={() => {
              toggleMode();
              setMenuOpen(false);
            }}
            className="cursor-pointer flex items-center gap-2"
          >
          </div>
        </div>
      )}

      <div className="hidden md:flex justify-between items-center">
        <div className="flex gap-4 items-center text-xl">
          <FaGithub />
          <Link to="https://github.com/AnmolTutejaGitHub/64">GitHub</Link>
        </div>

        <div className="flex gap-6 items-center text-lg">
          <Link to="/">Home</Link>
          <Link to="/start">Start</Link>
          <Link to="/game/invite">Create Game</Link>
          <div className="flex gap-4 items-center text-xl">
          {isAuthenticated ? (
            <>
              <Link to={`/profile/${userid}`} className="font-semibold">{username}</Link>
              <div onClick={logout} className="cursor-pointer p-3 pl-6 pr-6 rounded-l-full rounded-r-full bg-[#FF33AE] hover:bg-[#E81896] text-white">Logout</div>
            </>
          ) : (
            <>
              <Link to="/signup" className="p-3 pl-6 pr-6 rounded-l-full rounded-r-full bg-[#FF33AE] hover:bg-[#E81896] text-white">Sign up for free</Link>
            </>
          )}
        </div>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;