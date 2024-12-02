import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const users = res.data.sort((a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp));
    // Populate unreadCounts state
    const unreadCounts = users.reduce((acc, user) => {
      acc[user._id] = user.unreadCount;
      return acc;
    }, {});
    set({ users, unreadCounts });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      // Mark messages as read for this user
      await axiosInstance.put(`/messages/mark-as-read/${userId}`);
       // Update unread counts
       set((state) => ({
        unreadCounts: { ...state.unreadCounts, [userId]: 0 },
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.on("newMessage", (newMessage) => {
      set((state) => {
        const { unreadCounts, selectedUser } = state;
        const senderId = newMessage.senderId;

        if (selectedUser && senderId === selectedUser._id) {
          // Message from the active conversation
          return { messages: [...state.messages, newMessage] };
        }

        // Update unread count
        return {
          messages: [...state.messages],
          unreadCounts: {
            ...unreadCounts,
            [senderId]: (unreadCounts[senderId] || 0) + 1,
          },
        };
      });
    });
    // Listen for user refresh event
    socket.on("refreshUsers", async () => {
      await get().getUsers();
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
