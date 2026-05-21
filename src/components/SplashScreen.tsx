import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";

export const SplashScreen = () => {
  const [stage, setStage] = useState<"loading" | "fading" | "hidden">("loading");

  useEffect(() => {
    // Prevent scrolling while splash screen is visible
    document.body.style.overflow = 'hidden';
    
    // Start fading out at 2.2 seconds
    const fadeTimer = setTimeout(() => {
      setStage("fading");
    }, 2200);

    // Completely unmount at 3 seconds
    const hideTimer = setTimeout(() => {
      setStage("hidden");
      document.body.style.overflow = 'unset';
    }, 3000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (stage === "hidden") return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden transition-all duration-700 ease-in-out ${stage === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      {/* Background Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative flex flex-col items-center">
        {/* Logo Container with Enhanced Animation */}
        <div className="relative mb-10 group">
          {/* Dynamic Layered Glows */}
          <div className="absolute inset-0 bg-green-400/30 dark:bg-green-500/10 rounded-[2rem] blur-2xl scale-150 animate-logo-glow" />
          <div className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-[2rem] blur-xl scale-110 animate-logo-glow-alt" />
          
          {/* Main Logo Card */}
          <div className="relative h-28 w-28 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(34,197,94,0.3)] border border-white/20 animate-logo-entrance">
            <Sprout className="h-14 w-14 text-white animate-logo-float drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)]" />
          </div>
          
          {/* Decorative Particles */}
          <div className="absolute -top-2 -right-2 h-4 w-4 bg-orange-400 rounded-full blur-[2px] animate-bounce" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -bottom-1 -left-1 h-3 w-3 bg-green-300 rounded-full blur-[1px] animate-bounce" style={{ animationDelay: '0.8s' }} />
        </div>

        {/* Text Animation */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-serif font-bold tracking-tight text-foreground animate-text-reveal">
            Sabzi
          </h1>
          <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase animate-text-reveal" style={{ animationDelay: '0.3s' }}>
            Freshness Delivered
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-16 w-56 h-1.5 bg-secondary rounded-full overflow-hidden border border-border shadow-inner">
          <div className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-600 w-full animate-loading-progress" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes logo-entrance {
          0% { opacity: 0; transform: scale(0.3) rotate(-15deg); }
          60% { opacity: 1; transform: scale(1.1) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes logo-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.05); }
        }
        @keyframes logo-glow {
          0%, 100% { transform: scale(1.5); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 0.5; }
        }
        @keyframes logo-glow-alt {
          0%, 100% { transform: scale(1.1); opacity: 0.2; }
          50% { transform: scale(1.3); opacity: 0.4; }
        }
        @keyframes text-reveal {
          0% { opacity: 0; transform: translateY(15px); filter: blur(5px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes loading-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(-20%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-logo-entrance { 
          animation: logo-entrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; 
        }
        .animate-logo-float { 
          animation: logo-float 3s ease-in-out infinite; 
          animation-delay: 1.2s;
        }
        .animate-logo-glow { 
          animation: logo-glow 4s ease-in-out infinite; 
        }
        .animate-logo-glow-alt { 
          animation: logo-glow-alt 4s ease-in-out infinite; 
          animation-delay: 2s;
        }
        .animate-text-reveal { 
          animation: text-reveal 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; 
          opacity: 0; 
        }
        .animate-loading-progress { 
          animation: loading-progress 2.5s cubic-bezier(0.65, 0, 0.35, 1) infinite; 
        }
      `}} />
    </div>
  );
};


