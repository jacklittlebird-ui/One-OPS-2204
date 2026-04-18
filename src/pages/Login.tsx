import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Eye, EyeOff, Shield, Globe, Clock, PlaneLanding, PlaneTakeoff } from "lucide-react";
import oneOpsLogo from "@/assets/one-ops-logo.png";
import linkAeroVertical from "@/assets/linkaero-logo-vertical.png";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, hsl(220 60% 15%), hsl(220 55% 28%), hsl(355 70% 45%))" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-10 -right-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-20 w-40 h-40 rounded-full bg-white/[0.03]" />

         <div className="relative z-10 px-12 max-w-lg text-center space-y-8">
           <div className="inline-flex items-center gap-3">
             <PlaneLanding size={44} className="text-white" strokeWidth={2.2} />
             <span className="text-5xl font-extrabold text-white tracking-tight">Link Aero</span>
             <PlaneTakeoff size={44} className="text-white" strokeWidth={2.2} />
           </div>

          <p className="text-white/80 text-lg leading-relaxed">
            Integrated Ground Handling & Aviation Operations Platform
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: Shield, label: "Secure Access" },
              { icon: Globe, label: "Multi-Station" },
              { icon: Clock, label: "Real-Time Ops" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.08] backdrop-blur-sm">
                <Icon size={20} className="text-white/90" />
                <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logos */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <img src={oneOpsLogo} alt="One OPS" className="w-32 h-32 object-contain" />
            <div className="w-px h-16 bg-border" />
            <img src={linkAeroVertical} alt="Link Aero" className="h-28 object-contain" />
          </div>

          {/* Mobile-only subtitle */}
          <div className="text-center mb-6 lg:hidden">
            <p className="text-muted-foreground text-sm">Ground Handling Operations</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-5 shadow-lg text-[15px]">
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 text-[15px] border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="you@linkaero.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 text-[15px] border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-[15px] px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign In
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-8 opacity-70">
            Developed by OneStory Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
