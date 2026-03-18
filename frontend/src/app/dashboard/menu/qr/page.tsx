'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import { toast } from 'sonner';

export default function QRMenuPage() {
  const t = useTranslations('menu');
  const { activeMembership } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const slug = activeMembership?.restaurantSlug || '';
  const frontendUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin)
    : '';
  const menuUrl = `${frontendUrl}/m/${slug}`;

  useEffect(() => {
    if (!slug || !frontendUrl) return;

    QRCode.toDataURL(menuUrl, {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl);

    QRCode.toString(menuUrl, {
      type: 'svg',
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then(setQrSvg);
  }, [slug, menuUrl, frontendUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `${slug}-qr-menu.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleDownloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${slug}-qr-menu.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast.success(t('qr.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopyalanamadi');
    }
  };

  if (!slug) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground">Restoran bilgisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/menu">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('qr.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('qr.description')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-5 w-5" />
              QR Kod
            </CardTitle>
            <CardDescription>{t('qr.scanToView')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            {qrDataUrl ? (
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <img src={qrDataUrl} alt="QR Menu Code" className="w-64 h-64" />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">Oluşturuluyor...</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleDownloadPng} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t('qr.downloadPng')}
              </Button>
              <Button onClick={handleDownloadSvg} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t('qr.downloadSvg')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('qr.menuUrl')}</CardTitle>
            <CardDescription>Bu adresi musterilerinizle paylasabilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input value={menuUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-3">
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('qr.openInNewTab')}
                </Button>
              </a>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <p className="text-sm text-muted-foreground font-mono truncate">{menuUrl}</p>
              </div>
              <div className="relative" style={{ paddingBottom: '150%' }}>
                <iframe
                  src={menuUrl}
                  className="absolute inset-0 w-full h-full"
                  title={t('qr.preview')}
                  style={{
                    transform: 'scale(0.75)',
                    transformOrigin: 'top left',
                    width: '133.33%',
                    height: '133.33%',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
