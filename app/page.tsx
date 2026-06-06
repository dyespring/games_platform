"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket, rememberIdentity } from "@/lib/socket/client";

type Mode = "create" | "join";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onJoined = ({ code: roomCode, playerId }: { code: string; playerId: string }) => {
      rememberIdentity(roomCode, playerId);
      router.push(`/room/${roomCode}`);
    };
    const onError = ({ message }: { message: string }) => {
      setError(message);
      setBusy(false);
    };

    socket.on("room:joined", onJoined);
    socket.on("room:error", onError);
    return () => {
      socket.off("room:joined", onJoined);
      socket.off("room:error", onError);
    };
  }, [router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    const socket = getSocket();
    setBusy(true);
    if (mode === "create") {
      socket.emit("room:create", { name: trimmed });
    } else {
      const c = code.trim().toUpperCase();
      if (c.length !== 4) {
        setError("Room codes are 4 characters.");
        setBusy(false);
        return;
      }
      socket.emit("room:join", { code: c, name: trimmed });
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Two Truths, <span className="text-brand">One Lie</span>
        </h1>
        <p className="mt-3 text-slate-400">
          The party game where everyone&apos;s a little bit suspicious.
        </p>
      </header>

      <div className="card animate-pop-in">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "create" ? "bg-brand text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            Create a room
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("join");
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "join" ? "bg-brand text-white" : "text-slate-300 hover:text-white"
            }`}
          >
            Join a room
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-300">Your name</span>
            <input
              className="input"
              placeholder="e.g. Sam"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          {mode === "join" && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">Room code</span>
              <input
                className="input uppercase tracking-[0.3em]"
                placeholder="ABCD"
                value={code}
                maxLength={4}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Connecting..." : mode === "create" ? "Create room" : "Join room"}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-500">
        Best with 3+ players, each on their own device.
      </p>
    </div>
  );
}
