import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { Bell, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = async (notification: { id: string; link: string | null; is_read: boolean }) => {
    if (!notification.is_read) {
      await markReadMutation.mutateAsync(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_lead':
        return '🆕';
      case 'status_change':
        return '📞';
      case 'assignment':
        return '📋';
      case 'won':
        return '✅';
      default:
        return '📌';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-medium">Notificaciones</span>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[300px]">
            {notifications.slice(0, 20).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  'flex flex-col items-start px-3 py-2 cursor-pointer',
                  !notification.is_read && 'bg-accent/50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg shrink-0">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notification.created_at), "dd MMM 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
