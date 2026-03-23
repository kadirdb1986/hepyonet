"use client"

import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-bright border-b border-outline-variant/15">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-xl">restaurant_menu</span>
            </div>
            <span className="font-headline font-black text-xl tracking-tight text-on-surface">HepYonet</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Giriş Yap
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
          Gizlilik Politikası
        </h1>
        <p className="text-sm text-on-surface-variant mb-10">
          Son güncelleme: 1 Ocak 2025
        </p>

        <div className="space-y-8 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              1. Genel Bakış
            </h2>
            <p>
              HepYonet olarak, kullanıcılarımızın gizliliğine büyük önem veriyoruz.
              Bu gizlilik politikası, hizmetlerimizi kullanırken toplanan, işlenen ve
              saklanan kişisel verileriniz hakkında sizi bilgilendirmek amacıyla
              hazırlanmıştır.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              2. Toplanan Veriler
            </h2>
            <p className="mb-3">
              Hizmetlerimizi sağlamak için aşağıdaki kişisel verileri topluyoruz:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Ad, soyad ve e-posta adresi</li>
              <li>Restoran bilgileri (ad, adres, telefon)</li>
              <li>Personel kayıtları ve iletişim bilgileri</li>
              <li>Finansal veriler (ciro, gider kayıtları)</li>
              <li>Stok ve ürün bilgileri</li>
              <li>Menü verileri</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              3. Verilerin Kullanım Amacı
            </h2>
            <p className="mb-3">Toplanan veriler aşağıdaki amaçlarla kullanılmaktadır:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Restoran yönetim hizmetlerinin sağlanması</li>
              <li>Finansal raporlama ve analiz</li>
              <li>Personel yönetimi ve takibi</li>
              <li>Stok ve menü yönetimi</li>
              <li>Kullanıcı hesap yönetimi ve güvenliği</li>
              <li>Hizmet kalitesinin artırılması</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              4. Veri Güvenliği
            </h2>
            <p>
              Verileriniz, endüstri standardı güvenlik önlemleriyle korunmaktadır.
              SSL/TLS şifreleme, güvenli sunucu altyapısı ve düzenli güvenlik
              denetimleri ile verilerinizin güvenliğini sağlıyoruz. Yetkisiz erişim,
              değişiklik, ifşa veya imhaya karşı teknik ve idari önlemler alıyoruz.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              5. Veri Saklama Süresi
            </h2>
            <p>
              Kişisel verileriniz, hizmet sağlama amacının gerektirdiği süre boyunca
              ve yasal yükümlülüklerimiz kapsamında saklanır. Hesabınızı sildiğinizde,
              kişisel verileriniz makul bir süre içinde sistemlerimizden kaldırılır.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              6. Üçüncü Taraf Paylaşımı
            </h2>
            <p>
              Kişisel verileriniz, yasal zorunluluklar haricinde üçüncü taraflarla
              paylaşılmaz. Hizmet altyapımız için kullandığımız üçüncü taraf
              sağlayıcılar (hosting, veritabanı) ile yalnızca hizmet sağlama amacıyla
              veri paylaşımı yapılabilir.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              7. Çerezler
            </h2>
            <p>
              Web sitemizde oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla
              çerezler kullanılmaktadır. Tarayıcı ayarlarınızdan çerez tercihlerinizi
              yönetebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              8. Kullanıcı Hakları
            </h2>
            <p className="mb-3">6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme</li>
              <li>Kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              9. İletişim
            </h2>
            <p>
              Gizlilik politikamız hakkında sorularınız veya talepleriniz için
              bizimle <span className="font-semibold text-on-surface">info@hepyonet.com</span> adresinden
              iletişime geçebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-3">
              10. Değişiklikler
            </h2>
            <p>
              Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler
              yapıldığında kullanıcılarımız e-posta yoluyla bilgilendirilecektir.
              Güncel politikayı bu sayfadan takip edebilirsiniz.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/15 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-md flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-sm">restaurant_menu</span>
            </div>
            <span className="font-headline font-bold text-sm text-on-surface">HepYonet</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            &copy; {new Date().getFullYear()} HepYonet. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  )
}
