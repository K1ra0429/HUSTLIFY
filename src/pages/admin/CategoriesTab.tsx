import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';

const emptyCategory = {
  id: '',
  name: '',
  description: '',
  icon: '⚡',
  slug: '',
  project_id: null as string | null,
  parent_id: null as string | null,
  is_active: true,
  sort_order: 0,
};

type CategoryRow = typeof emptyCategory;
type ProjectRow = { id: string; title: string };

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '');

const CategoriesTab = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, projs] = await Promise.all([adminApi.categories.list(), adminApi.projects.list()]);
      setCategories(cats);
      setProjects(projs);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить категории', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: 'Укажите название категории', variant: 'destructive' });
      return;
    }
    const id = editing.id || slugify(editing.name);
    if (!id) {
      toast({ title: 'Не удалось сформировать ID категории, укажите его вручную', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.categories.upsert({ ...editing, id, slug: editing.slug || id });
      toast({ title: 'Категория сохранена' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить категорию безвозвратно?')) return;
    try {
      await adminApi.categories.remove(id);
      toast({ title: 'Категория удалена' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  const projectTitle = (id: string | null) => projects.find((p) => p.id === id)?.title;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Категории каталога ({categories.length})</p>
        <Button size="sm" onClick={() => { setIsNew(true); setEditing({ ...emptyCategory, sort_order: categories.length }); }}>
          <Plus className="w-4 h-4" /> Новая категория
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-lg shrink-0">{c.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{c.name}</span>
                {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">скрыта</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {c.id}{c.project_id ? ` · проект: ${projectTitle(c.project_id) ?? c.project_id}` : ' · без проекта'}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing(c); }}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
        {categories.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Пока нет ни одной категории</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{!isNew ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Название"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              {isNew && (
                <Field label="ID (латиницей; пусто — сформируется из названия)">
                  <Input value={editing.id} onChange={(e) => setEditing({ ...editing, id: slugify(e.target.value) })} placeholder="emoji" />
                </Field>
              )}
              <Field label="Описание"><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>

              <Field label="Проект (к какому проекту относится категория)">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.project_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, project_id: e.target.value || null })}
                >
                  <option value="">— без проекта —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>

              <Field label="Родительская категория (для подкатегорий)">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.parent_id ?? ''}
                  onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                >
                  <option value="">— нет, это корневая категория —</option>
                  {categories.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Иконка (эмодзи)"><Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></Field>
                <Field label="Порядок сортировки"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
              </div>
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

export default CategoriesTab;
