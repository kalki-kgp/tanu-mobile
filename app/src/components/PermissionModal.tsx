import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { PendingPermission } from "../api/types";

interface Props {
  permission: PendingPermission | null;
  onRespond: (behavior: "allow" | "deny") => void;
}

export function PermissionModal({ permission, onRespond }: Props) {
  if (!permission) return null;

  const inputPreview = JSON.stringify(permission.tool_input, null, 2);
  const truncated =
    inputPreview.length > 500
      ? inputPreview.slice(0, 500) + "\n..."
      : inputPreview;

  return (
    <Modal transparent animationType="slide" visible={!!permission}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Permission Request</Text>
          <Text style={styles.toolName}>{permission.tool_name}</Text>
          <Text style={styles.description}>{permission.description}</Text>

          <ScrollView style={styles.inputScroll}>
            <Text style={styles.inputText}>{truncated}</Text>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDeny]}
              onPress={() => onRespond("deny")}
            >
              <Text style={styles.btnText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAllow]}
              onPress={() => onRespond("allow")}
            >
              <Text style={styles.btnText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    backgroundColor: "#1E1E2E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderTopColor: "#6C5CE7",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  toolName: {
    color: "#6C5CE7",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  description: {
    color: "#B0B0C8",
    fontSize: 14,
    marginBottom: 12,
  },
  inputScroll: {
    maxHeight: 200,
    backgroundColor: "#12121C",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  inputText: {
    color: "#8888AA",
    fontSize: 12,
    fontFamily: "monospace",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnAllow: {
    backgroundColor: "#6C5CE7",
  },
  btnDeny: {
    backgroundColor: "#2D2D44",
    borderWidth: 1,
    borderColor: "#444466",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
