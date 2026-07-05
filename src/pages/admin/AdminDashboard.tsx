import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import CasesTab from './CasesTab';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import ProjectsTab from './ProjectsTab';
import ReviewsTab from './ReviewsTab';
import SettingsTab from './SettingsTab';

const AdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold">Админ-панель</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { adminApi.logout(); onLogout(); }}
          >
            <LogOut className="w-4 h-4" /> Выйти
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="cases">
          <TabsList>
            <TabsTrigger value="cases">Кейсы</TabsTrigger>
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
            <TabsTrigger value="projects">Проекты</TabsTrigger>
            <TabsTrigger value="reviews">Отзывы</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="cases"><CasesTab /></TabsContent>
            <TabsContent value="products"><ProductsTab /></TabsContent>
            <TabsContent value="categories"><CategoriesTab /></TabsContent>
            <TabsContent value="projects"><ProjectsTab /></TabsContent>
            <TabsContent value="reviews"><ReviewsTab /></TabsContent>
            <TabsContent value="settings"><SettingsTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
