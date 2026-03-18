import { notFound } from 'next/navigation';
import { Metadata } from 'next';

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

function formatPrice(price: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(parseFloat(price));
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

  const { restaurant, categories } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-amber-200 shadow-sm"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-white text-xl font-bold">
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              {restaurant.address && (
                <p className="text-sm text-gray-500">{restaurant.address}</p>
              )}
              {restaurant.phone && (
                <p className="text-sm text-gray-500">{restaurant.phone}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      {categories.length > 1 && (
        <nav className="bg-white border-b sticky top-[72px] z-10">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex overflow-x-auto gap-1 py-2" style={{ scrollbarWidth: 'none' }}>
              {categories.map((category) => (
                <a
                  key={category.name}
                  href={`#category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors whitespace-nowrap"
                >
                  {category.name}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Menu Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Menu henuz hazirlanmamis.</p>
          </div>
        ) : (
          categories.map((category) => (
            <section
              key={category.name}
              id={`category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="scroll-mt-32"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-300 to-transparent" />
                <h2 className="text-lg font-bold text-gray-800 px-2">{category.name}</h2>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-300 to-transparent" />
              </div>

              <div className="space-y-3">
                {category.items.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex">
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            {product.code && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-500 rounded">
                                {product.code}
                              </span>
                            )}
                          </div>
                        </div>
                        {product.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <p className="mt-3 text-lg font-bold text-amber-700">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      {product.image && (
                        <div className="flex-shrink-0 w-28 h-28 m-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-400">
            {restaurant.name} &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-gray-300 mt-1">HepYonet ile oluşturuldu</p>
        </div>
      </footer>
    </div>
  );
}
