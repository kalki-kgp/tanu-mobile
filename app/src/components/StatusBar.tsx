import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  status: string;
  connected: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  connected: "#2ECC71",
  thinking: "#F39C12",
  idle: "#2ECC71",
  disconnected: "#E74C3C",
  error: "#E74C3C",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  thinking: "Thinking...",
  idle: "Ready",
  disconnected: "Disconnected",
  error: "Error",
};

export function StatusBar({ status, connected }: Props) {
  const color = STATUS_COLORS[status] || "#888";
  const label = STATUS_LABELS[status] || status;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
