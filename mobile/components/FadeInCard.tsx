import { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function FadeInCard({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      {children}
    </Animated.View>
  );
}
