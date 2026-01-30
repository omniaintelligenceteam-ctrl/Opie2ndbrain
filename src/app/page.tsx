import { getAllDocuments, getCategories, getRecentJournals } from '../lib/documents'
import ClientApp from '../components/ClientApp'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Home() {
  const documents = getAllDocuments()
  const categories = getCategories()
  const recentJournals = getRecentJournals()

  return (
    <ClientApp 
      initialDocuments={documents}
      categories={categories}
      recentJournals={recentJournals}
    />
  )
}
