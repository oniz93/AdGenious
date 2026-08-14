import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import api from '../api/client';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeColor: Record<string, string> = {
  info: '#1877F2',
  success: '#42B72A',
  warning: '#F7B500',
  error: '#F02849',
};

const NotificationsMenu: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const [{ data: listData }, { data: countData }] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/notifications/unread-count'),
      ]);
      setNotifications(listData.notifications ?? []);
      setUnreadCount(countData.count ?? 0);
    } catch {
      // Notifications are non-critical; ignore failures.
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    load();
  };

  const handleMarkRead = async (id: string) => {
    await api.post(`/api/notifications/${id}/read`);
    load();
  };

  const handleMarkAllRead = async () => {
    await api.post('/api/notifications/read-all');
    load();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 380, maxWidth: '90vw' } }}
      >
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Notifications</Typography>
          <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        <List dense sx={{ maxHeight: 420, overflow: 'auto' }}>
          {notifications.map((notification) => (
            <ListItem key={notification.id} disablePadding>
              <ListItemButton onClick={() => handleMarkRead(notification.id)}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: notification.read ? 'transparent' : typeColor[notification.type], mr: 1.5, flexShrink: 0 }} />
                <ListItemText
                  primary={notification.title}
                  secondary={`${notification.message} · ${new Date(notification.createdAt).toLocaleString()}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: notification.read ? 400 : 600 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {notifications.length === 0 && (
            <ListItem>
              <ListItemText secondary="No notifications yet." />
            </ListItem>
          )}
        </List>
      </Menu>
    </>
  );
};

export default NotificationsMenu;
