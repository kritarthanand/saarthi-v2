import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { CoachId, Thread } from '@/lib/threads';
import { usePatchThread } from '@/lib/threads.hooks';

const COACHES: { id: CoachId; label: string }[] = [
  { id: 'arjun', label: 'Arjun' },
  { id: 'bheem', label: 'Bheem' },
  { id: 'yudi', label: 'Yudi' },
  { id: 'nakula', label: 'Nakula' },
  { id: 'sahdev', label: 'Sahdev' },
];

// `null` here means "use the profile default" — sent to the server as
// JSON null, which the PATCH endpoint maps to SQL NULL.
const MODELS: { id: string | null; label: string }[] = [
  { id: null, label: 'Use profile default' },
  { id: 'claude_opus', label: 'Claude Opus' },
  { id: 'claude_sonnet', label: 'Claude Sonnet' },
  { id: 'gpt_4o', label: 'GPT-4o' },
  { id: 'gpt_5_4', label: 'GPT-5' },
];

export function ThreadEditSheet({
  thread,
  open,
  onClose,
  onSaved,
}: {
  thread: Thread;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Thread) => void;
}) {
  const [title, setTitle] = useState(thread.title ?? '');
  const [systemPrompt, setSystemPrompt] = useState(thread.system_prompt ?? '');
  const [coach, setCoach] = useState<CoachId>(thread.coach_id);
  const [model, setModel] = useState<string | null>(thread.chat_model);
  const [saving, setSaving] = useState(false);

  const patchThread = usePatchThread();

  const handleSave = async () => {
    if (saving) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Give this thread a title (1–200 chars).');
      return;
    }
    setSaving(true);
    try {
      // Build patch body: only send changed fields. Pass explicit null when
      // clearing system_prompt / chat_model.
      const patch: Parameters<typeof patchThread>[1] = {};
      if (title.trim() !== (thread.title ?? '')) patch.title = title.trim();
      const nextSp = systemPrompt.trim() ? systemPrompt : null;
      if (nextSp !== thread.system_prompt) patch.system_prompt = nextSp;
      if (coach !== thread.coach_id) patch.coach_id = coach;
      if (model !== thread.chat_model) patch.chat_model = model;

      const updated = await patchThread(thread.id, patch);
      onSaved(updated);
      onClose();
    } catch (e) {
      console.error('patchThread failed', e);
      Alert.alert('Error', 'Could not save changes. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View
          style={{
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomColor: Colors.border,
            borderBottomWidth: 1,
          }}
        >
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={{ color: Colors.textDim, fontSize: 15, fontWeight: '500' }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700' }}>Edit thread</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save"
          >
            <Text
              style={{
                color: saving ? Colors.textFaint : Colors.accent,
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
          {/* Title */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Thread title"
              placeholderTextColor={Colors.textFaint}
              maxLength={200}
              style={{
                color: Colors.text,
                fontSize: 15,
                paddingVertical: 10,
                paddingHorizontal: 12,
                backgroundColor: Colors.bgCard,
                borderColor: Colors.border,
                borderWidth: 1,
                borderRadius: 10,
              }}
            />
          </View>

          {/* System prompt */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Custom instructions
            </Text>
            <TextInput
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder="Optional. Custom instructions for this thread's coach…"
              placeholderTextColor={Colors.textFaint}
              maxLength={4000}
              multiline
              numberOfLines={6}
              style={{
                color: Colors.text,
                fontSize: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                minHeight: 120,
                textAlignVertical: 'top',
                backgroundColor: Colors.bgCard,
                borderColor: Colors.border,
                borderWidth: 1,
                borderRadius: 10,
              }}
            />
            <Text style={{ fontSize: 11, color: Colors.textFaint }}>
              {systemPrompt.length} / 4000
            </Text>
          </View>

          {/* Coach */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Coach
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {COACHES.map((c) => {
                const selected = coach === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCoach(c.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: selected ? Colors.accent : Colors.bgCard,
                      borderColor: selected ? Colors.accent : Colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: selected ? '#fff' : Colors.text, fontSize: 13, fontWeight: '600' }}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Model */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Model
            </Text>
            <View style={{ gap: 6 }}>
              {MODELS.map((m) => {
                const selected = model === m.id;
                return (
                  <Pressable
                    key={m.id ?? 'default'}
                    onPress={() => setModel(m.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: selected ? Colors.bgCardElev : Colors.bgCard,
                      borderColor: selected ? Colors.accent : Colors.border,
                      borderWidth: 1,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '600' }}>
                      {m.label}
                    </Text>
                    {selected && (
                      <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: '700' }}>✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
