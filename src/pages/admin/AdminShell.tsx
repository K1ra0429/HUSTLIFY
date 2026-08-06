import { useState } from 'react';
import {
  LayoutGrid, Package, FolderTree, Boxes, Sparkles, Star, Settings, LogOut, ShieldCheck,
} from 'lucide-react';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter,
  SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/adminApi';
import { ConfirmProvider } from './components/ConfirmDialog';
import DashboardTab from './DashboardTab';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import ProjectsTab from './ProjectsTab';
import CasesTab from './CasesTab';
import ReviewsTab from './ReviewsTab';
import SettingsTab from './SettingsTab';

type Section = 'dashboard' | 'products' | 'categories' | 'projects' | 'cases' | 'reviews' | 'settings';

const NAV: { key: Section; label: string; icon: typeof Package }[] = [
  { key: 'dashboard', label: 'Обзор', icon: LayoutGrid },
  { key: 'products', label: 'Товары', icon: Package },
  { key: 'categories', label: 'Категории', icon: FolderTree },
  { key: 'projects', label: 'Проекты', icon: Boxes },
  { key: 'cases', label: 'Кейсы', icon: Sparkles },
  { key: 'reviews', label: 'Отзывы', icon: Star },
  { key: 'settings', label: 'Настройки', icon: Settings },
];

const TITLES: Record<Section, string> = {
  dashboard: 'Обзор', products: 'Товары', categories: 'Категории', projects: 'Проекты',
  cases: 'Кейсы', reviews: 'Отзывы', settings: 'Настройки',
};

const AdminShell = ({ onLogout }: { onLogout: () => void }) => {
  const [section, setSection] = useState<Section>('dashboard');

  return (
    <ConfirmProvider>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-3 py-3">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-sm group-data-[collapsible=icon]:hidden">Hustlify Admin</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={section === item.key}
                        tooltip={item.label}
                        onClick={() => setSection(item.key)}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="px-3 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center"
              onClick={() => { adminApi.logout(); onLogout(); }}
            >
              <LogOut className="w-4 h-4" />
              <span className="group-data-[collapsible=icon]:hidden">Выйти</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-10">
            <div className="px-4 py-3 flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="font-display text-base font-bold">{TITLES[section]}</h1>
            </div>
          </div>

          <div className="p-4 sm:p-6 max-w-5xl">
            {section === 'dashboard' && <DashboardTab onNavigate={(s) => setSection(s)} />}
            {section === 'products' && <ProductsTab />}
            {section === 'categories' && <CategoriesTab />}
            {section === 'projects' && <ProjectsTab />}
            {section === 'cases' && <CasesTab />}
            {section === 'reviews' && <ReviewsTab />}
            {section === 'settings' && <SettingsTab />}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ConfirmProvider>
  );
};

export default AdminShell;
