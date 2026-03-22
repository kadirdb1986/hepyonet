# shadcn/ui Tutarlilik Migrasyonu - Implementasyon Plani

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projedeki tum custom HTML `<select>`, `<input type="checkbox">` ve `<table>` elementlerini shadcn/ui componentleri ile degistirerek tutarli bir UI saglamak.

**Architecture:** Her dosya tek tek guncellenir. HTML `<select>` -> shadcn `Select`, HTML `<input checkbox>` -> shadcn `Checkbox`, HTML `<table>` -> shadcn `Table`. Radix Select bos string (`""`) value desteklemez; placeholder secenekleri icin `SelectValue placeholder` kullanilir, "Kategorisiz" gibi secenekler icin `"none"` sentinel degeri kullanilir.

**Tech Stack:** shadcn/ui (radix-nova), Radix UI Select/Checkbox/Table primitives, Tailwind CSS v4

---

## Onemli Notlar

### shadcn Select vs HTML select Farklari

```tsx
// ONCE: HTML select
<select value={val} onChange={(e) => setVal(e.target.value)}>
  <option value="">Secin...</option>
  <option value="a">A</option>
</select>

// SONRA: shadcn Select
<Select value={val} onValueChange={setVal}>
  <SelectTrigger>
    <SelectValue placeholder="Secin..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">A</SelectItem>
  </SelectContent>
</Select>
```

**Kritik farklar:**
1. `onChange` -> `onValueChange` (dogrudan value doner, event degil)
2. `<option>` -> `<SelectItem>`
3. Bos deger (`""`) placeholder olarak `<SelectValue placeholder="...">` ile gosterilir
4. `<SelectItem value="">` desteklenmez - "Kategorisiz" gibi valid bos secenekler icin `value="none"` kullanilir ve state handler'da donusturulur
5. `required` prop'u Radix Select'te desteklenir — orijinal kodda `required` olan select'lerde `<Select required>` kullanilir

### shadcn Checkbox vs HTML checkbox

```tsx
// ONCE
<input type="checkbox" checked={val} onChange={(e) => setVal(e.target.checked)} />

// SONRA
<Checkbox checked={val} onCheckedChange={setVal} />
```

### Import Satiri (Select)
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

### Table: Cift overflow-x-auto Sarmalama

shadcn `Table` componenti kendi icinde `<div className="relative w-full overflow-x-auto">` wrapper'i olusturur. Mevcut kodda tablolari saran `<div className="overflow-x-auto">` wrapper'lari varsa, bunlar **kaldirilmalidir** yoksa cift sarmalama olur.

```tsx
// YANLIS: Cift wrapper
<div className="overflow-x-auto">  {/* BU KALDIRILMALI */}
  <Table>...</Table>
</div>

// DOGRU: shadcn Table kendi wrapper'ini ekler
<Table>...</Table>
```

---

## Dosya Yapisi

Tum degisiklikler mevcut dosyalarda yapilacak. Yeni dosya olusturulmayacak.

**Degistirilecek dosyalar:**

| Dosya | Select | Checkbox | Table |
|-------|:------:|:--------:|:-----:|
| `src/app/dashboard/products/new/page.tsx` | 1 | 1 | - |
| `src/app/dashboard/products/[id]/page.tsx` | 5 | 1 | - |
| `src/app/dashboard/finance/expenses/page.tsx` | 3 | - | 1 |
| `src/app/dashboard/finance/distribute/page.tsx` | - | - | 2 |
| `src/app/dashboard/finance/page.tsx` | - | - | 1 |
| `src/app/dashboard/simulation/page.tsx` | 1 | - | - |
| `src/app/dashboard/inventory/suppliers/page.tsx` | 2 | - | - |
| `src/app/dashboard/inventory/movements/page.tsx` | 2 | - | - |
| `src/app/dashboard/personnel/new/page.tsx` | 1 | - | - |
| `src/app/dashboard/personnel/[id]/page.tsx` | 2 | - | - |
| `src/app/dashboard/inventory/page.tsx` | - | - | 1 |
| `src/app/dashboard/finance/revenues/page.tsx` | - | - | 1 |
| `src/components/reports/monthly-report.tsx` | 1 | - | - |
| `src/components/reports/weekly-report.tsx` | 1 | - | - |
| `src/components/reports/comparison-report.tsx` | 1 | - | - |

---

### Task 1: Products - Yeni Urun Sayfasi

