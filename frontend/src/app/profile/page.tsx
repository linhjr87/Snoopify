import { apiFetch, orRedirect } from '../../lib/api-server'
import type { ProfileOut } from '../../lib/api-types'
import ProfileScreen from '../../features/profile/ProfileScreen'

export default async function ProfilePage() {
  const profile = await apiFetch<ProfileOut>('/profile').catch(orRedirect(null))
  if (!profile) return null
  return <ProfileScreen profile={profile} />
}
