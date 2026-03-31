import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { ConnectionConfig } from "../api/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (config: ConnectionConfig) => void;
}

export function QRScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Parse tanu://host:port?token=xxx&cwd=yyy
      const parsed = parseConnectURL(data);
      if (parsed) {
        onScanned(parsed);
        onClose();
      } else {
        Alert.alert("Invalid QR", "This doesn't look like a Tanu connect code");
      }
    } catch {
      Alert.alert("Invalid QR", "Couldn't parse this QR code");
    }

    // Allow re-scanning after a delay
    setTimeout(() => setScanned(false), 2000);
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission</Text>
          <Text style={styles.permissionText}>
            Need camera access to scan the QR code from your bridge server
          </Text>
          <TouchableOpacity style={styles.allowBtn} onPress={requestPermission}>
            <Text style={styles.allowBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <Text style={styles.instructions}>
              Scan the QR code from your bridge terminal
            </Text>
            <View style={styles.scanBox} />
          </View>
        </CameraView>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function parseConnectURL(raw: string): ConnectionConfig | null {
  // tanu://192.168.1.100:4567?token=tanu-xxx&cwd=/Users/...
  try {
    // Replace tanu:// with http:// for URL parsing
    const urlStr = raw.replace(/^tanu:\/\//, "http://");
    const url = new URL(urlStr);

    const host = url.hostname;
    const port = url.port || "4567";
    const token = url.searchParams.get("token");
    const cwd = url.searchParams.get("cwd") || "~";

    if (!host || !token) return null;

    return { host, port, token, cwd };
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  instructions: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#6C5CE7",
    borderRadius: 20,
  },
  closeBtn: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "rgba(30,30,46,0.9)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0A0A14",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionTitle: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  permissionText: {
    color: "#8888AA",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  allowBtn: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  allowBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: "#8888AA",
    fontSize: 15,
  },
});
