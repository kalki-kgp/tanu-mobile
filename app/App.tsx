import React, { useState, useEffect, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConnectScreen } from "./src/screens/ConnectScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import type { ConnectionConfig } from "./src/api/types";

const STORAGE_KEY = "@tanu_config";

export default function App() {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved config
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          setConfig(JSON.parse(raw));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleConnect = useCallback(async (newConfig: ConnectionConfig) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConfig(null);
  }, []);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="light" />
      {config ? (
        <ChatScreen config={config} onDisconnect={handleDisconnect} />
      ) : (
        <ConnectScreen onConnect={handleConnect} savedConfig={null} />
      )}
    </>
  );
}
