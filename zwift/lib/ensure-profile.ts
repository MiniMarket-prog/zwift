export async function ensureProfile() {
    try {
      const response = await fetch("/api/ensure-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        console.error("Error ensuring profile:", data.error)
        return null
      }
  
      return data.profile
    } catch (error) {
      console.error("Error ensuring profile:", error)
      return null
    }
  }
  
  