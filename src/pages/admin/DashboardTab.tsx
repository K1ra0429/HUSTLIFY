import { useEffect, useState } from 'react';
import { Loader2, Package, FolderTree, Boxes, Sparkles, Star } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import StatCard from './components/StatCard';
import { toast } from '@/hooks/use-toast';

type Section = 'products' | 'categories' | 'projects' | 'cases' | 'reviews' | 'settings';

const DashboardTab = ({ onNavigate }: { onNavigate: (section: Section) => void }) => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    products: 0, activeProducts: 0, categories: 0, projects: 0, cases: 0, pendingReviews: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [products, categories, projects, cases, reviews] = await Promise.all([
          adminApi.products.list(),
          adminApi.categories.list(),
          adminApi.projects.list(),
          adminApi.cases.list(),
          adminApi.reviews.list().catch(() => []),
        ]);
        if (cancelled) return;
        setCounts({
          products: products.length,
          activeProducts: products.filter((p: any) => p.is_active).length,
          categories: categories.length,
          projects: projects.length,
          cases: cases.length,
          pendingReviews: reviews.filter((r: any) => (r.moderation_status || (r.verified ? 'approved' : 'pending')) === 'pending').length,
        });
      } catch (e: any) {
        toast({ title: 'Не удалось загрузить сводку', description: e?.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Обзор</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Общее состояние каталога и магазина</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={Package}
          label="Товаров в каталоге"
          value={counts.products}
          hint={`${counts.activeProducts} видны на сайте`}
          onClick={() => onNavigate('products')}
        />
        <StatCard
          icon={FolderTree}
          label="Категорий"
          value={counts.categories}
          onClick={() => onNavigate('categories')}
        />
        <StatCard
          icon={Boxes}
          label="Проектов"
          value={counts.projects}
          onClick={() => onNavigate('projects')}
        />
        <StatCard
          icon={Sparkles}
          label="Кейсов на главной"
          value={counts.cases}
          onClick={() => onNavigate('cases')}
        />
        <StatCard
          icon={Star}
          label="Отзывы на модерации"
          value={counts.pendingReviews}
          hint={counts.pendingReviews > 0 ? 'Требуют внимания' : undefined}
          tone={counts.pendingReviews > 0 ? 'warning' : 'default'}
          onClick={() => onNavigate('reviews')}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold text-sm">Заказы, пользователи и статистика продаж</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Управление заказами, покупателями, промокодами и складом остаётся в Telegram-боте —
          там же, где приходят уведомления о новых заказах. Команда <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/admin</code> в
          боте открывает полное меню.
        </p>
      </div>
  );
};

export default DashboardTab;
