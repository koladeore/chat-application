import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});
// Retrieves the socket.id for a specific user by their userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

// Event listener triggered when a new client connects.
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);
  // Retrieves the userId passed by the client during the connection handshake & 
  // If a userId is present, it is added to userSocketMap
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients, Broadcasts the list of online users to all connected clients.
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  // The disconnected user is removed from userSocketMap &  All clients are notified of the updated list of online users.
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
