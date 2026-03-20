import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PublicMenuClient } from './client';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image: string | null;
  price: string;
}

interface Category {
  name: string;
  items: Product[];
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
}

interface PublicMenuData {
  restaurant: Restaurant;
  categories: Category[];
}

async function getMenuData(slug: string): Promise<PublicMenuData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  try {
    const res = await fetch(`${apiUrl}/menu/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMenuData(slug);
  if (!data) {
    return { title: 'Menu Bulunamadi' };
  }
  return {
    title: `${data.restaurant.name} - Menü`,
    description: `${data.restaurant.name} restoran menüsü. Lezzetli yemeklerimizi inceleyin.`,
    openGraph: {
      title: `${data.restaurant.name} - Menü`,
      description: `${data.restaurant.name} restoran menüsü`,
      ...(data.restaurant.logo ? { images: [data.restaurant.logo] } : {}),
    },
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getMenuData(slug);

  if (!data) {
    notFound();
  }

  return <PublicMenuClient data={data} />;
}
