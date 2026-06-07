"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ClientRoom, GameType } from "@/lib/game/types";
import {
  getSocket,
  recallIdentity,
  rememberIdentity,
} from "@/lib/socket/client";
import Lobby from "./components/Lobby";
import Leaderboard from "./components/Leaderboard";
import SubmissionForm from "./components/twoTruths/SubmissionForm";
import TwoTruthsVoting from "./components/twoTruths/Voting";
import TwoTruthsReveal from "./components/twoTruths/Reveal";
import MostLikelyVoting from "./components/mostLikely/Voting";
import MostLikelyReveal from "./components/mostLikely/Reveal";
import CaptionSubmit from "./components/captionThis/Submit";
import CaptionVoting from "./components/captionThis/Voting";
import CaptionReveal from "./components/captionThis/Reveal";
import SoundToggle from "./components/SoundToggle";
import { useGameSounds } from "./useGameSounds";

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
    selectGame: (gameType: GameType) => socket.emit("game:select", { gameType }),
    start: (options?: { customPrompts?: string[]; customImages?: string[] }) =>
      socket.emit("game:start", options),
    submit: (statements: string[], lieIndex: number) =>
      socket.emit("statements:submit", { statements, lieIndex }),
    submitCaption: (text: string) => socket.emit("caption:submit", { text }),
    vote: (value: string) => socket.emit("vote:cast", { value }),
    advance: () => socket.emit("game:advance"),
    playAgain: () => socket.emit("game:playAgain"),
  };

  useGameSounds(room);

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Connecting to room {code}...
      </div>
    );
  }

  const renderPhase = () => {
    if (room.phase === "lobby") {
      return (
        <Lobby room={room} onSelectGame={actions.selectGame} onStart={actions.start} />
      );
    }
    if (room.phase === "results") {
      return <Leaderboard room={room} onPlayAgain={actions.playAgain} />;
    }

    if (room.game?.type === "two-truths") {
      const view = room.game;
      if (room.phase === "submission") {
        return <SubmissionForm room={room} game={view} onSubmit={actions.submit} />;
      }
      if (room.phase === "voting") {
        return <TwoTruthsVoting room={room} game={view} onVote={actions.vote} />;
      }
      if (room.phase === "reveal") {
        return <TwoTruthsReveal room={room} game={view} onNext={actions.advance} />;
      }
    }

    if (room.game?.type === "most-likely") {
      const view = room.game;
      if (room.phase === "voting") {
        return <MostLikelyVoting room={room} game={view} onVote={actions.vote} />;
      }
      if (room.phase === "reveal") {
        return <MostLikelyReveal room={room} game={view} onNext={actions.advance} />;
      }
    }

    if (room.game?.type === "caption-this") {
      const view = room.game;
      if (room.phase === "submission") {
        return <CaptionSubmit room={room} game={view} onSubmit={actions.submitCaption} />;
      }
      if (room.phase === "voting") {
        return <CaptionVoting room={room} game={view} onVote={actions.vote} />;
      }
      if (room.phase === "reveal") {
        return <CaptionReveal room={room} game={view} onNext={actions.advance} />;
      }
    }

    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <SoundToggle />
      {toast && (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] rounded-xl bg-rose-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg animate-pop-in">
          {toast}
        </div>
      )}
      {renderPhase()}
    </div>
  );
}
