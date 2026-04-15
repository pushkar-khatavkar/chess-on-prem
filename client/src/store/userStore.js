import { create } from "zustand";
import axios from "axios";

const useUserStore = create((set, get) => ({
  username: "",
  userid: "",
  isLoading: false,
  isAuthenticated: false,

  
  fetchData: async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      set({ isLoading: false,isAuthenticated: false });
      return;
    }

    try {
      set({ isLoading: true });
      
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/verifytokenAndGetUserDetails`,
        { token }
      );

      const { username,userid } = res.data;
      set({username,userid,isLoading:false,isAuthenticated: true });
      
    } catch (err) {
      console.log(err);
      set({ username: "", userid: "", isLoading: false, isAuthenticated: false });
      localStorage.removeItem("token");
    }
  },

  setUser: (username, userid) => {
    set({ username, userid, isAuthenticated: true });
  },

  loginAsGuest: async () => {
    set({ isLoading: true });
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/user/guest`);
      const { token, username, user_id } = res.data;
      localStorage.setItem("token", token);
      set({ username, userid: user_id, isLoading: false, isAuthenticated: true });
      return res.data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  
  clearUser: () => {
    localStorage.removeItem("token");
    set({ username: "", userid: "", isAuthenticated: false }); 
  },
}));

useUserStore.getState().fetchData();

export default useUserStore;
