import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface Props {
  onSend: (text: string) => void;
  onInterrupt: () => void;
  isThinking: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, onInterrupt, isThinking, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {isThinking && (
          <TouchableOpacity style={styles.interruptBtn} onPress={onInterrupt}>
            <Text style={styles.interruptText}>Stop</Text>
          </TouchableOpacity>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={disabled ? "Connecting..." : "Message Tanu..."}
            placeholderTextColor="#555570"
            multiline
            maxLength={10000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || disabled}
          >
            <Text style={styles.sendIcon}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#2D2D44",
    backgroundColor: "#12121C",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  interruptBtn: {
    alignSelf: "center",
    backgroundColor: "#E74C3C",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 8,
  },
  interruptText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#1E1E2E",
    color: "#E0E0F0",
    fontSize: 15,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#2D2D44",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6C5CE7",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#2D2D44",
  },
  sendIcon: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
