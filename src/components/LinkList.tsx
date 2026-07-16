import { useLinks } from '../hooks/useLinks'
import { LinkButton } from './LinkButton'

export function LinkList() {
  const links = useLinks()

  return (
    <ul className="flex w-full flex-col gap-3">
      {links.map((link) => (
        <li key={link.id}>
          <LinkButton {...link} />
        </li>
      ))}
    </ul>
  )
}
