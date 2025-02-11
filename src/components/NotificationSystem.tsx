import React, { useEffect, useState } from 'react';
import '../styles/notifications.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  duration: number;
}

export const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handleNotification = (event: CustomEvent<Omit<Notification, 'id'>>) => {
      const newNotification = {
        ...event.detail,
        id: Math.random().toString(36).substr(2, 9)
      };

      setNotifications(prev => [...prev, newNotification]);

      if (event.detail.duration > 0) {
        setTimeout(() => {
          setNotifications(prev => 
            prev.filter(n => n.id !== newNotification.id)
          );
        }, event.detail.duration);
      }
    };

    window.addEventListener('kokoro-notification', 
      handleNotification as EventListener);

    return () => {
      window.removeEventListener('kokoro-notification', 
        handleNotification as EventListener);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-header">
            <h4>{notification.title}</h4>
            <button 
              onClick={() => dismissNotification(notification.id)}
              className="notification-close"
            >
              ×
            </button>
          </div>
          <div className="notification-body">
            {notification.message}
          </div>
        </div>
      ))}
    </div>
  );
};
