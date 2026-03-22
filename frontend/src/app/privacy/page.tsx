import { Metadata } from 'next';
import { UtensilsCrossed } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası - HepYonet',
  description: 'HepYonet Restoran Yönetim Sistemi gizlilik politikası.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <nav className="flex items-center gap-3 px-6 py-4 max-w-4xl mx-auto">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <UtensilsCrossed className="size-6" />
          </div>
          <h1 className="font-headline font-extrabold text-primary text-xl tracking-tight">HepYonet</h1>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-headline font-extrabold text-3xl text-primary mb-2">Gizlilik Politikası</h1>
        <p className="text-muted-foreground text-sm mb-10">Son güncelleme: 22 Mart 2026</p>

        <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">1. Genel Bakış</h2>
            <p>
              HepYonet (&quot;biz&quot;, &quot;bizim&quot; veya &quot;Platform&quot;), restoran sahipleri ve yöneticileri için geliştirilmiş bir
              restoran yönetim sistemidir. Bu gizlilik politikası, platformumuz aracılığıyla topladığımız, kullandığımız ve
              koruduğumuz kişisel verileri açıklamaktadır.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">2. Topladığımız Veriler</h2>
            <p className="mb-3">Platformumuzu kullanırken aşağıdaki bilgileri toplayabiliriz:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Hesap Bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası.</li>
              <li><strong>İşletme Bilgileri:</strong> Restoran adı, adresi, iletişim bilgileri, menü verileri, stok ve finans verileri.</li>
              <li><strong>Üçüncü Taraf Entegrasyon Verileri:</strong> Google İşletme Profili verileri (işletme bilgileri, performans metrikleri, yorumlar), Meta/Facebook verileri (reklam harcamaları, Instagram istatistikleri) — yalnızca kullanıcının açık izni ile.</li>
              <li><strong>Kullanım Verileri:</strong> Platform üzerindeki etkileşimler, giriş bilgileri, tarayıcı ve cihaz bilgileri.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">3. Verilerin Kullanım Amacı</h2>
            <p className="mb-3">Topladığımız verileri şu amaçlarla kullanıyoruz:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Platform hizmetlerinin sunulması ve iyileştirilmesi.</li>
              <li>Restoran yönetimi araçlarının sağlanması (finans, stok, personel, menü yönetimi).</li>
              <li>Üçüncü taraf platformlardan (Google, Meta) veri çekerek işletme performans raporlarının oluşturulması.</li>
              <li>Kullanıcı desteği sağlanması.</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">4. Üçüncü Taraf Entegrasyonlar</h2>
            <p className="mb-3">
              Platformumuz, kullanıcıların izniyle aşağıdaki üçüncü taraf hizmetlerle entegre çalışabilir:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Business Profile API:</strong> İşletme bilgileri, performans metrikleri ve müşteri yorumlarına erişim.
                Kullanıcı OAuth 2.0 ile yetkilendirme yapar ve istediği zaman erişimi iptal edebilir.
              </li>
              <li>
                <strong>Meta (Facebook/Instagram) API:</strong> Reklam harcamaları ve Instagram istatistiklerine erişim.
                Kullanıcı Facebook Login ile yetkilendirme yapar ve istediği zaman erişimi iptal edebilir.
              </li>
            </ul>
            <p className="mt-3">
              Bu entegrasyonlar aracılığıyla elde edilen veriler yalnızca ilgili kullanıcının hesabında görüntülenir ve üçüncü taraflarla paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">5. Veri Güvenliği</h2>
            <p>
              Kişisel verilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz. Tüm veri iletişimi SSL/TLS
              şifreleme ile korunmaktadır. Şifreler hash algoritmaları ile saklanmakta olup düz metin olarak tutulmamaktadır.
              Erişim yetkilendirme JWT tabanlı kimlik doğrulama ve rol bazlı erişim kontrolü ile yönetilmektedir.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">6. Veri Paylaşımı</h2>
            <p className="mb-3">Kişisel verilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmayız:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Yasal zorunluluk halinde (mahkeme kararı, yasal talep).</li>
              <li>Platform hizmetlerinin sağlanması için gerekli teknik altyapı sağlayıcıları ile (sunucu, veritabanı barındırma).</li>
              <li>Kullanıcının açık rızası ile.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">7. Kullanıcı Hakları</h2>
            <p className="mb-3">KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kişisel verilerinize erişim talep etme.</li>
              <li>Verilerinizin düzeltilmesini veya silinmesini isteme.</li>
              <li>Veri işleme faaliyetlerine itiraz etme.</li>
              <li>Üçüncü taraf entegrasyon izinlerini istediğiniz zaman iptal etme.</li>
              <li>Hesabınızı ve tüm verilerinizi silme.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">8. Çerezler</h2>
            <p>
              Platformumuz, oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanmaktadır.
              Kimlik doğrulama token&apos;ları tarayıcı yerel depolama alanında saklanmaktadır.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">9. Veri Saklama Süresi</h2>
            <p>
              Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesap silinmesi durumunda verileriniz
              yasal saklama yükümlülükleri saklı kalmak kaydıyla 30 gün içinde silinir.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">10. Değişiklikler</h2>
            <p>
              Bu gizlilik politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler yapıldığında kullanıcılarımızı
              e-posta veya platform üzerinden bilgilendireceğiz.
            </p>
          </section>

          <section>
            <h2 className="font-headline font-bold text-lg text-primary mb-3">11. İletişim</h2>
            <p>
              Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <p className="mt-2">
              <strong>E-posta:</strong> info@hepyonet.com<br />
              <strong>Platform:</strong> HepYonet Restoran Yönetim Sistemi
            </p>
          </section>
        </div>
      </main>

      <footer className="mt-12 pt-8 border-t border text-center pb-8">
        <p className="font-headline font-bold text-sm tracking-widest uppercase text-muted-foreground">
          &copy; {new Date().getFullYear()} HepYonet
        </p>
      </footer>
    </div>
  );
}
