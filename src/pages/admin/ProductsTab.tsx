import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';

const emptyProduct = {
  id: undefined as string | undefined,
  title: '',
  subtitle: '',
  description: '',
  price: 0,
  old_price: null as number | null,
  stock: 0,
  image: '',
  guarantee: '',
  is_active: true,
  is_featured: false,
  is_popular: false,
  is_new: false,
  sort_order: 0,
};

type ProductRow = typeof emptyProduct;

const ProductsTab = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setProducts(await adminApi.products.list());
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить товары', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: 'Укажите название товара', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.products.upsert(editing);
      toast({ title: 'Товар сохранён' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить товар безвозвратно?')) return;
    try {
      await adminApi.products.remove(id);
      toast({ title: 'Товар удалён' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Все товары каталога ({products.length})</p>
        <Button size="sm" onClick={() => setEditing({ ...emptyProduct, sort_order: products.length })}>
          <Plus className="w-4 h-4" /> Новый товар
        </Button>
      </div>

      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="w-12 h-12 rounded-lg bg-black overflow-hidden shrink-0">
              {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{p.title}</span>
                {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">скрыт</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{p.price} ₽ · остаток {p.stock}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => p.id && remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
        {products.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Пока нет товаров</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Редактировать товар' : 'Новый товар'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Название"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Подзаголовок"><Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
              <Field label="Описание"><Textarea rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Цена, ₽"><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
                <Field label="Старая цена, ₽"><Input type="number" value={editing.old_price ?? ''} onChange={(e) => setEditing({ ...editing, old_price: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Остаток"><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} /></Field>
                <Field label="Гарантия"><Input value={editing.guarantee} onChange={(e) => setEditing({ ...editing, guarantee: e.target.value })} /></Field>
              </div>
              <Field label="Картинка (URL)"><Input value={editing.image ?? ''} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://..." /></Field>

              {([
                ['is_active', 'Показывать на сайте'],
                ['is_featured', 'Рекомендуемый'],
                ['is_popular', 'Популярный'],
                ['is_new', 'Новинка'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="text-sm font-medium">{label}</div>
                  <Switch checked={(editing as any)[key]} onCheckedChange={(v) => setEditing({ ...editing, [key]: v })} />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default ProductsTab;
