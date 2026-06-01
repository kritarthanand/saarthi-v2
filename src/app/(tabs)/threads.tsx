import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import type { Thread } from '@/types/threads';

export default function ThreadsScreen() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TODO: subscribe to supabase.auth.onAuthStateChange and refetch when the
  // session arrives — today this fires once on mount, so before auth lands
  // (or before sign-in completes) RLS will return zero rows and the screen
  // is stuck on the empty state.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('v2_threads')
        .select('*')
        .is('archived_at', null)
        .order('pinned', { ascending: false })
        .order('last_message_at', { ascending: false });
      if (!mounted) return;
      if (error) setError(error.message);
      else setThreads((data ?? []) as Thread[]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-5 pb-3 pt-2">
        <Text className="text-fg font-rounded text-3xl">Threads</Text>
      </View>

      {error ? (
        <View className="px-5">
          <Text className="text-fg-muted">Couldn’t load threads: {error}</Text>
        </View>
      ) : threads === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : threads.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-fg-muted text-center">
            No threads yet. They’ll show up here once you start one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <View className="border-border border-b px-5 py-4">
              <Text className="text-fg text-base">
                {item.icon ? `${item.icon}  ` : ''}
                {item.title}
              </Text>
              {item.summary ? (
                <Text className="text-fg-muted mt-1 text-sm" numberOfLines={2}>
                  {item.summary}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
