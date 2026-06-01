import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import { SUGGESTED_NEW_TAGS, type ChatMessage, type Thread } from '@/lib/mockData';
import { Hashtag } from '../Hashtag';
import { MicIcon } from '../icons';

const SIM_USER_LINES = [
  'Okay so I want to think out loud for a minute about this week.',
  "I'm feeling pulled in three directions and I'm losing focus by Wednesday.",
  "The roadmap doc is the most important thing — that's what gives the team clarity for Q3.",
  'But I keep getting hijacked by review feedback that feels urgent in the moment.',
  'Maybe I should batch reviews to a single window in the afternoon?',
  "Also I want to protect mornings for the deep work — they're my best hours.",
];
const SIM_AI_LINES = [
  "I'm with you. Sounds like fragmentation is the real cost, not the reviews themselves.",
  'Do you want me to block 9–12 as protected and put a single review window at 4?',
];

const fmt = (s: number) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export type VoiceSavePayload = {
  tag: string;
  messages: ChatMessage[];
  elapsed: number;
};

export function VoiceSession({
  accent = Colors.accent,
  maxSeconds = 120,
  warnSeconds = 30,
  existingThreads,
  onClose,
  onSave,
  topInset = 50,
}: {
  accent?: string;
  maxSeconds?: number;
  warnSeconds?: number;
  existingThreads: Thread[];
  onClose: () => void;
  onSave?: (payload: VoiceSavePayload) => void;
  topInset?: number;
}) {
  const [hashtag, setHashtag] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const [newTagDraft, setNewTagDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // Persist transcript-typer position across effect tear-downs (e.g. opening the hashtag
  // picker mid-stream). Without this, re-running the effect rewinds `i` to 0 and the
  // partial bubble blanks out.
  const cursorRef = useRef<{ lineIdx: number; i: number }>({ lineIdx: 0, i: 0 });

  const tagTheme = hashtag ? threadTheme(hashtag) : { color: accent, dim: accent + '24', glyph: '✦' };

  // Timer
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((e) => Math.min(e + 0.1, maxSeconds)), 100);
    return () => clearInterval(t);
  }, [recording, maxSeconds]);

  const remaining = maxSeconds - elapsed;
  const isWarn = remaining <= warnSeconds && remaining > 0;
  const isOver = remaining <= 0;
  const showTimer = isWarn || isOver;
  const ringColor = isOver ? Colors.danger : isWarn ? Colors.warn : tagTheme.color;

  useEffect(() => {
    if (isOver && recording) setRecording(false);
  }, [isOver, recording]);

  // Simulated transcript stream
  useEffect(() => {
    if (!recording || showPicker) return;
    let cancelled = false;
    const lineIdx = messages.filter((m) => m.from === 'me').length;
    const aiIdx = messages.filter((m) => m.from === 'ai').length;

    const wantAi = lineIdx > 0 && lineIdx % 2 === 0 && aiIdx < lineIdx / 2 && SIM_AI_LINES[aiIdx];
    if (wantAi) {
      const t = setTimeout(() => {
        if (cancelled) return;
        setMessages((m) => [...m, { from: 'ai', text: SIM_AI_LINES[aiIdx]! }]);
      }, 600);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    const next = SIM_USER_LINES[lineIdx];
    if (!next) return;
    // Resume from where the previous tear-down left off if we're still on the same line.
    if (cursorRef.current.lineIdx !== lineIdx) {
      cursorRef.current = { lineIdx, i: 0 };
    }
    let i = cursorRef.current.i;
    if (i > 0) setPartial(next.slice(0, i));
    const tick = setInterval(() => {
      if (cancelled) return;
      i += 2;
      cursorRef.current.i = i;
      setPartial(next.slice(0, i));
      if (i >= next.length) {
        clearInterval(tick);
        setTimeout(() => {
          if (cancelled) return;
          setMessages((m) => [...m, { from: 'me', text: next }]);
          setPartial('');
          cursorRef.current = { lineIdx: lineIdx + 1, i: 0 };
        }, 250);
      }
    }, 60);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [messages, recording, showPicker]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, partial]);

  const finalize = () => {
    const userMsgs = messages.filter((m) => m.from === 'me');
    if (userMsgs.length > 0) {
      onSave?.({ tag: hashtag || '#Note', messages, elapsed });
    }
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: topInset, paddingLeft: 12, paddingRight: 16, paddingBottom: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderBottomColor: Colors.border, borderBottomWidth: 1,
        }}
      >
        <Pressable
          onPress={finalize}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>×</Text>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          {hashtag ? (
            <Pressable
              onPress={() => setShowPicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Hashtag tag={hashtag} size="lg" />
              <Text style={{ fontSize: 11, color: Colors.textFaint, fontWeight: '500' }}>change ↓</Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 14, color: Colors.textDim, fontWeight: '600' }}>
              choose a thread to capture this in
            </Text>
          )}
          <Text style={{ fontSize: 11.5, color: Colors.textFaint, fontWeight: '500' }}>
            {recording ? 'transcribing live' : 'paused'} · {messages.filter((m) => m.from === 'me').length} thoughts
            captured
          </Text>
        </View>
      </View>

      {showPicker && (
        <View
          style={{
            paddingVertical: 12, paddingHorizontal: 16,
            backgroundColor: Colors.bgElev,
            borderBottomColor: Colors.border, borderBottomWidth: 1, gap: 10,
          }}
        >
          <Text
            style={{
              fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
              letterSpacing: 1, textTransform: 'uppercase',
            }}
          >
            existing threads
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {existingThreads.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  setHashtag(t.tag);
                  setShowPicker(false);
                }}
              >
                <Hashtag tag={t.tag} size="md" />
              </Pressable>
            ))}
          </View>
          <Text
            style={{
              fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
              letterSpacing: 1, textTransform: 'uppercase', marginTop: 4,
            }}
          >
            ✦ Saarthi suggests
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_NEW_TAGS.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setHashtag(t);
                  setShowPicker(false);
                }}
              >
                <Hashtag tag={t} size="md" />
              </Pressable>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
              paddingVertical: 8, paddingHorizontal: 12,
              backgroundColor: Colors.bgCard,
              borderRadius: 999, borderColor: Colors.border, borderWidth: 1,
            }}
          >
            <Text style={{ color: Colors.textFaint, fontSize: 14, fontWeight: '700' }}>#</Text>
            <TextInput
              value={newTagDraft}
              onChangeText={(v) => setNewTagDraft(v.replace(/[^A-Za-z0-9]/g, ''))}
              placeholder="NameANewThread"
              placeholderTextColor={Colors.textFaint}
              style={{ flex: 1, color: Colors.text, fontSize: 13, fontWeight: '500' }}
            />
            <Pressable
              disabled={!newTagDraft}
              onPress={() => {
                if (newTagDraft) {
                  setHashtag('#' + newTagDraft);
                  setShowPicker(false);
                }
              }}
              style={{
                paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999,
                backgroundColor: newTagDraft ? accent : 'rgba(255,255,255,0.06)',
              }}
            >
              <Text
                style={{
                  fontSize: 11.5, fontWeight: '700',
                  color: newTagDraft ? '#fff' : Colors.textFaint,
                }}
              >
                create
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Chat scroll area */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16, paddingBottom: 140, gap: 14,
          minHeight: '100%',
        }}
      >
        {messages.length === 0 && !partial && (
          <View
            style={{
              flex: 1, alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingHorizontal: 24, paddingVertical: 40,
            }}
          >
            <View
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: Colors.green,
              }}
            />
            <Text style={{ fontSize: 16, color: Colors.text, fontWeight: '500', textAlign: 'center', lineHeight: 22 }}>
              I&apos;m listening. Start talking — I&apos;ll transcribe as you go.
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textFaint, fontWeight: '500' }}>
              {Math.floor(maxSeconds / 60)}:{String(maxSeconds % 60).padStart(2, '0')} max · I&apos;ll warn you at{' '}
              {warnSeconds}s left
            </Text>
          </View>
        )}
        {messages.map((m, i) =>
          m.from === 'ai' ? (
            <View key={i} style={{ maxWidth: '88%', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: Colors.accent,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10.5, color: Colors.textFaint, fontWeight: '700',
                    letterSpacing: 1, textTransform: 'uppercase',
                  }}
                >
                  Saarthi
                </Text>
              </View>
              <Text style={{ fontSize: 14.5, color: Colors.text, lineHeight: 21 }}>{m.text}</Text>
            </View>
          ) : (
            <View
              key={i}
              style={{
                alignSelf: 'flex-end', maxWidth: '82%',
                paddingVertical: 10, paddingHorizontal: 14,
                borderRadius: 18, borderBottomRightRadius: 4,
                backgroundColor: tagTheme.color,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '500', lineHeight: 20 }}>{m.text}</Text>
            </View>
          )
        )}
        {partial.length > 0 && (
          <View
            style={{
              alignSelf: 'flex-end', maxWidth: '82%',
              paddingVertical: 10, paddingHorizontal: 14,
              borderRadius: 18, borderBottomRightRadius: 4,
              backgroundColor: tagTheme.color + '40',
              borderWidth: 1, borderColor: tagTheme.color + '80',
              borderStyle: 'dashed',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '500', lineHeight: 20 }}>
              {partial}
              <Text style={{ opacity: 0.6 }}>▍</Text>
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingTop: 14, paddingHorizontal: 16, paddingBottom: 28,
          flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10,
        }}
      >
        <View
          style={{
            flex: 1, gap: 6,
            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16,
            backgroundColor: showTimer ? ringColor + '14' : 'rgba(255,255,255,0.04)',
            borderWidth: 1, borderColor: showTimer ? ringColor + '40' : Colors.border,
            minHeight: 56,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: recording ? ringColor : Colors.textFaint,
              }}
            />
            <Text
              style={{
                fontSize: 12, color: showTimer ? ringColor : Colors.textDim,
                fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase',
              }}
            >
              {isOver ? 'time up' : isWarn ? `wrap up · ${fmt(remaining)} left` : recording ? 'listening' : 'paused'}
            </Text>
          </View>
          {showTimer ? (
            <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${100 * (remaining / warnSeconds)}%`,
                  backgroundColor: ringColor,
                  borderRadius: 2,
                }}
              />
            </View>
          ) : (
            <Text style={{ fontSize: 11.5, color: Colors.textFaint, fontWeight: '500' }}>
              {fmt(elapsed)} · {Math.floor(maxSeconds / 60)}:{String(maxSeconds % 60).padStart(2, '0')} cap
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => (recording ? finalize() : setRecording(true))}
          style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: isOver ? Colors.danger : isWarn ? Colors.warn : recording ? ringColor : Colors.bgCardElev,
            borderWidth: recording ? 0 : 1, borderColor: Colors.borderStrong,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {recording ? (
            <View style={{ width: 18, height: 18, backgroundColor: '#fff', borderRadius: 4 }} />
          ) : (
            <MicIcon size={26} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
