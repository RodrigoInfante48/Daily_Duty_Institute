import { ProfileHeader } from './components/ProfileHeader'
import { LinkList } from './components/LinkList'

function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center gap-space-lg px-space-md py-space-2xl">
      <ProfileHeader />
      <LinkList />
    </main>
  )
}

export default App