**Files:**
- Modify: `frontend/src/app/dashboard/products/new/page.tsx`

- [ ] **Step 1: Import ekle**

Dosyanin import bolumune shadcn Select ve Checkbox import'lari ekle:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 2: Kategori select'ini degistir (satir ~107-116)**

Mevcut:
```tsx
<select
  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  value={form.categoryId}
  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
>
  <option value="">Kategorisiz</option>
  {categories.map((c) => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>
```

Yeni:
```tsx
<Select
  value={form.categoryId || "none"}
  onValueChange={(value) => setForm({ ...form, categoryId: value === "none" ? "" : value })}
>
  <SelectTrigger>
    <SelectValue placeholder="Kategorisiz" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Kategorisiz</SelectItem>
    {categories.map((c) => (
      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Checkbox'i degistir (satir ~139-147)**

Mevcut:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={form.isMenuItem}
    onChange={(e) => setForm({ ...form, isMenuItem: e.target.checked })}
    className="rounded border-input"
  />
  <span className="text-sm font-medium">Menude Goster</span>
</label>
```

Yeni:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <Checkbox
    checked={form.isMenuItem}
    onCheckedChange={(checked) => setForm({ ...form, isMenuItem: checked === true })}
  />
  <span className="text-sm font-medium">Menude Goster</span>
</label>
```

- [ ] **Step 4: Dev server'da test et**

Run: `cd frontend && npm run dev`
Sayfayi ac: `/dashboard/products/new`
- Kategori select'inin acildigini ve secim yapilabildigini dogrula
- Checkbox'in calistigini dogrula
- Form submit'in dogru calistigini dogrula

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/products/new/page.tsx
git commit -m "refactor: replace custom select and checkbox with shadcn/ui in products/new"
```

---

### Task 2: Products - Urun Detay Sayfasi

**Files:**
- Modify: `frontend/src/app/dashboard/products/[id]/page.tsx`

- [ ] **Step 1: Select import'unu ekle**

Dosyanin import bolumune ekle (Checkbox zaten import edilmis olabilir, kontrol et):
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 2: Edit form kategori select'ini degistir (satir ~335-344)**

Yeni:
```tsx
<Select
  value={form.categoryId || "none"}
  onValueChange={(value) => setForm({ ...form, categoryId: value === "none" ? "" : value })}
>
  <SelectTrigger>
    <SelectValue placeholder="Kategorisiz" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Kategorisiz</SelectItem>
    {categories.map((c) => (
      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Checkbox'i degistir (satir ~362-370)**

Yeni:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <Checkbox
    checked={form.isMenuItem}
    onCheckedChange={(checked) => setForm({ ...form, isMenuItem: checked === true })}
  />
  <span className="text-sm">Menude Goster</span>
</label>
```

- [ ] **Step 4: Icerik tipi select'ini degistir (satir ~597-604)**

