import { BrowserRouter,Route,Routes } from 'react-router';
import Home from './components/Home/Home';
import UserProvider from './Provider/UserProvider/UserProvider';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login/Login';
import Signup from './components/Signup/Signup';
import ForgetPassword from './components/UpdatePassword/ForgetPassword';
import ResetPassword from './components/UpdatePassword/ResetPassword';
import GetVerified from './components/Verify/GetVerified';
import VerifyYourAccount from './components/Verify/VerifyYourAccount';
import Start from './components/Start/Start';
import ProtectedRoute from './Provider/ProtectedRoute/ProtectedRoute';
import FindGame from './components/FindGame/FindGame';
import Game from './components/Game/Game';
import Profile from './components/Profile/Profile';
import Pricing from './components/Pricing/Pricing';
import StockfishGame from './components/Game/StockfishGame';
import StockFishStart from './components/Start/StockFishStart';
import GameReview from './components/GameReview/GameReview';
import InviteGame from './components/Game/InviteGame';
import InviteWaiting from './components/Game/InviteWaiting';

function App() {
  return (<div className='bg-[#111319]'>
    <Toaster/>
    <BrowserRouter>
    <UserProvider>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/verify" element={<GetVerified/>} />
        <Route path="/verify-email/:token" element={<VerifyYourAccount/>} />
        <Route path="/forget-password" element={<ForgetPassword/>} />
        <Route path="/update-password/:token" element={<ResetPassword/>} />
        <Route path="/start" element={
          <ProtectedRoute>
            <Start/>
        </ProtectedRoute>
        } />

      <Route path="/find/:mode/:requestid" element={
          <ProtectedRoute>
            <FindGame/>
          </ProtectedRoute>
        } />

        <Route path="/game/:gameid" element={
           <ProtectedRoute>
            <Game/>
          </ProtectedRoute>
        }/>
        <Route path="/stockfish/start" element={
           <ProtectedRoute>
              <StockFishStart/>
          </ProtectedRoute>
        }/>
        <Route path="/stockfish/game/:gameid" element={
           <ProtectedRoute>
            <StockfishGame/>
          </ProtectedRoute>
        }/>
         <Route path="/profile/:profileid" element={
           <ProtectedRoute>
            <Profile/>
          </ProtectedRoute>
        }/>
        <Route path="/pricing" element={<Pricing/>}/>
        <Route path="/game/review/:gameid" element={<GameReview/>}/>
        <Route path="/game/invite" element={
          <ProtectedRoute>
            <InviteGame/>
          </ProtectedRoute>
        }/>
        <Route path="/invite/:inviteid" element={
          <ProtectedRoute>
            <InviteWaiting/>
          </ProtectedRoute>
        }/>
      </Routes>
      </UserProvider>
     </BrowserRouter>
  </div>)
}

export default App;
