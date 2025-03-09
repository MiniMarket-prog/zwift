"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Search, Edit, Trash2, UserPlus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/auth/user-provider"

// Define proper types for user data
interface UserProfile {
  id: string
  full_name?: string | null
  role?: string | null
  created_at?: string | null
  is_active?: boolean
  email?: string | null
}

// Form data type
interface UserFormData {
  email: string
  full_name: string
  password: string
  confirmPassword: string
  role: string
  is_active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [roleFilter, setRoleFilter] = useState("all")
  const { toast } = useToast()
  const { user: currentAuthUser } = useUser()

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
    role: "cashier",
    is_active: true,
  })

  // Use useCallback to define fetchUsers to avoid dependency issues
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      // First, fetch profiles from the database
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      // If we have profiles, fetch the corresponding user emails
      if (profilesData && profilesData.length > 0) {
        try {
          // Fetch user emails from our API endpoint
          const response = await fetch("/api/admin/users")

          if (!response.ok) {
            throw new Error(`Error fetching users: ${response.statusText}`)
          }

          const { users: authUsers } = await response.json()

          if (authUsers && authUsers.length > 0) {
            // Map auth users to a dictionary for quick lookup
            const userMap = new Map<string, { id: string; email: string }>()

            authUsers.forEach((user: { id: string; email: string }) => {
              userMap.set(user.id, { id: user.id, email: user.email })
            })

            // Combine profile data with email from auth users
            const usersWithEmail = profilesData.map((profile) => ({
              ...profile,
              email: userMap.get(profile.id)?.email || null,
            }))

            setUsers(usersWithEmail)
          } else {
            setUsers(profilesData)
          }
        } catch (error) {
          console.error("Error in auth users fetch:", error)
          toast({
            title: "Limited User Information",
            description: "Unable to fetch email addresses. User information may be incomplete.",
            variant: "default",
          })
          // Continue with profiles only if we can't get emails
          setUsers(profilesData)
        }
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true)

      // Validate form
      if (!formData.email || !formData.full_name || !formData.password) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        })
        return
      }

      // Use our API endpoint to create the user
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create user")
      }

      toast({
        title: "User Created",
        description: `User account for ${formData.email} has been created successfully.`,
      })

      setShowAddDialog(false)
      // Reset form
      setFormData({
        email: "",
        full_name: "",
        password: "",
        confirmPassword: "",
        role: "cashier",
        is_active: true,
      })
      fetchUsers()
    } catch (error) {
      console.error("Error adding user:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to add user. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = (user: UserProfile) => {
    setCurrentUser(user)
    setFormData({
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      confirmPassword: "",
      role: user.role || "cashier",
      is_active: user.is_active || true,
    })
    setShowEditDialog(true)
  }

  const handleUpdateUser = async () => {
    try {
      setIsSubmitting(true)

      if (!formData.full_name) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      if (!currentUser) return

      // Validate passwords match if provided
      if (formData.password && formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        })
        return
      }

      // Use our API endpoint to update the user
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentUser.id,
          full_name: formData.full_name,
          role: formData.role,
          password: formData.password || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user")
      }

      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      })

      setShowEditDialog(false)
      fetchUsers()
    } catch (error) {
      console.error("Error updating user:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update user. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    // Check if user is trying to delete themselves
    if (id === currentAuthUser?.id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot delete your own account.",
        variant: "destructive",
      })
      return
    }

    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        setIsSubmitting(true)

        // Use our API endpoint to delete the user
        const response = await fetch("/api/admin/users/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to delete user")
        }

        toast({
          title: "User Deleted",
          description: "User has been deleted successfully.",
        })

        fetchUsers()
      } catch (error) {
        console.error("Error deleting user:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to delete user. Please try again."
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // Filter users based on search term and role filter
  const filteredUsers = users.filter(
    (user) =>
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (roleFilter === "all" || user.role === roleFilter),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || "User")}&background=random`}
                              alt={user.full_name || undefined}
                            />
                            <AvatarFallback>
                              {user.full_name
                                ? user.full_name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || "Unnamed User"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "destructive" : user.role === "manager" ? "default" : "secondary"
                          }
                        >
                          {user.role || "cashier"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            disabled={isSubmitting}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={currentAuthUser?.id === user.id || isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with email and password.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleSwitchChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Active User</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-full_name">Full Name</Label>
              <Input
                id="edit-full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-confirmPassword">Confirm New Password</Label>
              <Input
                id="edit-confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleSwitchChange("is_active", checked)}
              />
              <Label htmlFor="edit-is_active">Active User</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