Yeni:
```tsx
<Select value={ingredientType} onValueChange={(value) => setIngredientType(value as 'raw' | 'sub')}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="raw">Stok Kalemi</SelectItem>
    <SelectItem value="sub">Alt Urun</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 5: Stok kalemi select'ini degistir (satir ~610-628)**

Yeni:
```tsx
<Select
  value={ingredientForm.rawMaterialId || ""}
  onValueChange={(value) => {
    const rmId = value;
    const rm = rawMaterials.find((m) => m.id === rmId);
    const compatible = rm ? (COMPATIBLE_UNITS[rm.unit.toUpperCase()] || [rm.unit]) : UNITS as unknown as string[];
    const newUnit = rm && !compatible.includes(ingredientForm.unit) ? compatible[0] : ingredientForm.unit;
    setIngredientForm({ ...ingredientForm, rawMaterialId: rmId, unit: newUnit });
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Stok kalemi secin..." />
  </SelectTrigger>
  <SelectContent>
    {rawMaterials.map((m) => (
      <SelectItem key={m.id} value={m.id}>
        {m.name} ({UNIT_LABELS[m.unit] || m.unit}) - {formatCurrency(Number(m.lastPurchasePrice))} TL/{m.unit}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 6: Alt urun select'ini degistir (satir ~633-645)**

Yeni:
```tsx
<Select
  value={ingredientForm.subProductId || ""}
  onValueChange={(value) => setIngredientForm({ ...ingredientForm, subProductId: value })}
>
  <SelectTrigger>
    <SelectValue placeholder="Urun secin..." />
  </SelectTrigger>
  <SelectContent>
    {otherProducts.map((p) => (
      <SelectItem key={p.id} value={p.id}>
        {p.name} {p.calculatedCost != null ? `- ${formatCurrency(Number(p.calculatedCost))} TL` : ''}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 7: Birim select'ini degistir (satir ~663-680)**

Yeni:
```tsx
<Select
  value={ingredientForm.unit}
  onValueChange={(value) => setIngredientForm({ ...ingredientForm, unit: value })}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {(() => {
      if (ingredientType === 'raw' && ingredientForm.rawMaterialId) {
        const rm = rawMaterials.find((m) => m.id === ingredientForm.rawMaterialId);
        const compatible = rm ? (COMPATIBLE_UNITS[rm.unit.toUpperCase()] || [rm.unit]) : (UNITS as unknown as string[]);
        return compatible.map((u) => (
          <SelectItem key={u} value={u}>{UNIT_LABELS[u] || u}</SelectItem>
        ));
      }
      return UNITS.map((u) => (
        <SelectItem key={u} value={u}>{UNIT_LABELS[u]}</SelectItem>
      ));
    })()}
  </SelectContent>
</Select>
```

- [ ] **Step 8: Test et ve commit**

Sayfayi ac: `/dashboard/products/[herhangi-bir-id]`
- Edit form'daki kategori ve checkbox'i test et
- Icerik ekle dialog'undaki tum select'leri test et

```bash
git add frontend/src/app/dashboard/products/\[id\]/page.tsx
git commit -m "refactor: replace custom selects and checkbox with shadcn/ui in products/[id]"
```

---

### Task 3: Finans - Giderler Sayfasi (Select + Table)

**Files:**
- Modify: `frontend/src/app/dashboard/finance/expenses/page.tsx`

- [ ] **Step 1: Import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] **Step 2: selectClass sabitini sil (satir ~55)**

`const selectClass = '...'` satirini tamamen kaldir.

- [ ] **Step 3: categorySelect fonksiyonunu degistir (satir ~231-244)**

Mevcut:
```tsx
const categorySelect = (id: string) => (
  <select id={id} className={selectClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
    <option value="">Kategori secin...</option>
    {categories.map((cat) => (
      <option key={cat.id} value={cat.name}>{cat.name}</option>
    ))}
  </select>
);
```

Yeni:
```tsx
const categorySelect = (id: string) => (
  <Select value={form.category || ""} onValueChange={(value) => setForm({ ...form, category: value })}>
    <SelectTrigger id={id}>
      <SelectValue placeholder="Kategori secin..." />
    </SelectTrigger>
    <SelectContent>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
```

- [ ] **Step 4: Donem tipi select'ini degistir (satir ~382-385)**

Yeni:
```tsx
<Select value={form.periodType} onValueChange={(value) => setForm({ ...form, periodType: value as PeriodType })}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="SAME_MONTH">Ayni Ay (odeme tarihi)</SelectItem>
    <SelectItem value="DIFFERENT_MONTH">Farkli Ay</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 5: Filtre category select'ini degistir (satir ~449-458)**

Yeni:
```tsx
<Select value={filterCategory} onValueChange={setFilterCategory}>
  <SelectTrigger className="w-40">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">Tumu</SelectItem>
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 6: Dis `overflow-x-auto` wrapper'i kaldir ve HTML table'i shadcn Table ile degistir (satir ~480-529)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-sm">` ... `</table></div>`
Dis `<div className="overflow-x-auto">` wrapper'ini kaldir (shadcn Table kendi wrapper'ini ekler).

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Baslik</TableHead>
      <TableHead>Kategori</TableHead>
      <TableHead className="text-right">Tutar</TableHead>
      <TableHead>Odeme Tarihi</TableHead>
      <TableHead className="text-center">Donem</TableHead>
      <TableHead className="text-right">Islemler</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {expenses.map((expense: any) => (
      <TableRow key={expense.id}>
        <TableCell>{expense.title}</TableCell>
        <TableCell>
          <Badge variant="outline">{expense.category}</Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(Number(expense.amount))}
        </TableCell>
        <TableCell>{formatDate(expense.paymentDate)}</TableCell>
        <TableCell className="text-center">
          {expense.effectiveMonth ? (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              {formatMonth(expense.effectiveMonth)}
            </Badge>
          ) : (
            <Badge variant="secondary">{formatMonth(expense.paymentDate.substring(0, 7))}</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- [ ] **Step 7: Test et ve commit**

```bash
git add frontend/src/app/dashboard/finance/expenses/page.tsx
git commit -m "refactor: replace custom selects and table with shadcn/ui in finance/expenses"
```

---

### Task 4: Finans - Dagitim Sayfasi (2 Table)

**Files:**
- Modify: `frontend/src/app/dashboard/finance/distribute/page.tsx`

- [ ] **Step 1: Table import'unu ekle**

Table import'u yoksa ekle:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] **Step 2: Dis `overflow-x-auto` wrapper'i kaldir ve dagitilmamis giderler tablosunu degistir (satir ~314-369)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-sm">` ... `</table></div>`
Dis `<div className="overflow-x-auto">` wrapper'ini kaldir.

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Baslik</TableHead>
      <TableHead>Kategori</TableHead>
      <TableHead className="text-right">Tutar</TableHead>
      <TableHead>Odeme Tarihi</TableHead>
      <TableHead className="text-right">Islem</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {undistributedExpenses.map((expense: any) => (
      <TableRow key={expense.id}>
        <TableCell>{expense.title}</TableCell>
        <TableCell>
          <Badge variant="outline">
            {CATEGORY_LABELS[expense.category] || expense.category}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(Number(expense.amount))}
        </TableCell>
        <TableCell>{formatDate(expense.paymentDate)}</TableCell>
        <TableCell className="text-right">
          <Button size="sm" className="gap-1" onClick={() => openDistributeDialog(expense.id)}>
            <Split className="h-3 w-3" />
            Dagit
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- [ ] **Step 3: Dis `overflow-x-auto` wrapper'i kaldir ve dagitim detaylari tablosunu degistir (satir ~416-462)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-sm">` ... `</table></div>` (accordion icerisinde)
Dis `<div className="overflow-x-auto">` wrapper'ini kaldir.

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Ay</TableHead>
      <TableHead className="text-right">Dagitilan Tutar</TableHead>
      <TableHead className="text-right">Oran</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {expense.distributions
      ?.sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((dist: any) => {
        const ratio = Number(expense.amount) > 0
          ? (Number(dist.amount) / Number(expense.amount)) * 100
          : 0;
        return (
          <TableRow key={dist.id}>
            <TableCell>{dist.month}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(Number(dist.amount))}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              %{ratio.toFixed(1)}
            </TableCell>
          </TableRow>
        );
      })}
  </TableBody>
</Table>
```

- [ ] **Step 4: Test et ve commit**

```bash
git add frontend/src/app/dashboard/finance/distribute/page.tsx
git commit -m "refactor: replace custom tables with shadcn/ui Table in finance/distribute"
```

---

### Task 5: Finans - Ana Sayfa (1 Table)

**Files:**
- Modify: `frontend/src/app/dashboard/finance/page.tsx`

- [ ] **Step 1: Table import'unu ekle**

```tsx
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] **Step 2: Dis `overflow-x-auto` wrapper'i kaldir ve gun gun gelir/gider tablosunu degistir (satir ~529-588)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-left border-collapse">` ... `</table></div>`
Dis `<div className="overflow-x-auto">` wrapper'ini kaldir.

Bu tabloda ozel styling var (px-8 py-4, ozel font sizes). shadcn Table kullanirken bu ozellikleri korumak icin TableCell'lere className ekle:

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted">
      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-wider">Tarih</TableHead>
      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-wider">Ciro</TableHead>
      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-wider">Gider</TableHead>
      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-wider">Net Durum</TableHead>
      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-wider">Detay</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredBreakdown.map((d: any) => (
      <TableRow key={d.day} className="hover:bg-muted transition-colors">
        <TableCell className="px-8 py-5">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">{formatDateFull(d.day, selectedMonth)}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{getDayName(d.day, selectedMonth)}</span>
          </div>
        </TableCell>
        <TableCell className="px-8 py-5">
          <span className="text-sm font-bold text-primary">
            {d.revenue > 0 ? formatCurrency(d.revenue) : '\u2014'}
          </span>
        </TableCell>
        <TableCell className="px-8 py-5">
          <span className="text-sm font-medium text-destructive">
            {d.expense > 0 ? formatCurrency(d.expense) : '\u2014'}
          </span>
        </TableCell>
        <TableCell className="px-8 py-5">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${d.net >= 0 ? 'bg-primary' : 'bg-destructive'}`} />
            <span className="text-sm font-bold text-foreground">{formatCurrency(d.net)}</span>
          </div>
        </TableCell>
        <TableCell className="px-8 py-5">
          <Button variant="link" className="p-0 h-auto text-sm font-bold">Incele</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
  <TableFooter>
    <TableRow className="bg-muted border-t-2 border-border/20">
      <TableCell className="px-8 py-5 text-sm font-black text-foreground">Toplam</TableCell>
      <TableCell className="px-8 py-5 text-sm font-bold text-primary">{formatCurrency(summary.totalRevenue)}</TableCell>
      <TableCell className="px-8 py-5 text-sm font-medium text-destructive">{formatCurrency(summary.totalExpenses)}</TableCell>
      <TableCell className="px-8 py-5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${summary.netIncome >= 0 ? 'bg-primary' : 'bg-destructive'}`} />
          <span className="text-sm font-bold text-foreground">{formatCurrency(summary.netIncome)}</span>
        </div>
      </TableCell>
      <TableCell className="px-8 py-5" />
    </TableRow>
  </TableFooter>
</Table>
```

- [ ] **Step 3: Test et ve commit**

```bash
git add frontend/src/app/dashboard/finance/page.tsx
git commit -m "refactor: replace custom table with shadcn/ui Table in finance dashboard"
```

---

### Task 6: Simulasyon Sayfasi (1 Select)

**Files:**
- Modify: `frontend/src/app/dashboard/simulation/page.tsx`

- [ ] **Step 1: Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: selectClass sabitini sil (satir ~71-72)**

`const selectClass = '...'` satirini tamamen kaldir.

- [ ] **Step 3: Urun select'ini degistir (satir ~555-567)**

Yeni:
```tsx
<Select value={revenueProductId || ""} onValueChange={setRevenueProductId}>
  <SelectTrigger id="rev-product">
    <SelectValue placeholder="Urun secin..." />
  </SelectTrigger>
  <SelectContent>
    {menuProducts.map((p) => (
      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 4: Dosyada baska selectClass referansi var mi kontrol et, varsa onlari da degistir**

`selectClass` kullanilan her yeri bul ve shadcn Select ile degistir.

- [ ] **Step 5: Test et ve commit**

```bash
git add frontend/src/app/dashboard/simulation/page.tsx
git commit -m "refactor: replace custom select with shadcn/ui in simulation"
```

---

### Task 7: Envanter - Tedarikciler (2 Select)

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/suppliers/page.tsx`

- [ ] **Step 1: Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: Yeni tedarikci - teslimat tipi select'ini degistir (satir ~215-224)**

Yeni:
```tsx
<Select value={newDeliveryType || ""} onValueChange={setNewDeliveryType}>
  <SelectTrigger>
    <SelectValue placeholder="Tedarik tipi secin..." />
  </SelectTrigger>
  <SelectContent>
    {DELIVERY_TYPES.map((dt) => (
      <SelectItem key={dt} value={dt}>{dt}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Edit mode - teslimat tipi select'ini degistir (satir ~276-285)**

Yeni (h-8 boyutunu korumak icin className ekle):
```tsx
<Select value={editingDeliveryType || ""} onValueChange={setEditingDeliveryType}>
  <SelectTrigger className="h-8">
    <SelectValue placeholder="Tedarik tipi secin..." />
  </SelectTrigger>
  <SelectContent>
    {DELIVERY_TYPES.map((dt) => (
      <SelectItem key={dt} value={dt}>{dt}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 4: Test et ve commit**

```bash
git add frontend/src/app/dashboard/inventory/suppliers/page.tsx
git commit -m "refactor: replace custom selects with shadcn/ui in inventory/suppliers"
```

---

### Task 8: Envanter - Hareketler (2 Select)

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/movements/page.tsx`

- [ ] **Step 1: Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: Stok kalemi select'ini degistir (satir ~138-150)**

Yeni:
```tsx
<Select required value={form.rawMaterialId || ""} onValueChange={(value) => setForm({ ...form, rawMaterialId: value })}>
  <SelectTrigger>
    <SelectValue placeholder="Stok Kalemi Secin" />
  </SelectTrigger>
  <SelectContent>
    {materials.map((m) => (
      <SelectItem key={m.id} value={m.id}>
        {m.name} ({m.unit})
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Hareket tipi select'ini degistir (satir ~154-161)**

Yeni:
```tsx
<Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as 'IN' | 'OUT' })}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="IN">{t('in')}</SelectItem>
    <SelectItem value="OUT">{t('out')}</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: Test et ve commit**

```bash
git add frontend/src/app/dashboard/inventory/movements/page.tsx
git commit -m "refactor: replace custom selects with shadcn/ui in inventory/movements"
```

---

### Task 9: Personel - Yeni Personel (1 Select)

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/new/page.tsx`

- [ ] **Step 1: Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: Pozisyon select'ini degistir (satir ~165-179)**

Yeni:
```tsx
<Select value={form.positionId || ""} onValueChange={(value) => setForm({ ...form, positionId: value })}>
  <SelectTrigger id="position">
    <SelectValue placeholder="Pozisyon Secin" />
  </SelectTrigger>
  <SelectContent>
    {positions.map((pos) => (
      <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Test et ve commit**

```bash
git add frontend/src/app/dashboard/personnel/new/page.tsx
git commit -m "refactor: replace custom select with shadcn/ui in personnel/new"
```

---

### Task 10: Personel - Detay Sayfasi (2 Select)

**Files:**
- Modify: `frontend/src/app/dashboard/personnel/[id]/page.tsx`

- [ ] **Step 1: Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: Edit form pozisyon select'ini degistir (satir ~387-401)**

Yeni:
```tsx
<Select
  value={editForm.positionId || ""}
  onValueChange={(value) => setEditForm({ ...editForm, positionId: value })}
>
  <SelectTrigger id="edit-position">
    <SelectValue placeholder="Pozisyon Secin" />
  </SelectTrigger>
  <SelectContent>
    {positions.map((pos) => (
      <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Izin tipi select'ini degistir (satir ~667-681)**

Yeni:
```tsx
<Select
  value={leaveForm.type}
  onValueChange={(value) => setLeaveForm({ ...leaveForm, type: value as 'ANNUAL' | 'SICK' | 'OTHER' })}
>
  <SelectTrigger id="leave-type">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ANNUAL">Yillik Izin</SelectItem>
    <SelectItem value="SICK">Hastalik Izni</SelectItem>
    <SelectItem value="OTHER">Diğer</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: Test et ve commit**

```bash
git add frontend/src/app/dashboard/personnel/\[id\]/page.tsx
git commit -m "refactor: replace custom selects with shadcn/ui in personnel/[id]"
```

---

### Task 11: Envanter - Ana Sayfa (1 Table)

**Files:**
- Modify: `frontend/src/app/dashboard/inventory/page.tsx`

- [ ] **Step 1: Table import'unu ekle**

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] **Step 2: Dis `overflow-x-auto` wrapper'i kaldir ve HTML table'i degistir (satir ~666-810)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-left border-collapse">` ... `</table></div>`

Bu tablo `isColumnVisible()` ile conditional column gosterme ozelligi iceriyor. shadcn Table ile degistirirken bu mantigi korumak gerekiyor:

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted/50">
      <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('name')}</TableHead>
      {isColumnVisible('type') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tip</TableHead>
      )}
      {isColumnVisible('supplier') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Tedarikçi</TableHead>
      )}
      {isColumnVisible('currentStock') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mevcut Stok</TableHead>
      )}
      {isColumnVisible('minStockLevel') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Min. Stok</TableHead>
      )}
      {isColumnVisible('lastPurchasePrice') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Son Alış Fiyatı</TableHead>
      )}
      {isColumnVisible('stockStatus') && (
        <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">Durum</TableHead>
      )}
      <TableHead className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-center">İşlemler</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Mevcut paginatedMaterials.map() icerigi ayni kalir, sadece <tr> -> <TableRow>, <td> -> <TableCell> olarak degisir */}
    {/* Ayrica group hover icin TableRow'a className="group" eklenmeli */}
  </TableBody>
</Table>
```

**Not:** Bu tablo karmasik (conditional columns, progress bars, group hover, popover). `<tr>` -> `<TableRow>`, `<td>` -> `<TableCell>`, `<th>` -> `<TableHead>`, `<thead>` -> `<TableHeader>`, `<tbody>` -> `<TableBody>` birebir donusumu yapilmali. Tum mevcut className'ler korunmali.

- [ ] **Step 3: Test et ve commit**

```bash
git add frontend/src/app/dashboard/inventory/page.tsx
git commit -m "refactor: replace custom table with shadcn/ui Table in inventory"
```

---

### Task 12: Finans - Ciro Kayitlari (1 Table)

**Files:**
- Modify: `frontend/src/app/dashboard/finance/revenues/page.tsx`

- [ ] **Step 1: Table import'unu ekle**

```tsx
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

- [ ] **Step 2: Dis `overflow-x-auto` wrapper'i kaldir ve HTML table'i degistir (satir ~226-286)**

Mevcut: `<div className="overflow-x-auto"><table className="w-full text-sm">` ... `</table></div>`

Yeni:
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">Gün</TableHead>
      <TableHead>Tarih</TableHead>
      <TableHead className="text-right">Tutar</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {monthDays.map((day) => (
      <TableRow
        key={day.day}
        className={`${day.dayName === 'Paz' || day.dayName === 'Cmt' ? 'bg-muted' : ''} ${!day.hasData && editingDay !== day.day ? 'text-muted-foreground' : ''}`}
      >
        <TableCell className="font-medium">{day.dayName}</TableCell>
        <TableCell>
          {day.day} {formatMonth(selectedMonth)}
        </TableCell>
        <TableCell className="text-right">
          {editingDay === day.day ? (
            <div className="flex items-center justify-end gap-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-32 h-8 text-right"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={confirmEdit} disabled={saveMutation.isPending}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <span
              className={`cursor-pointer hover:underline ${day.hasData ? 'font-medium' : ''}`}
              onClick={() => startEdit(day)}
            >
              {day.hasData ? formatCurrency(day.amount) : '—'}
            </span>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
  <TableFooter>
    <TableRow>
      <TableCell colSpan={2} className="font-bold">Toplam</TableCell>
      <TableCell className="text-right font-bold text-green-600">{formatCurrency(totalRevenue)}</TableCell>
    </TableRow>
  </TableFooter>
</Table>
```

- [ ] **Step 3: Test et ve commit**

```bash
git add frontend/src/app/dashboard/finance/revenues/page.tsx
git commit -m "refactor: replace custom table with shadcn/ui Table in finance/revenues"
```

---

### Task 13: Raporlar (3 dosya, 3 Select)

**Files:**
- Modify: `frontend/src/components/reports/monthly-report.tsx`
- Modify: `frontend/src/components/reports/weekly-report.tsx`
- Modify: `frontend/src/components/reports/comparison-report.tsx`

- [ ] **Step 1: Her uc dosyaya Select import ekle**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

- [ ] **Step 2: monthly-report.tsx - format select'ini degistir (satir ~87-89)**

Yeni:
```tsx
<Select value={format} onValueChange={(value) => setFormat(value as 'pdf' | 'html')}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pdf">PDF</SelectItem>
    <SelectItem value="html">HTML</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 3: weekly-report.tsx - format select'ini degistir (satir ~92-94)**

Yeni (ayni yapi):
```tsx
<Select value={format} onValueChange={(value) => setFormat(value as 'pdf' | 'html')}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pdf">PDF</SelectItem>
    <SelectItem value="html">HTML</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: comparison-report.tsx - karsilastirma tipi select'ini degistir (satir ~49-51)**

Yeni:
```tsx
<Select value={type} onValueChange={(value) => setType(value as 'monthly' | 'weekly')}>
  <SelectTrigger className="w-40">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="monthly">Aylik</SelectItem>
    <SelectItem value="weekly">Haftalik</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 5: Test et ve commit**

```bash
git add frontend/src/components/reports/monthly-report.tsx frontend/src/components/reports/weekly-report.tsx frontend/src/components/reports/comparison-report.tsx
git commit -m "refactor: replace custom selects with shadcn/ui in report components"
```

---

## Toplam Ozet

| Metrik | Sayi |
|--------|------|
| Degistirilecek dosya | 15 |
| Custom select -> shadcn Select | 20 |
| Custom checkbox -> shadcn Checkbox | 2 |
| Custom table -> shadcn Table | 7 tablo, 5 dosyada |
| Toplam commit | 13 |
| Toplam task | 13 |

**Onemli:** Tum table task'larinda dis `<div className="overflow-x-auto">` wrapper'i kaldirilmalidir (shadcn Table kendi wrapper'ini ekler).

**Onemli:** Orijinal kodda `required` olan select'lerde `<Select required>` korunmalidir.

Tum task'lar birbirinden bagimsizdir ve paralel calistirilabildlir (subagent-driven-development ile).
