"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ClientRoom } from "@/lib/game/types";
import {
  getSocket,
  recallIdentity,
  rememberIdentity,
} from "@/lib/socket/client";
import Lobby from "./components/Lobby";
import SubmissionForm from "./components/SubmissionForm";
import VotingPanel from "./components/VotingPanel";
import RevealPanel from "./components/RevealPanel";
import Leaderboard from "./components/Leaderboard";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code || "").toUpperCase();

  const [room, setRoom] = useState<ClientRoom | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const playerId = recallIdentity(code);
    if (!playerId) {
      // No identity for this room on this device; send them to join properly.
      router.replace("/");
      return;
    }

    const socket = getSocket();

    const identify = () => socket.emit("player:identify", { code, playerId });

    const onUpdate = (snapshot: ClientRoom) => setRoom(snapshot);
    const onJoined = (data: { code: string; playerId: string }) =>
      rememberIdentity(data.code, data.playerId);
    const onError = ({ message }: { message: string }) => {
      setToast(message);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    };

    socket.on("connect", identify);
    socket.on("room:update", onUpdate);
    socket.on("room:joined", onJoined);
    socket.on("room:error", onError);

    // If already connected (shared singleton), identify right away.
    if (socket.connected) identify();

    return () => {
      socket.off("connect", identify);
      socket.off("room:update", onUpdate);
      socket.off("room:joined", onJoined);
      socket.off("room:error", onError);
    };
  }, [code, router]);

  const socket = getSocket();
  const actions = {
    start: () => socket.emit("game:start"),
    submit: (statements: string[], lieIndex: number) =>
      socket.emit("statements:submit", { statements, lieIndex }),
    vote: (guessIndex: number) => socket.emit("vote:cast", { guessIndex }),
    next: () => socket.emit("spotlight:next"),
    playAgain: () => socket.emit("game:playAgain"),
  };

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Connecting to room {code}...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {toast && (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg animate-pop-in">
          {toast}
        </div>
      )}

      {room.phase === "lobby" && <Lobby room={room} onStart={actions.start} />}
      {room.phase === "submission" && (
        <SubmissionForm room={room} onSubmit={actions.submit} />
      )}
      {room.phase === "voting" && <VotingPanel room={room} onVote={actions.vote} />}
      {room.phase === "reveal" && <RevealPanel room={room} onNext={actions.next} />}
      {room.phase === "results" && (
        <Leaderboard room={room} onPlayAgain={actions.playAgain} />
      )}
    </div>
  );
}
