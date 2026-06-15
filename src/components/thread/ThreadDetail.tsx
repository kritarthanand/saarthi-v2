import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { TEMPLATE_REGISTRY } from '@/lib/threadTemplates';
import type { Task, TaskStatus, Thread, ThreadMessage } from '@/lib/threads';
import { apiFetch, useDeleteThread, usePatchTask, useSendMessage, useThread } from '@/lib/threads.hooks';
import { Composer } from '../Composer';
import { Hashtag } from '../Hashtag';
import { BackIcon, DotsIcon } from '../icons';
import { SaarthiLogo } from '../SaarthiLogo';
import { ThreadChat } from './ThreadChat';
import { ThreadChatTab } from './ThreadChatTab';

let _localMsgId = 0;

export function ThreadDetail({
  threadId,
  onClose,
  onMic,
  topInset = 50,
  bottomInset = 0,
  embedded = false,
}: {
  threadId: string;
  onClose: () => void;
  onMic: () => void;
  topInset?: number;
  bottomInset?: number;
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<'summary' | 'chat'>('summary');
  const [sentCount, setSentCount] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const { thread, tasks, messages, refresh } = useThread(threadId);

  const theme = threadTheme(thread?.tag ?? '');
  const template = thread?.template;
  const config = template ? TEMPLATE_REGISTRY[template] : undefined;

  // Locally-mutable copies seeded from the live fetch for optimistic updates.
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localMessages, setLocalMessages] = useState<ThreadMessage[]>([]);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);
  useEffect(() => { setLocalMessages(messages); }, [messages]);

  // Reset when navigating to a different thread.
  useEffect(() => {
    setLocalTasks([]);
    setLocalMessages([]);
    setSentCount(0);
    setTab('summary');
  }, [threadId]);

  const patchTask = usePatchTask();
  const sendMessage = useSendMessage();
  const deleteThread = useDeleteThread();

  const handleDelete = useCallback(() => {
    setOptionsOpen(false);
    Alert.alert(
      'Delete thread?',
      `"${thread?.tag ?? 'This thread'}" and all its tasks and messages will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteThread(threadId);
              onClose();
            } catch (e) {
              Alert.alert('Error', 'Could not delete thread. Try again.');
            }
          },
        },
      ],
    );
  }, [deleteThread, threadId, thread?.tag, onClose]);

  const handleToggleTask = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // Optimistic update
      setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      try {
        await patchTask(taskId, { status });
        setTimeout(() => refresh(), 250);
      } catch (e) {
        console.error('toggleTask failed', e);
        // Revert on error
        setLocalTasks(tasks);
      }
    },
    [patchTask, refresh, tasks],
  );

  const handleSendMessage = useCallback(
    async (text: string, taskRef?: string) => {
      if (taskRef) {
        // Mark the associated task as done optimistically
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskRef ? { ...t, status: 'done' as TaskStatus } : t)),
        );
      }
      const optimistic: ThreadMessage = {
        id: `local-${++_localMsgId}`,
        thread_id: threadId,
        role: 'user',
        content: text,
        task_ref: taskRef ?? null,
        meta: {},
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, optimistic]);
      setSentCount((c) => c + 1);
      try {
        await sendMessage(threadId, text, taskRef);
        setTimeout(() => refresh(), 250);
      } catch (e) {
        console.error('sendMessage failed', e);
      }
    },
    [sendMessage, threadId, refresh],
  );

  const handleSuggestionChoice = useCallback(
    (msg: ThreadMessage, chipLabel: string) => {
      // Remove the suggestion chip immediately
      setLocalMessages((prev) => prev.filter((m) => m.id !== msg.id));
      handleSendMessage(chipLabel).catch(console.error);
    },
    [handleSendMessage],
  );

  const chatCount = localMessages.length;

  const handleChatSend = useCallback(
    async (text: string, taskRef?: string) => {
      await handleSendMessage(text, taskRef);
    },
    [handleSendMessage],
  );

  if (!thread) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textFaint, fontSize: 13 }}>Loading…</Text>
      </View>
    );
  }

  const useNewChat = tab === 'chat' && config != null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: topInset, paddingLeft: 12, paddingRight: 16, paddingBottom: 8,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}
      >
        <View style={{ paddingLeft: 4, paddingRight: 2 }}>
          <SaarthiLogo size={26} />
        </View>
        {!embedded && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onClose}
            style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <BackIcon size={22} color={Colors.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Hashtag tag={thread.tag} size="xl" />
          <Text style={{ fontSize: 12, color: Colors.textFaint, fontWeight: '500', paddingLeft: 18 }}>
            {thread.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => setOptionsOpen(true)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <DotsIcon size={20} />
        </Pressable>
        {embedded && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close thread"
            onPress={onClose}
            style={{
              width: 32, height: 32, borderRadius: 16,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: Colors.bgCard,
              borderColor: Colors.border, borderWidth: 1,
            }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 18, fontWeight: '500', lineHeight: 20 }}>×</Text>
          </Pressable>
        )}
      </View>

      {/* Tab switcher */}
      <View
        style={{
          marginHorizontal: 16, marginTop: 6, marginBottom: 10,
          padding: 3,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border, borderWidth: 1, borderRadius: 12,
          flexDirection: 'row', gap: 2,
        }}
      >
        {(['summary', 'chat'] as const).map((id) => {
          const isA = tab === id;
          const label = id === 'summary' ? 'Summary' : 'Chat';
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isA }}
              onPress={() => setTab(id)}
              style={{
                flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                backgroundColor: isA ? Colors.bgCardElev : 'transparent',
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
                gap: 6,
              }}
            >
              <Text style={{ color: isA ? Colors.text : Colors.textDim, fontSize: 13, fontWeight: '600' }}>
                {label}
              </Text>
              {id === 'chat' && (
                <View
                  style={{
                    paddingVertical: 1, paddingHorizontal: 6, borderRadius: 999,
                    backgroundColor: isA ? theme.dim : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ fontSize: 10, color: isA ? theme.color : Colors.textFaint, fontWeight: '700' }}>
                    {chatCount}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Options popover */}
      {optionsOpen && (
        <Pressable
          onPress={() => setOptionsOpen(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: topInset + 44, right: 12,
              backgroundColor: Colors.bgElev,
              borderColor: Colors.border, borderWidth: 1,
              borderRadius: 14,
              minWidth: 200,
              shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Pressable
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="Delete thread"
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 13, paddingHorizontal: 14,
                backgroundColor: pressed ? 'rgba(255,77,77,0.08)' : 'transparent',
                borderRadius: 14,
              })}
            >
              <Text style={{ fontSize: 16 }}>🗑</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.danger }}>Delete thread</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}

      {/* Content */}
      {useNewChat ? (
        <ThreadChat
          thread={thread}
          tasks={localTasks}
          messages={localMessages}
          onSend={handleChatSend}
          onMic={onMic}
          bottomInset={bottomInset}
          sentCount={sentCount}
        />
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 170 }}
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'summary' && config != null ? (
              <config.SummaryView
                thread={thread}
                tasks={localTasks}
                messages={localMessages}
                onToggleTask={handleToggleTask}
                onSendMessage={handleSendMessage}
                onSuggestionChoice={handleSuggestionChoice}
              />
            ) : tab === 'chat' ? (
              <ThreadChatTab thread={thread} messages={localMessages} />
            ) : null}
          </ScrollView>

          {/* Composer */}
          <Composer
            accent={theme.color}
            hashtag={thread.tag}
            placeholder={tab === 'summary' ? `add to ${thread.tag}…` : 'Message Saarthi…'}
            paddingBottom={Math.max(bottomInset, 12) + 16}
            onSend={(text) => handleSendMessage(text).catch(console.error)}
            onMic={onMic}
          />
        </>
      )}
    </View>
  );
}

// ── Snapshot modal helpers (history sheet removed — period_key-based model) ──

/**
 * Read-only snapshot of a past occurrence. Used when navigating to a closed thread.
 */
export function ThreadSnapshot({
  threadId,
  topInset = 50,
  onClose,
}: {
  threadId: string;
  topInset?: number;
  onClose: () => void;
}) {
  const { thread, tasks, messages } = useThread(threadId);
  const config = thread?.template ? TEMPLATE_REGISTRY[thread.template] : undefined;

  if (!thread || !config) return null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View
        style={{
          paddingTop: topInset, paddingHorizontal: 16, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderBottomColor: Colors.border, borderBottomWidth: 1,
        }}
      >
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <BackIcon size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700' }}>
            {thread.title ?? 'Past Occurrence'}
          </Text>
          <Text style={{ color: Colors.textFaint, fontSize: 12, marginTop: 1 }}>read-only</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <config.SummaryView
          thread={thread}
          tasks={tasks}
          messages={messages}
          readOnly
        />
      </ScrollView>
    </View>
  );
}
