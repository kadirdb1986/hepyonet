'use client';

import { useTranslations } from 'next-intl';
import { MonthlyReport } from '@/components/reports/monthly-report';
import { WeeklyReport } from '@/components/reports/weekly-report';
import { ComparisonReport } from '@/components/reports/comparison-report';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CalendarRange, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const t = useTranslations('reports');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">Aylık ve haftalık finansal raporlarınızı görüntüleyin, düzenleyin ve çıktı alın.</p>
      </div>
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Aylık
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" /> Haftalık
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Karşılaştırma
          </TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-6">
          <MonthlyReport />
        </TabsContent>
        <TabsContent value="weekly" className="mt-6">
          <WeeklyReport />
        </TabsContent>
        <TabsContent value="comparison" className="mt-6">
          <ComparisonReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
