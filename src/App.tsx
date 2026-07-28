import { useEffect } from 'react'
import { LiquidBackground } from './components/LiquidBackground'
import { ProfileHeader } from './components/ProfileHeader'
import { LinkList } from './components/LinkList'
import { trackPageView } from './lib/analytics'

function App() {
  useEffect(() => {
    trackPageView()
  }, [])

  return (
    <>
      <LiquidBackground />
      <main className="relative z-10 mx-auto flex min-h-svh w-full max-w-md flex-col items-center gap-space-lg px-space-md py-space-2xl">
        <ProfileHeader />
        <LinkList />
      </main>
    </>
  )
}

export default App
