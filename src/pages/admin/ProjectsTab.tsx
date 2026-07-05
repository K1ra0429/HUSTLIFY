import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';

const emptyProject = {
  id: '',
  title: '',
  subtitle: '',
  description: '',
  icon: '✨',
  banner: '',
  is_active: true,
  sort_order: 0,
};

type ProjectRow = typeof emptyProject;

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/(^-|-$)/g, '');

const ProjectsTab = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await adminApi.projects.list());
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить проекты', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: 'Укажите название проекта', variant: 'destructive' });
      return;
    }
    const id = editing.id || slugify(editing.title);
    if (!id) {
      toast({ title: 'Не удалось сформировать ID проекта, укажите его вручную', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.projects.upsert({ ...editing, id });
      toast({ title: 'Проект сохранён' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка сохранения', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить проект безвозвратно? Товары и категории, привязанные к нему, тоже удалятся.')) return;
    try {
      await adminApi.projects.remove(id);
      toast({ title: 'Проект удалён' });
      load();
    } catch (e: any) {
      toast({ title: 'Ошибка удаления', description: e?.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Проекты, к которым привязываются категории и товары ({projects.length})</p>
        <Button size="sm" onClick={() => { setIsNew(true); setEditing({ ...emptyProject, sort_order: projects.length }); }}>
          <Plus className="w-4 h-4" /> Новый проект
        </Button>
      </div>

      <div className="space-y-2">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-lg shrink-0">{p.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{p.title}</span>
                {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">скрыт</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{p.id}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { setIsNew(false); setEditing(p); }}><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
        {projects.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Пока нет ни одного проекта</div>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{!isNew ? 'Редактировать проект' : 'Новый проект'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Field label="Название">
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </Field>
              {isNew && (
                <Field label="ID (латиницей, для ссылок; пусто — сформируется из названия)">
                  <Input value={editing.id} onChange={(e) => setEditing({ ...editing, id: slugify(e.target.value) })} placeholder="my-project" />
                </Field>
              )}
              <Field label="Подзаголовок"><Input value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
              <Field label="Описание"><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Иконка (эмодзи)"><Input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></Field>
                <Field label="Порядок сортировки"><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Баннер (URL картинки)"><Input value={editing.banner ?? ''} onChange={(e) => setEditing({ ...editing, banner: e.target.value })} placeholder="https://..." /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm font-medium">Показывать на сайте</div>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
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

export default ProjectsTab;
