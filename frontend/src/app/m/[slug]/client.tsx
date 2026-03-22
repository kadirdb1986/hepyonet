'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UtensilsCrossed } from 'lucide-react';

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

function formatPrice(price: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  })
    .format(parseFloat(price))
    .replace('TRY', '₺')
    .trim();
}

export function PublicMenuClient({ data }: { data: PublicMenuData }) {
  const { restaurant, categories } = data;
  const [activeCategory, setActiveCategory] = useState<string>(
    categories.length > 0 ? categories[0].name : '',
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isClickScrolling = useRef(false);

  // Update active category pill based on scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const name = entry.target.getAttribute('data-category');
            if (name) setActiveCategory(name);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );

    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [categories]);

  // Scroll the active pill into view in the nav bar
  useEffect(() => {
    const pill = pillRefs.current[activeCategory];
    if (pill && navRef.current) {
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCategory]);

  const handleCategoryClick = useCallback((name: string) => {
    setActiveCategory(name);
    const el = sectionRefs.current[name];
    if (el) {
      isClickScrolling.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-sm">
        <nav className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {restaurant.logo ? (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <UtensilsCrossed className="size-6" />
              </div>
            )}
            <h1 className="font-headline font-extrabold text-primary text-xl tracking-tight">
              {restaurant.name} Menü
            </h1>
          </div>
        </nav>
      </header>

      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4 md:px-8">
        {/* Category Navigation */}
        {categories.length > 0 && (
          <div
            className="sticky top-[72px] z-40 -mx-4 px-4 py-4 mb-8 backdrop-blur-[12px] bg-background/85 shadow-sm overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]"
            ref={navRef}
          >
            <div className="flex gap-4 min-w-max">
              {categories.map((category) => (
                <button
                  key={category.name}
                  ref={(el) => { pillRefs.current[category.name] = el; }}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`px-6 py-2.5 rounded-full font-headline font-bold text-sm transition-all active:scale-95 ${
                    activeCategory === category.name
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menu Content - All categories */}
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Menü henüz hazırlanmamış.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((category, index) => (
              <section
                key={category.name}
                data-category={category.name}
                ref={(el) => { sectionRefs.current[category.name] = el; }}
                className="scroll-mt-36"
              >
                {/* Divider between categories */}
                {index > 0 && (
                  <div className="h-px bg-border/30 mb-10" />
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.items.map((product) => (
                    <div
                      key={product.id}
                      className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col group"
                    >
                      {/* Image */}
                      {product.image && (
                        <div className="relative h-64 overflow-hidden">
                          <img
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            src={product.image}
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-headline font-bold text-xl text-foreground">
                            {product.name}
                          </h3>
                          {product.code && (
                            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-md ml-2 whitespace-nowrap">
                              {product.code}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-muted-foreground text-sm mb-6 flex-grow">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-headline font-extrabold text-2xl text-primary">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 pt-12 border-t border text-center pb-8">
        <p className="font-headline font-bold text-sm tracking-widest uppercase text-muted-foreground">
          &copy; {new Date().getFullYear()} {restaurant.name}
        </p>
        <div className="mt-4">
          <a
            className="text-muted-foreground text-[10px] tracking-wide uppercase hover:text-primary transition-colors"
            href="https://hepyonet.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            HepYonet ile oluşturuldu
          </a>
        </div>
      </footer>
    </div>
  );
}
