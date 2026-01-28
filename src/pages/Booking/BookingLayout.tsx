import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BookingLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export const BookingLayout = ({ leftPanel, rightPanel, className = "" }: BookingLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen bg-slate-50 relative booking-background ${className}`}>
        {/* Top Navigation Bar - Minimalist */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-slate-600 hover:text-primary hover:bg-primary/10 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Button>
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                <h1 className="text-lg font-semibold text-primary hidden md:block">
                   Agendamento Shiatsu
                </h1>
            </div>
            <div className="flex items-center gap-2">
                 {/* Optional: User Profile or specific actions */}
                 <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    Ocyan Wellbeing
                 </div>
            </div>
        </header>

        {/* Main Split Layout */}
        <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto h-[calc(100vh-1rem)] md:h-screen flex flex-col md:flex-row gap-6">
            
            {/* Left Panel: Static/Navigation (Calendar + Summary) */}
            <aside className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col gap-6 animate-slide-up">
                {leftPanel}
            </aside>

            {/* Right Panel: Dynamic Context (Time Slot -> Form -> Success) */}
            <section className="flex-1 min-h-0 flex flex-col animate-fade-in delay-100">
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                     {rightPanel}
                </div>
            </section>

        </main>
    </div>
  );
};
