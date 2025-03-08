"use client"

import { useUser } from "@/components/auth/user-provider"

export function DebugUser() {
  const { user, profile, isAdmin, isLoading } = useUser()

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-md max-w-xs z-50 text-xs">
      <h3 className="font-bold mb-2">User Debug Info</h3>
      <p>User ID: {user?.id || "Not logged in"}</p>
      <p>Profile: {profile ? "Loaded" : "Not loaded"}</p>
      <p>Role: {profile?.role || "None"}</p>
      <p>Is Admin: {isAdmin ? "Yes" : "No"}</p>
      <p>Loading: {isLoading ? "Yes" : "No"}</p>
    </div>
  )
}

