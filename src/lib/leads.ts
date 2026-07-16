import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { getUtmSource } from './analytics'

interface SubmitLeadInput {
  email: string
}

export async function submitLead({ email }: SubmitLeadInput) {
  await addDoc(collection(db, 'leads'), {
    email,
    source_utm: getUtmSource(),
    timestamp: serverTimestamp(),
  })
}
