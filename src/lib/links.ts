import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type FirestoreError,
} from 'firebase/firestore'
import { db } from './firebase'
import type { LinkItem } from '../types/link'

const linksQuery = query(
  collection(db, 'links'),
  where('active', '==', true),
  orderBy('order', 'asc'),
)

export function subscribeToLinks(
  onData: (links: LinkItem[]) => void,
  onError: (error: FirestoreError) => void,
) {
  return onSnapshot(
    linksQuery,
    (snapshot) => {
      const links = snapshot.docs.map((doc) => {
        const data = doc.data()
        const createdAt = data.createdAt

        return {
          id: doc.id,
          title: data.title,
          subtitle: data.subtitle,
          url: data.url,
          icon: data.icon,
          order: data.order,
          active: data.active,
          createdAt: createdAt instanceof Timestamp ? createdAt.toDate() : null,
        } satisfies LinkItem
      })

      onData(links)
    },
    onError,
  )
}
