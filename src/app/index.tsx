import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHistoryView } from '@/components/chat/ChatHistoryView';
import { CoachDetail } from '@/components/coaches/CoachDetail';
import { CoachesPane } from '@/components/coaches/CoachesPane';
import { ProfilePane } from '@/components/profile/ProfilePane';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { PlaceholderView } from '@/components/shell/PlaceholderView';
import { Sidebar, type TabId } from '@/components/shell/Sidebar';
import { EmptyDetail } from '@/components/shell/EmptyDetail';
import { NewThreadModal } from '@/components/thread/NewThreadModal';
import { ThreadDetail } from '@/components/thread/ThreadDetail';
import { TodayView } from '@/components/today/TodayView';
import { FloatingMic } from '@/components/voice/FloatingMic';
import { VoiceSession, type VoiceSavePayload, type VoiceSessionHandle } from '@/components/voice/VoiceSession';
import { COACHES_BY_ID, type CoachId } from '@/constants/pandavas';
import { Colors, threadTheme } from '@/constants/theme';
import { useEnsureToday, useThreads } from '@/lib/threads.hooks';

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
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<CoachId | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // ── Live data from API ─────────────────────────────────────────────────────
  // today: true → period-key-filtered list for TodayView + "active now" chips
  const { threads, refresh } = useThreads({ today: true });
  const ensureToday = useEnsureToday();

  // On first load, ensure the user's opt-in scheduled templates (e.g. morning +
  // evening ritual) exist for today, then refresh. Runs once per app launch;
  // the server tracks per-period marks so a deleted ritual won't resurrect.
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (ensuredRef.current) return;
    ensuredRef.current = true;
    ensureToday()
      .then(() => refresh())
      .catch((e) => console.warn('ensure-today failed', e));
  }, [ensureToday, refresh]);

  // First-load: auto-open morning ritual on iPad/web so the detail pane isn't empty.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (mode === 'phone') return;
    if (threads.length === 0) return;
    autoOpenedRef.current = true;
    const morning = threads.find((t) => t.template === 'morning_ritual');
    setOpenThreadId(morning?.id ?? threads[0]!.id);
  }, [threads, mode]);

  // Voice "note" flow stub — not yet designed for V2.
  const handleSave = useCallback((_payload: VoiceSavePayload) => {
    console.warn('Voice save dropped — note template not yet wired.');
  }, []);

  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) : undefined;
  const activeAccent = openThread ? threadTheme(openThread.tag).color : Colors.accent;
  const coachDetailOpen = tab === 'coaches' && !!selectedCoachId;

  const handleTabChange = (next: TabId) => {
    setTab(next);
    setOpenThreadId(null);
    setSelectedCoachId(null);
  };

  // ── Phone layout ────────────────────────────────────────────────────────
  if (mode === 'phone') {
    const phoneTopInset = Math.max(insets.top, 12) + 36;
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {tab === 'today' && (
          <TodayView threads={threads} onOpenThread={setOpenThreadId} onNew={() => setNewThreadOpen(true)} topInset={phoneTopInset} />
        )}
        {tab === 'chat' && (
          <ChatHistoryView activeThreads={threads} onOpenThread={setOpenThreadId} onNew={() => setNewThreadOpen(true)} topInset={phoneTopInset} />
        )}
        {tab === 'week' && (
          <PlaceholderView title="Week" subtitle="Trends and stretches across your last 7 days" topInset={phoneTopInset} />
        )}
        {tab === 'coaches' && (
          <CoachesPane
            selectedCoachId={selectedCoachId}
            onSelectCoach={setSelectedCoachId}
            topInset={phoneTopInset}
          />
        )}
        {tab === 'profile' && <ProfilePane topInset={phoneTopInset} />}

        {coachDetailOpen && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <CoachDetail
              coach={COACHES_BY_ID[selectedCoachId!]}
              onClose={() => setSelectedCoachId(null)}
              onOpenThread={setOpenThreadId}
              topInset={Math.max(insets.top, 12) + 34}
              bottomInset={Math.max(insets.bottom, 12)}
            />
          </View>
        )}

        {openThreadId && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <ThreadDetail
              threadId={openThreadId}
              onClose={() => { setOpenThreadId(null); refresh(); }}
              onMic={() => setVoiceOpen(true)}
              topInset={Math.max(insets.top, 12) + 34}
              bottomInset={Math.max(insets.bottom, 12)}
            />
          </View>
        )}

        <FloatingMic
          accent={activeAccent}
          onPress={() => setVoiceOpen(true)}
          hidden={voiceOpen || !!openThreadId || coachDetailOpen}
          bottom={96 + Math.max(insets.bottom - 8, 0)}
        />

        {!openThreadId && !coachDetailOpen && (
          <MobileTabBar active={tab} onChange={handleTabChange} />
        )}

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
              existingThreads={[]}
              onSave={handleSave}
              onClose={() => setVoiceOpen(false)}
              topInset={Math.max(insets.top, 12) + 34}
            />
          </View>
        </Modal>

        <Modal
          visible={newThreadOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setNewThreadOpen(false)}
        >
          <NewThreadModal
            topInset={Math.max(insets.top, 12) + 34}
            onClose={() => setNewThreadOpen(false)}
            onCreated={(id) => { setNewThreadOpen(false); setTab('today'); setOpenThreadId(id); refresh(); }}
          />
        </Modal>
      </View>
    );
  }

  // ── Desktop / iPad master-detail ────────────────────────────────────────
  const listWidth = mode === 'web' ? 408 : 340;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.bg }}>
      <Sidebar variant={mode} active={tab} onChange={handleTabChange} />

      {/* List pane */}
      <View
        style={{
          width: listWidth,
          borderRightColor: Colors.border, borderRightWidth: 1,
          overflow: 'hidden', backgroundColor: Colors.bg,
        }}
      >
        {tab === 'today' && <TodayView threads={threads} onOpenThread={setOpenThreadId} onNew={() => setNewThreadOpen(true)} topInset={28} />}
        {tab === 'chat' && <ChatHistoryView activeThreads={threads} onOpenThread={setOpenThreadId} onNew={() => setNewThreadOpen(true)} topInset={28} />}
        {tab === 'week' && <PlaceholderView title="Week" subtitle="Trends across your last 7 days" topInset={28} />}
        {tab === 'coaches' && (
          <CoachesPane
            selectedCoachId={selectedCoachId}
            onSelectCoach={setSelectedCoachId}
            topInset={28}
          />
        )}
        {tab === 'profile' && <ProfilePane topInset={28} />}
      </View>

      {/* Detail pane */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {newThreadOpen ? (
          <NewThreadModal
            topInset={28}
            onClose={() => setNewThreadOpen(false)}
            onCreated={(id) => { setNewThreadOpen(false); setTab('today'); setOpenThreadId(id); refresh(); }}
          />
        ) : openThreadId ? (
          <ThreadDetail
            key={openThreadId}
            threadId={openThreadId}
            onClose={() => { setOpenThreadId(null); refresh(); }}
            onMic={() => setVoiceOpen(true)}
            embedded
            topInset={20}
            bottomInset={0}
          />
        ) : coachDetailOpen ? (
          <CoachDetail
            key={selectedCoachId!}
            coach={COACHES_BY_ID[selectedCoachId!]}
            embedded
            topInset={28}
            onOpenThread={setOpenThreadId}
          />
        ) : (
          <EmptyDetail />
        )}
      </View>

      <FloatingMic
        accent={activeAccent}
        onPress={() => setVoiceOpen(true)}
        hidden={voiceOpen || !!openThreadId}
        bottom={28}
        right={28}
      />

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
              existingThreads={[]}
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
