import type { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  Room,
  ServerToClientEvents,
  SocketData,
} from "../game/types";
import {
  addPlayer,
  castVote,
  disconnect,
  GameError,
  nextSpotlight,
  playAgain,
  reconnect,
  sanitizeForClient,
  startGame,
  submitStatements,
} from "../game/engine";
import { createRoom, getRoom, reapStaleRooms } from "../game/store";

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Emit a per-viewer sanitized snapshot to every socket in the room. */
async function broadcastRoom(io: IO, room: Room): Promise<void> {
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    const viewerId = s.data.playerId;
    if (!viewerId) continue;
    s.emit("room:update", sanitizeForClient(room, viewerId));
  }
}

function attachPlayer(socket: GameSocket, code: string, playerId: string): void {
  socket.data.code = code;
  socket.data.playerId = playerId;
  socket.join(code);
}

export function registerHandlers(io: IO): void {
  // Periodically clean up abandoned rooms.
  setInterval(reapStaleRooms, 1000 * 60 * 5);

  io.on("connection", (socket: GameSocket) => {
    const withRoom = (fn: (room: Room, playerId: string) => void) => {
      try {
        const { code, playerId } = socket.data;
        if (!code || !playerId) throw new GameError("You're not in a room.");
        const room = getRoom(code);
        if (!room) throw new GameError("This room no longer exists.");
        fn(room, playerId);
        void broadcastRoom(io, room);
      } catch (err) {
        const message =
          err instanceof GameError ? err.message : "Something went wrong.";
        socket.emit("room:error", { message });
      }
    };

    socket.on("room:create", ({ name }) => {
      try {
        const room = createRoom();
        const player = addPlayer(room, name);
        attachPlayer(socket, room.code, player.id);
        socket.emit("room:joined", { code: room.code, playerId: player.id });
        void broadcastRoom(io, room);
      } catch (err) {
        const message =
          err instanceof GameError ? err.message : "Could not create room.";
        socket.emit("room:error", { message });
      }
    });

    socket.on("room:join", ({ code, name }) => {
      try {
        const room = getRoom(code);
        if (!room) throw new GameError("No room found with that code.");
        const player = addPlayer(room, name);
        attachPlayer(socket, room.code, player.id);
        socket.emit("room:joined", { code: room.code, playerId: player.id });
        void broadcastRoom(io, room);
      } catch (err) {
        const message =
          err instanceof GameError ? err.message : "Could not join room.";
        socket.emit("room:error", { message });
      }
    });

    // Reconnect: a returning client re-binds its existing identity.
    socket.on("player:identify", ({ code, playerId }) => {
      try {
        const room = getRoom(code);
        if (!room) throw new GameError("This room no longer exists.");
        const player = reconnect(room, playerId);
        attachPlayer(socket, room.code, player.id);
        socket.emit("room:joined", { code: room.code, playerId: player.id });
        void broadcastRoom(io, room);
      } catch (err) {
        const message =
          err instanceof GameError ? err.message : "Could not rejoin room.";
        socket.emit("room:error", { message });
      }
    });

    socket.on("game:start", () => withRoom((room, pid) => startGame(room, pid)));

    socket.on("statements:submit", ({ statements, lieIndex }) =>
      withRoom((room, pid) => submitStatements(room, pid, statements, lieIndex))
    );

    socket.on("vote:cast", ({ guessIndex }) =>
      withRoom((room, pid) => castVote(room, pid, guessIndex))
    );

    socket.on("spotlight:next", () =>
      withRoom((room, pid) => nextSpotlight(room, pid))
    );

    socket.on("game:playAgain", () =>
      withRoom((room, pid) => playAgain(room, pid))
    );

    socket.on("disconnect", () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      const room = getRoom(code);
      if (!room) return;
      disconnect(room, playerId);
      void broadcastRoom(io, room);
    });
  });
}
