import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";

export const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden transition-opacity duration-700 ease-in-out">
      {/* Background Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative flex flex-col items-center">
        {/* Logo Container with Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
          <div className="relative h-24 w-24 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-glow animate-bounce-slow">
            <Sprout className="h-12 w-12 text-primary-foreground animate-float" />
          </div>
        </div>

        {/* Text Animation */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold tracking-tight text-foreground animate-fade-up">
            Sabzi <span className="text-primary italic">POS</span>
          </h1>
          <p className="mt-2 text-muted-foreground font-medium animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Freshness in every byte
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="mt-12 w-48 h-1.5 bg-secondary rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary w-full animate-loading-bar" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float { animation: float 1s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-fade-up { animation: fade-up 0.8s ease-out forwards; opacity: 0; }
        .animate-loading-bar { animation: loading-bar 2s ease-in-out infinite; }
      `}} />
    </div>
  );
};
