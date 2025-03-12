"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Pencil, Trash, Loader2, UserPlus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/hooks/use-language"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Update the Profile type definition to match your actual database structure
type DatabaseProfile = {
  id: string
  updated_at?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  // Remove username since it doesn't exist in your table
}

type Profile = DatabaseProfile & {
  email?: string | null
  username?: string | null // Add username
  role: string // Make role required in our application
}

const UsersPage = () => {
  const [profilesData, setProfilesData] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newUser, setNewUser] = useState({
    email: "",
    username: "", // Add username field
    full_name: "",
    password: "",
    role: "cashier",
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  const { getAppTranslation, language, isRTL } = useLanguage()
  const rtlEnabled = isRTL

  const roleOptions = [
    { value: "cashier", label: getAppTranslation("role_cashier") },
    { value: "manager", label: getAppTranslation("role_manager") },
    { value: "admin", label: getAppTranslation("role_admin") },
  ]

  // Function to get table columns
  // Since we can't dynamically get table columns, we'll hardcode the known columns
  const [hasFullNameColumn, setHasFullNameColumn] = useState(true)
  const [hasRoleColumn, setHasRoleColumn] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
        return
      }

      // Fetch profiles from the database
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*")

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        toast({
          title: getAppTranslation("error"),
          description: getAppTranslation("failed_to_fetch_profiles"),
          variant: "destructive",
        })
        return
      }

      console.log("Fetched profiles:", profiles)

      // Check if the profiles have full_name and role columns
      if (profiles && profiles.length > 0) {
        const firstProfile = profiles[0]
        setHasFullNameColumn("full_name" in firstProfile)
        setHasRoleColumn("role" in firstProfile)
      }

      // Try to fetch user emails from the API endpoint
      try {
        const response = await fetch("/api/admin/users")

        if (response.ok) {
          const { users: authUsers } = await response.json()

          if (authUsers && Array.isArray(authUsers)) {
            // Create a map of user IDs to emails
            const userMap = new Map<string, string>()

            authUsers.forEach((user: { id: string; email: string }) => {
              if (user.id && user.email) {
                userMap.set(user.id, user.email)
              }
            })

            // Add emails to profiles and ensure role property exists
            const profilesWithEmail = profiles?.map((profile: DatabaseProfile) => ({
              ...profile,
              email: userMap.get(profile.id) || null,
              role: profile.role || "cashier", // Use the role if it exists, otherwise default to cashier
            })) as Profile[]

            setProfilesData(profilesWithEmail || [])
            setFilteredProfiles(profilesWithEmail || [])
          } else {
            // Ensure role property exists
            const profilesWithDefaults = (profiles || []).map((profile: DatabaseProfile) => ({
              ...profile,
              role: profile.role || "cashier",
            })) as Profile[]
            setProfilesData(profilesWithDefaults)
            setFilteredProfiles(profilesWithDefaults)
          }
        } else {
          // If API call fails, just use the profiles as is with default role
          const profilesWithDefaults = (profiles || []).map((profile: DatabaseProfile) => ({
            ...profile,
            role: profile.role || "cashier",
          })) as Profile[]
          setProfilesData(profilesWithDefaults)
          setFilteredProfiles(profilesWithDefaults)
        }
      } catch (error) {
        console.error("Error fetching user emails:", error)
        // Still set the profiles even if we can't get emails, but ensure role exists
        const profilesWithDefaults = (profiles || []).map((profile: DatabaseProfile) => ({
          ...profile,
          role: profile.role || "cashier",
        })) as Profile[]
        setProfilesData(profilesWithDefaults)
        setFilteredProfiles(profilesWithDefaults)
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("unexpected_error"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast, router, getAppTranslation])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter profiles based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProfiles(profilesData)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = profilesData.filter(
        (profile) =>
          (profile.full_name && profile.full_name.toLowerCase().includes(term)) ||
          (profile.email && profile.email.toLowerCase().includes(term)),
      )
      setFilteredProfiles(filtered)
    }
  }, [searchTerm, profilesData])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleAddUser = async () => {
    setIsProcessing(true)
    try {
      // Validate required fields
      if (!newUser.email || !newUser.password) {
        toast({
          title: getAppTranslation("error"),
          description: "Email and password are required",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      // Call the actual API endpoint to create a user
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUser.email,
          username: newUser.username,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create user")
      }

      toast({
        title: getAppTranslation("success"),
        description: getAppTranslation("user_added_successfully"),
      })

      setIsAddUserDialogOpen(false)
      setNewUser({
        email: "",
        username: "",
        full_name: "",
        password: "",
        role: "cashier",
      })

      // Refresh the user list
      await fetchData()
    } catch (error) {
      console.error("Error adding user:", error)
      toast({
        title: getAppTranslation("error"),
        description: error instanceof Error ? error.message : getAppTranslation("failed_to_add_user"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setIsProcessing(true)
    try {
      // Call the actual API endpoint to update a user
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUser.id,
          username: newUser.username,
          full_name: newUser.full_name,
          role: newUser.role,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update user")
      }

      toast({
        title: getAppTranslation("success"),
        description: getAppTranslation("user_updated_successfully"),
      })

      setIsEditUserDialogOpen(false)
      setSelectedUser(null)

      // Refresh the user list
      await fetchData()
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: getAppTranslation("error"),
        description: error instanceof Error ? error.message : getAppTranslation("failed_to_update_user"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setIsProcessing(true)
    try {
      // Call the actual API endpoint to delete a user
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUser.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to delete user")
      }

      toast({
        title: getAppTranslation("success"),
        description: getAppTranslation("user_deleted_successfully"),
      })

      setIsDeleteUserDialogOpen(false)
      setSelectedUser(null)

      // Refresh the user list
      await fetchData()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: getAppTranslation("error"),
        description: error instanceof Error ? error.message : getAppTranslation("failed_to_delete_user"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditClick = (profile: Profile) => {
    setSelectedUser(profile)
    setNewUser({
      email: profile.email || "",
      username: profile.username || "", // Add username
      full_name: profile.full_name || "",
      password: "",
      role: profile.role || "cashier",
    })
    setIsEditUserDialogOpen(true)
  }

  const handleDeleteClick = (profile: Profile) => {
    setSelectedUser(profile)
    setIsDeleteUserDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className={`${rtlEnabled ? "mr-2" : "ml-2"}`}>{getAppTranslation("loading_users")}</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">{getAppTranslation("user_management")}</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${rtlEnabled ? "right-2" : "left-2"} top-2.5 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={getAppTranslation("search_users")}
              value={searchTerm}
              onChange={handleSearch}
              className={rtlEnabled ? "pr-8" : "pl-8"}
            />
          </div>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <UserPlus className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
            {getAppTranslation("add_user")}
          </Button>
        </div>
      </div>

      <Table>
        <TableCaption>{getAppTranslation("registered_users_list")}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{getAppTranslation("name")}</TableHead>
            <TableHead>{getAppTranslation("email")}</TableHead>
            <TableHead>{getAppTranslation("role")}</TableHead>
            <TableHead>{getAppTranslation("status")}</TableHead>
            <TableHead className="text-right">{getAppTranslation("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProfiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                {getAppTranslation("no_users_found")}
              </TableCell>
            </TableRow>
          ) : (
            filteredProfiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div className={`flex items-center ${rtlEnabled ? "space-x-reverse" : ""} space-x-2`}>
                    <Avatar>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name ? profile.full_name.slice(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{profile.full_name || getAppTranslation("unnamed_user")}</span>
                  </div>
                </TableCell>
                <TableCell>{profile.email || getAppTranslation("not_available")}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {profile.role === "manager"
                      ? getAppTranslation("role_manager")
                      : profile.role === "admin"
                        ? getAppTranslation("role_admin")
                        : getAppTranslation("role_cashier")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getAppTranslation("active")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{getAppTranslation("open_menu")}</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{getAppTranslation("actions")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEditClick(profile)}>
                        <Pencil className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                        {getAppTranslation("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteClick(profile)}>
                        <Trash className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                        {getAppTranslation("delete")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>{getAppTranslation("view_profile")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>
              {getAppTranslation("total")} {filteredProfiles.length} {getAppTranslation("users")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("add_new_user")}</DialogTitle>
            <DialogDescription>{getAppTranslation("add_user_description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {getAppTranslation("email")}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                {getAppTranslation("username")}
              </Label>
              <Input
                id="username"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {getAppTranslation("password")}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            {hasFullNameColumn && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">
                  {getAppTranslation("full_name")}
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={newUser.full_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {getAppTranslation("role")}
              </Label>
              <Select
                name="role"
                value={newUser.role}
                onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={getAppTranslation("select_role")} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              {getAppTranslation("cancel")}
            </Button>
            <Button onClick={handleAddUser} disabled={isProcessing || !newUser.email}>
              {isProcessing ? (
                <>
                  <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                  {getAppTranslation("processing")}
                </>
              ) : (
                getAppTranslation("add_user")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_user")}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_user_description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                {getAppTranslation("email")}
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleInputChange}
                className="col-span-3"
                disabled // Email can't be changed directly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                {getAppTranslation("username")}
              </Label>
              <Input
                id="edit-username"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            {hasFullNameColumn && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-full_name" className="text-right">
                  {getAppTranslation("full_name")}
                </Label>
                <Input
                  id="edit-full_name"
                  name="full_name"
                  value={newUser.full_name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                {getAppTranslation("role")}
              </Label>
              <Select
                name="role"
                value={newUser.role}
                onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={getAppTranslation("select_role")} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
              {getAppTranslation("cancel")}
            </Button>
            <Button onClick={handleEditUser} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                  {getAppTranslation("processing")}
                </>
              ) : (
                getAppTranslation("save_changes")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("confirm_delete")}</DialogTitle>
            <DialogDescription>
              {getAppTranslation("delete_user_confirmation")}{" "}
              {selectedUser?.full_name || selectedUser?.email || selectedUser?.id}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
              {getAppTranslation("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                  {getAppTranslation("processing")}
                </>
              ) : (
                getAppTranslation("delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsersPage

