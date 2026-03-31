import { useState, useEffect, useCallback, useRef } from "react";
import { TanuBridgeClient } from "../api/client";
import type {
  ChatMessage,
  PendingPermission,
  BridgeMessage,
  ConnectionConfig,
} from "../api/types";

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

export function useTanu(config: ConnectionConfig | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string>("disconnected");
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const clientRef = useRef<TanuBridgeClient | null>(null);
  const streamingRef = useRef<{ uuid: string; text: string } | null>(null);

  // Connect to bridge
  useEffect(() => {
    if (!config) return;

    const client = new TanuBridgeClient(config);
    clientRef.current = client;

    const unsubMsg = client.onMessage((msg: BridgeMessage) => {
      switch (msg.type) {
        case "stream_delta": {
          if (!streamingRef.current || streamingRef.current.uuid !== msg.uuid) {
            // New streaming message
            const id = nextId();
            streamingRef.current = { uuid: msg.uuid, text: msg.text };
            setMessages((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                content: msg.text,
                timestamp: new Date(),
                isStreaming: true,
              },
            ]);
          } else {
            // Append to existing streaming message
            streamingRef.current.text += msg.text;
            const accumulated = streamingRef.current.text;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: accumulated },
                ];
              }
              return prev;
            });
          }
          break;
        }

        case "assistant_text": {
          // Final assembled message — replace streaming message
          streamingRef.current = null;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.isStreaming) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: msg.text,
                  isStreaming: false,
                },
              ];
            }
            // No streaming message to replace, add new
            return [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                content: msg.text,
                timestamp: new Date(),
                isStreaming: false,
              },
            ];
          });
          break;
        }

        case "permission_request": {
          setPendingPermission({
            request_id: msg.request_id,
            tool_name: msg.tool_name,
            tool_input: msg.tool_input,
            description: msg.description,
          });
          break;
        }

        case "result": {
          streamingRef.current = null;
          setStatus("idle");
          if (msg.cost_usd > 0) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, cost: msg.cost_usd },
                ];
              }
              return prev;
            });
          }
          break;
        }

        case "status": {
          setStatus(msg.status);
          break;
        }
      }
    });

    const unsubStatus = client.onStatus((isConnected) => {
      setConnected(isConnected);
      if (!isConnected) setStatus("disconnected");
    });

    client.connect().catch((err) => {
      console.error("Failed to connect:", err);
      setStatus("error");
    });

    return () => {
      unsubMsg();
      unsubStatus();
      client.disconnect();
      clientRef.current = null;
    };
  }, [config]);

  const sendMessage = useCallback((content: string) => {
    if (!clientRef.current) return;

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "user",
        content,
        timestamp: new Date(),
      },
    ]);

    clientRef.current.sendMessage(content);
    setStatus("thinking");
  }, []);

  const respondToPermission = useCallback(
    (behavior: "allow" | "deny") => {
      if (!clientRef.current || !pendingPermission) return;
      clientRef.current.sendPermissionResponse(pendingPermission.request_id, behavior);
      setPendingPermission(null);
    },
    [pendingPermission]
  );

  const interrupt = useCallback(() => {
    clientRef.current?.sendInterrupt();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingRef.current = null;
  }, []);

  return {
    messages,
    connected,
    status,
    pendingPermission,
    sendMessage,
    respondToPermission,
    interrupt,
    clearMessages,
  };
}
