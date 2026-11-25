import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import { useEffect, useRef } from 'react';
import { session } from '../api/client';
import { notificationsWsUrl } from '../config';

/**
 * Tiempo real por WebSocket (STOMP) con el subsistema de notificaciones: por defecto a través del gateway
 * (/subsystems/notifications/ws) o en VITE_WS_URL. JWT en el header Authorization del CONNECT.
 * Temas: /topic/users.<id> (avisos de la persona) y /topic/requests.<id> (estado y ubicación del pedido).
 */

let client: Client | null = null;
const handlers = new Map<string, Set<(body: unknown) => void>>();
const subscriptions = new Map<string, StompSubscription>();

function subscribeTopic(topic: string) {
  if (!client?.connected || subscriptions.has(topic)) return;
  subscriptions.set(
    topic,
    client.subscribe(topic, (msg: IMessage) => {
      let body: unknown = msg.body;
      try {
        body = JSON.parse(msg.body);
      } catch {
        // texto plano
      }
      handlers.get(topic)?.forEach((h) => h(body));
    }),
  );
}

function ensureClient() {
  if (client) return;
  client = new Client({
    brokerURL: notificationsWsUrl(),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // El token se lee en cada (re)conexión: si se renovó, va el nuevo.
    beforeConnect: () => {
      client!.connectHeaders = { Authorization: `Bearer ${session.get().accessToken ?? ''}` };
    },
    onConnect: () => {
      subscriptions.clear();
      handlers.forEach((_, topic) => subscribeTopic(topic));
    },
  });
  client.activate();
}

/** Desconecta (al cerrar sesión). */
export function disconnectRealtime() {
  subscriptions.clear();
  handlers.clear();
  void client?.deactivate();
  client = null;
}

export function listen(topic: string, handler: (body: unknown) => void): () => void {
  ensureClient();
  if (!handlers.has(topic)) handlers.set(topic, new Set());
  handlers.get(topic)!.add(handler);
  subscribeTopic(topic);
  return () => {
    const set = handlers.get(topic);
    set?.delete(handler);
    if (set && set.size === 0) {
      handlers.delete(topic);
      subscriptions.get(topic)?.unsubscribe();
      subscriptions.delete(topic);
    }
  };
}

/** Hook: escucha un tema mientras el componente está montado. */
export function useTopic(topic: string | null, handler: (body: unknown) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!topic) return;
    return listen(topic, (b) => ref.current(b));
  }, [topic]);
}
