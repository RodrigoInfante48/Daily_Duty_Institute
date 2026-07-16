import { ProfileHeader } from './components/ProfileHeader'
import { LinkList } from './components/LinkList'

function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center gap-8 px-6 py-16">
      <ProfileHeader />
      <LinkList />
    </main>
  )
}

export default App
