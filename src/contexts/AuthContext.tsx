import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onlineUsers: Set<string>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, onlineUsers: new Set(), signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupPresence = (userId: string) => {
      if (presenceChannel) return;
      presenceChannel = supabase.channel("online-users");
      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel!.presenceState();
          const onlineIds = new Set<string>();
          for (const key in state) {
            const presences = state[key] as any[];
            presences.forEach((p) => {
              if (p.user_id) onlineIds.add(p.user_id);
            });
          }
          setOnlineUsers(onlineIds);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel?.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    const cleanupPresence = () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
        presenceChannel = null;
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) setupPresence(s.user.id);
      else cleanupPresence();
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) setupPresence(data.session.user.id);
    });

    return () => {
      sub.subscription.unsubscribe();
      cleanupPresence();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        onlineUsers,
        signOut: async () => {
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.warn("Sign out API error (likely deleted user):", e);
          } finally {
            // Force clear local storage keys associated with supabase auth
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes("auth-token") || key.includes("supabase.auth"))) {
                localStorage.removeItem(key);
                i--; // Adjust index since we removed an item
              }
            }
            localStorage.removeItem("sabzi_shop_name");
            setSession(null);
          }
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
