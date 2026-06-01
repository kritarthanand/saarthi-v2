import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHistoryView } from '@/components/chat/ChatHistoryView';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { PlaceholderView } from '@/components/shell/PlaceholderView';
import { Sidebar, type TabId } from '@/components/shell/Sidebar';
import { EmptyDetail } from '@/components/shell/EmptyDetail';
import { ThreadDetail } from '@/components/thread/ThreadDetail';
import { TodayView } from '@/components/today/TodayView';
import { FloatingMic } from '@/components/voice/FloatingMic';
import { VoiceSession, type VoiceSavePayload, type VoiceSessionHandle } from '@/components/voice/VoiceSession';
import { Colors, threadTheme } from '@/constants/theme';
import type { ChatMessage, Thread } from '@/lib/mockData';
import { TODAY_THREADS } from '@/lib/mockData';

type DeviceMode = 'phone' | 'ipad' | 'web';

function detectMode(width: number): DeviceMode {
  if (width >= 1180) return 'web';
  if (width >= 820) return 'ipad';
  return 'phone';
}

const fmtTime = () =>
  new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function AppRoot() {
  const { width } = useWindowDimensions();
  const mode = detectMode(width);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabId>('today');
  // Default-open the morning thread on tablet/web so the detail pane isn't empty on first paint.
  // Frozen at mount on purpose — we don't want a window resize across the phone/iPad breakpoint
  // to either resurrect a thread the user just closed or trap a phone user in a detail overlay.
  const [openThreadId, setOpenThreadId] = useState<string | null>(() =>
    mode === 'phone' ? null : 'morning'
  );
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Lets the iPad/web backdrop tap delegate to the session's own `finalize` — which
  // saves any captured user lines before closing instead of dropping them.
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // Canonical thread store — toggled items + sent messages live here so they survive
  // the ThreadDetail remount that `key={openThreadId}` forces in the master-detail view.
  const [threadsById, setThreadsById] = useState<Record<string, Thread>>(() =>
    Object.fromEntries(TODAY_THREADS.map((t) => [t.id, t]))
  );
  const [threadOrder, setThreadOrder] = useState<string[]>(() => TODAY_THREADS.map((t) => t.id));

  const threads = useMemo(
    () => threadOrder.map((id) => threadsById[id]).filter((t): t is Thread => !!t),
    [threadOrder, threadsById]
  );

  const toggleItem = useCallback((threadId: string, itemId: string) => {
    setThreadsById((prev) => {
      const t = prev[threadId];
      if (!t) return prev;
      return {
        ...prev,
        [threadId]: {
          ...t,
          items: t.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
        },
      };
    });
  }, []);

  const appendMessage = useCallback((threadId: string, msg: ChatMessage) => {
    setThreadsById((prev) => {
      const t = prev[threadId];
      if (!t) return prev;
      return {
        ...prev,
        [threadId]: {
          ...t,
          appendedMessages: [...(t.appendedMessages || []), msg],
        },
      };
    });
  }, []);

  const handleSendMessage = useCallback(
    (threadId: string, text: string) => {
      appendMessage(threadId, { from: 'me', text, time: fmtTime() });
    },
    [appendMessage]
  );

  const handleItemMessage = useCallback(
    (threadId: string, itemLabel: string, text: string) => {
      // Keep `text` as the raw user input; `itemRef` carries the context so the chat
      // renderer can show a small "re: <label>" chip above the bubble instead of
      // embedding the label inside the message body.
      appendMessage(threadId, { from: 'me', text, time: fmtTime(), itemRef: itemLabel });
    },
    [appendMessage]
  );

  const handleSave = ({ tag, messages, elapsed }: VoiceSavePayload) => {
    const userMsgs = messages.filter((m) => m.from === 'me');
    if (userMsgs.length === 0) return;

    // Stamp clock times so the chat tab doesn't render "undefined".
    const stamped = userMsgs.map((m) => ({ ...m, time: m.time ?? fmtTime() }));

    // Capturing into an existing tag should *append* to that thread, not fork a new
    // duplicate-tag note next to it. Look up the live thread by tag; only fall through
    // to the new-note path when nothing matches.
    const existingId = threadOrder.find((id) => threadsById[id]?.tag === tag);
    if (existingId) {
      setThreadsById((prev) => {
        const t = prev[existingId];
        if (!t) return prev;
        return {
          ...prev,
          [existingId]:
            t.kind === 'note'
              ? { ...t, messages: [...(t.messages || []), ...stamped] }
              : { ...t, appendedMessages: [...(t.appendedMessages || []), ...stamped] },
        };
      });
      setTab('today');
      setOpenThreadId(existingId);
      return;
    }

    const createdAt = Date.now();
    const id = 'note-' + createdAt;
    const newThread: Thread = {
      id, tag, kind: 'note',
      // Fallback strings only render when `createdAt` is missing; live label is computed
      // via `timeAgoFor` / `subtitleFor` against `createdAt`.
      subtitle: `${userMsgs.length} thoughts · just now`,
      timeAgo: 'just now',
      createdAt,
      messages, elapsed, items: [],
      pointsEarned: 0, pointsTotal: 0,
      preview: userMsgs.slice(0, 2).map((m) => m.text),
    };
    setThreadsById((prev) => ({ ...prev, [id]: newThread }));
    setThreadOrder((prev) => [id, ...prev]);
    setTab('today');
    setOpenThreadId(id);
  };

  const openThread = openThreadId ? threadsById[openThreadId] : undefined;
  const activeAccent = openThread ? threadTheme(openThread.tag).color : Colors.accent;

  // ── Phone layout ────────────────────────────────────────────────────────
  if (mode === 'phone') {
    const phoneTopInset = Math.max(insets.top, 12) + 36;
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {tab === 'today' && (
          <TodayView threads={threads} onOpenThread={setOpenThreadId} topInset={phoneTopInset} />
        )}
        {tab === 'chat' && (
          <ChatHistoryView threads={threads} onOpenThread={setOpenThreadId} topInset={phoneTopInset} />
        )}
        {tab === 'week' && (
          <PlaceholderView title="Week" subtitle="Trends and stretches across your last 7 days" topInset={phoneTopInset} />
        )}
        {tab === 'profile' && (
          <PlaceholderView title="Profile" subtitle="Settings, integrations, your Saarthi character" topInset={phoneTopInset} />
        )}

        {/* Pushed Thread Detail */}
        {openThread && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <ThreadDetail
              thread={openThread}
              onToggleItem={(itemId) => toggleItem(openThread.id, itemId)}
              onSendMessage={(text) => handleSendMessage(openThread.id, text)}
              onItemMessage={(itemLabel, text) => handleItemMessage(openThread.id, itemLabel, text)}
              onClose={() => setOpenThreadId(null)}
              onMic={() => setVoiceOpen(true)}
              topInset={Math.max(insets.top, 12) + 34}
              bottomInset={Math.max(insets.bottom, 12)}
            />
          </View>
        )}

        {/* Floating mic */}
        <FloatingMic
          accent={activeAccent}
          onPress={() => setVoiceOpen(true)}
          hidden={voiceOpen || !!openThreadId}
          bottom={96 + Math.max(insets.bottom - 8, 0)}
        />

        {/* Bottom tabs */}
        {!openThreadId && (
          <MobileTabBar
            active={tab}
            onChange={(t) => {
              setTab(t);
              setOpenThreadId(null);
            }}
          />
        )}

        {/* Voice modal — `onRequestClose` is required on Android. Without it the system
            back button dismisses the modal but skips finalize, dropping the transcript. */}
        <Modal
          visible={voiceOpen}
          animationType="fade"
          transparent
          onRequestClose={() => voiceSessionRef.current?.dismiss()}
        >
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <VoiceSession
              ref={voiceSessionRef}
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={threads}
              onSave={handleSave}
              onClose={() => setVoiceOpen(false)}
              topInset={Math.max(insets.top, 12) + 34}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // ── Desktop / iPad master-detail ────────────────────────────────────────
  const listWidth = mode === 'web' ? 408 : 340;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.bg }}>
      <Sidebar variant={mode} active={tab} onChange={setTab} />

      {/* List pane */}
      <View
        style={{
          width: listWidth,
          borderRightColor: Colors.border, borderRightWidth: 1,
          overflow: 'hidden', backgroundColor: Colors.bg,
        }}
      >
        {tab === 'today' && <TodayView threads={threads} onOpenThread={setOpenThreadId} topInset={28} />}
        {tab === 'chat' && <ChatHistoryView threads={threads} onOpenThread={setOpenThreadId} topInset={28} />}
        {tab === 'week' && <PlaceholderView title="Week" subtitle="Trends across your last 7 days" topInset={28} />}
        {tab === 'profile' && (
          <PlaceholderView title="Profile" subtitle="Settings & your Saarthi character" topInset={28} />
        )}
      </View>

      {/* Detail pane — `key` cosmetically remounts; durable state lives in `threadsById`. */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {openThread ? (
          <ThreadDetail
            key={openThread.id}
            thread={openThread}
            onToggleItem={(itemId) => toggleItem(openThread.id, itemId)}
            onSendMessage={(text) => handleSendMessage(openThread.id, text)}
            onItemMessage={(itemLabel, text) => handleItemMessage(openThread.id, itemLabel, text)}
            embedded
            topInset={20}
            bottomInset={0}
            onClose={() => setOpenThreadId(null)}
            onMic={() => setVoiceOpen(true)}
          />
        ) : (
          <EmptyDetail />
        )}
      </View>

      {/* Floating mic — also hidden when a thread is open, so it doesn't overlap the
          Composer's own mic button in the detail pane (mirrors the phone branch). */}
      <FloatingMic
        accent={activeAccent}
        onPress={() => setVoiceOpen(true)}
        hidden={voiceOpen || !!openThreadId}
        bottom={28}
        right={28}
      />

      {/* Voice modal */}
      {voiceOpen && (
        <Pressable
          accessibilityLabel="Dismiss voice capture"
          onPress={() => voiceSessionRef.current?.dismiss()}
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: 440, height: 720,
              borderRadius: 28, overflow: 'hidden',
              borderColor: Colors.borderStrong, borderWidth: 1,
              backgroundColor: Colors.bg,
            }}
          >
            <VoiceSession
              ref={voiceSessionRef}
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={threads}
              onSave={handleSave}
              onClose={() => setVoiceOpen(false)}
              topInset={28}
            />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
