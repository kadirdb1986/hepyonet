'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MonthlyReport } from '@/components/reports/monthly-report';
import { WeeklyReport } from '@/components/reports/weekly-report';
import { ComparisonReport } from '@/components/reports/comparison-report';
import { CalendarDays, CalendarRange, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly' | 'comparison'>('monthly');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">Aylik ve haftalik finansal raporlarinizi goruntuleyin, duzenleyin ve cikti alin.</p>
      </div>
      <div className="flex gap-1 border-b">
        <button onClick={() => setActiveTab('monthly')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'monthly' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <CalendarDays className="h-4 w-4" /> Aylik
        </button>
        <button onClick={() => setActiveTab('weekly')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'weekly' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <CalendarRange className="h-4 w-4" /> Haftalik
        </button>
        <button onClick={() => setActiveTab('comparison')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comparison' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <BarChart3 className="h-4 w-4" /> Karsilastirma
        </button>
      </div>
      <div className="mt-6">
        {activeTab === 'monthly' && <MonthlyReport />}
        {activeTab === 'weekly' && <WeeklyReport />}
        {activeTab === 'comparison' && <ComparisonReport />}
      </div>
    </div>
  );
}
