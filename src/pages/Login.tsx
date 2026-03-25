import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Plane, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Plane size={28} className="text-primary" />
            <span className="text-2xl font-bold text-foreground">Link Aero</span>
          </div>
          <p className="text-muted-foreground text-sm">Ground Handling Operations</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-6 space-y-4 shadow-lg">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@linkaero.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
