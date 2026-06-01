import { useEffect, useState } from 'react';
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
import { VoiceSession, type VoiceSavePayload } from '@/components/voice/VoiceSession';
import { Colors, threadTheme } from '@/constants/theme';
import type { Thread } from '@/lib/mockData';
import { TODAY_THREADS } from '@/lib/mockData';

type DeviceMode = 'phone' | 'ipad' | 'web';

function detectMode(width: number): DeviceMode {
  if (width >= 1180) return 'web';
  if (width >= 820) return 'ipad';
  return 'phone';
}

export default function AppRoot() {
  const { width } = useWindowDimensions();
  const mode = detectMode(width);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabId>('today');
  const [openThreadId, setOpenThreadId] = useState<string | null>(mode === 'phone' ? null : 'morning');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [customThreads, setCustomThreads] = useState<Thread[]>([]);

  // When the screen mode flips, sync default state.
  useEffect(() => {
    if (mode !== 'phone' && !openThreadId) setOpenThreadId('morning');
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = ({ tag, messages, elapsed }: VoiceSavePayload) => {
    const userMsgs = messages.filter((m) => m.from === 'me');
    const id = 'note-' + Date.now();
    const newThread: Thread = {
      id, tag, kind: 'note',
      subtitle: `${userMsgs.length} thoughts · just now`,
      timeAgo: 'just now',
      messages, elapsed, items: [],
      pointsEarned: 0, pointsTotal: 0,
      preview: userMsgs.slice(0, 2).map((m) => m.text),
    };
    setCustomThreads((prev) => [newThread, ...prev]);
    setTab('today');
    setTimeout(() => setOpenThreadId(id), 200);
  };

  const activeAccent = openThreadId
    ? threadTheme(
        [...TODAY_THREADS, ...customThreads].find((t) => t.id === openThreadId)?.tag || '#MorningRitual'
      ).color
    : Colors.accent;

  // ── Phone layout ────────────────────────────────────────────────────────
  if (mode === 'phone') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {tab === 'today' && (
          <TodayView onOpenThread={setOpenThreadId} customThreads={customThreads} topInset={Math.max(insets.top, 12) + 36} />
        )}
        {tab === 'chat' && <ChatHistoryView onOpenThread={setOpenThreadId} topInset={Math.max(insets.top, 12) + 36} />}
        {tab === 'week' && (
          <PlaceholderView title="Week" subtitle="Trends and stretches across your last 7 days" topInset={Math.max(insets.top, 12) + 36} />
        )}
        {tab === 'profile' && (
          <PlaceholderView title="Profile" subtitle="Settings, integrations, your Saarthi character" topInset={Math.max(insets.top, 12) + 36} />
        )}

        {/* Pushed Thread Detail */}
        {openThreadId && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <ThreadDetail
              threadId={openThreadId}
              customThreads={customThreads}
              onClose={() => setOpenThreadId(null)}
              onMic={() => setVoiceOpen(true)}
              topInset={Math.max(insets.top, 12) + 34}
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

        {/* Voice modal */}
        <Modal visible={voiceOpen} animationType="fade" transparent>
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <VoiceSession
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={[...TODAY_THREADS, ...customThreads]}
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
        {tab === 'today' && (
          <TodayView onOpenThread={setOpenThreadId} customThreads={customThreads} topInset={28} />
        )}
        {tab === 'chat' && <ChatHistoryView onOpenThread={setOpenThreadId} topInset={28} />}
        {tab === 'week' && <PlaceholderView title="Week" subtitle="Trends across your last 7 days" topInset={28} />}
        {tab === 'profile' && (
          <PlaceholderView title="Profile" subtitle="Settings & your Saarthi character" topInset={28} />
        )}
      </View>

      {/* Detail pane */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {openThreadId ? (
          <ThreadDetail
            key={openThreadId}
            threadId={openThreadId}
            customThreads={customThreads}
            embedded
            topInset={20}
            onClose={() => setOpenThreadId(null)}
            onMic={() => setVoiceOpen(true)}
          />
        ) : (
          <EmptyDetail />
        )}
      </View>

      {/* Floating mic */}
      <FloatingMic accent={activeAccent} onPress={() => setVoiceOpen(true)} hidden={voiceOpen} bottom={28} right={28} />

      {/* Voice modal */}
      {voiceOpen && (
        <Pressable
          onPress={() => setVoiceOpen(false)}
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
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={[...TODAY_THREADS, ...customThreads]}
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
