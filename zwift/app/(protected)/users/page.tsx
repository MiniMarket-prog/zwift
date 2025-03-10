"use client"

import { useEffect, useState } from "react"
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
import { MoreVertical, Pencil, Trash, Loader2 } from "lucide-react"
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

// Define the type to match what comes from the database
type Profile = {
  id: string
  updated_at: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  website: string | null
  email?: string | null
}

const UsersPage = () => {
  const [profilesData, setProfilesData] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
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
            title: "Error",
            description: "Failed to fetch profiles.",
            variant: "destructive",
          })
          return
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

              // Add emails to profiles
              const profilesWithEmail = profiles?.map((profile) => ({
                ...profile,
                email: userMap.get(profile.id) || null,
              })) as Profile[]

              setProfilesData(profilesWithEmail || [])
            } else {
              setProfilesData(profiles || [])
            }
          } else {
            // If API call fails, just use the profiles as is
            setProfilesData(profiles || [])
          }
        } catch (error) {
          console.error("Error fetching user emails:", error)
          // Still set the profiles even if we can't get emails
          setProfilesData(profiles || [])
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, toast, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <Table>
        <TableCaption>A list of your registered users.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profilesData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            profilesData.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile.username ? profile.username.slice(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{profile.full_name || "Unnamed User"}</span>
                  </div>
                </TableCell>
                <TableCell>{profile.username || "N/A"}</TableCell>
                <TableCell>{profile.email || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant="outline">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>Total {profilesData.length} users</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export default UsersPage

