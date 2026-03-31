import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { TanuBridgeClient } from "../api/client";
import type { ConnectionConfig } from "../api/types";

interface Props {
  onConnect: (config: ConnectionConfig) => void;
  savedConfig: ConnectionConfig | null;
}

export function ConnectScreen({ onConnect, savedConfig }: Props) {
  const [host, setHost] = useState(savedConfig?.host || "");
  const [port, setPort] = useState(savedConfig?.port || "4567");
  const [token, setToken] = useState(savedConfig?.token || "");
  const [cwd, setCwd] = useState(savedConfig?.cwd || "~");
  const [checking, setChecking] = useState(false);

  const handleConnect = async () => {
    if (!host.trim() || !token.trim()) {
      Alert.alert("Missing fields", "Host and token are required babe");
      return;
    }

    setChecking(true);
    try {
      const config: ConnectionConfig = {
        host: host.trim(),
        port: port.trim() || "4567",
        token: token.trim(),
        cwd: cwd.trim() || "~",
      };

      const client = new TanuBridgeClient(config);
      const healthy = await client.healthCheck();

      if (!healthy) {
        Alert.alert("Can't reach bridge", `Make sure tanu-bridge is running on ${host}:${port}`);
        return;
      }

      onConnect(config);
    } catch (err: any) {
      Alert.alert("Connection failed", err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>Tanu</Text>
        <Text style={styles.subtitle}>Connect to your Claude Code bridge</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Bridge Host (IP / hostname)</Text>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.100 or macbook.local"
            placeholderTextColor="#555570"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Port</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="4567"
            placeholderTextColor="#555570"
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Auth Token</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="tanu-..."
            placeholderTextColor="#555570"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <Text style={styles.label}>Working Directory</Text>
          <TextInput
            style={styles.input}
            value={cwd}
            onChangeText={setCwd}
            placeholder="~/Developer/my-project"
            placeholderTextColor="#555570"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.connectBtn, checking && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.connectText}>Connect</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    color: "#6C5CE7",
    fontSize: 42,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#8888AA",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    color: "#B0B0C8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1E1E2E",
    color: "#E0E0F0",
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2D2D44",
  },
  connectBtn: {
    backgroundColor: "#6C5CE7",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  connectBtnDisabled: {
    opacity: 0.6,
  },
  connectText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
