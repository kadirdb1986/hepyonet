import { notFound } from "next/navigation"
import { PublicMenuClient } from "./client"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/menu/public/${slug}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return { title: "Menu Bulunamadi" }
    const data = await res.json()
    return {
      title: `${data.restaurant.name} - Menu`,
      description: `${data.restaurant.name} menusu`,
    }
  } catch {
    return { title: "Menu" }
  }
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/menu/public/${slug}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) notFound()
    const data = await res.json()
    return <PublicMenuClient data={data} />
  } catch {
    notFound()
  }
}
