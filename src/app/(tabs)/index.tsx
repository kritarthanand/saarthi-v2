import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-fg font-rounded text-2xl">Saarthi V2</Text>
        <Text className="text-fg-muted mt-2 text-center">
          Threads tab is where the new UX lives.
        </Text>
      </View>
    </SafeAreaView>
  );
}
