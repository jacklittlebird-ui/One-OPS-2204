import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, Plus, Shield, Trash2 } from "lucide-react";

type AppRole = "admin" | "station_manager" | "station_ops" | "employee";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  station: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  station_manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  station_ops: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  employee: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const ALL_ROLES: AppRole[] = ["admin", "station_manager", "station_ops", "employee"];

export default function UsersPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Add role dialog
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("employee");

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("employee");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (rolesRes.data) setRoles(rolesRes.data);

    if (user) {
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(!!data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const getUserRoles = (userId: string) =>
    roles.filter((r) => r.user_id === userId);

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUserId,
      role: selectedRole,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role added" });
      setAddRoleOpen(false);
      fetchData();
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removed" });
      fetchData();
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);

    const { data, error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: { data: { full_name: newFullName } },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    if (data.user) {
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: newRole,
      });
    }

    toast({ title: "User created", description: "The user has been invited." });
    setCreateOpen(false);
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("employee");
    setCreating(false);
    setTimeout(fetchData, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="h-6 w-6" /> Users
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage system users and their roles
          </p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Full Name</Label>
                  <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateUser} disabled={creating || !newEmail || !newPassword}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const userRoles = getUserRoles(p.user_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.station || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length === 0 && (
                            <span className="text-muted-foreground text-xs">No roles</span>
                          )}
                          {userRoles.map((r) => (
                            <Badge key={r.id} variant="secondary" className={`${ROLE_COLORS[r.role]} text-xs`}>
                              {r.role.replace(/_/g, " ")}
                              {isAdmin && (
                                <button
                                  onClick={() => handleRemoveRole(r.id)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Dialog open={addRoleOpen && selectedUserId === p.user_id} onOpenChange={(open) => {
                            setAddRoleOpen(open);
                            if (open) setSelectedUserId(p.user_id);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Shield className="h-3 w-3 mr-1" /> Add Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Role to {p.full_name}</DialogTitle>
                              </DialogHeader>
                              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ALL_ROLES.filter((r) => !userRoles.some((ur) => ur.role === r)).map((r) => (
                                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <DialogFooter>
                                <Button onClick={handleAddRole}>Add Role</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
