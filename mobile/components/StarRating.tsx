import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

type Props = {
  value?: number;
  readOnly?: boolean;
  size?: number;
  onRate?: (n: number) => void;
};

function Star({ filled, size, disabled, onPress }: {
  filled: boolean; size: number; disabled: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = () => {
    scale.value = withSequence(withSpring(1.5), withSpring(1));
    onPress();
  };

  return (
    <TouchableOpacity disabled={disabled} onPress={press}>
      <Animated.Text style={[{ fontSize: size, color: filled ? '#f5a623' : '#bbb' }, style]}>
        {filled ? '★' : '☆'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function StarRating({ value = 0, readOnly = false, size = 28, onRate }: Props) {
  const [rating, setRating] = useState(Math.round(value));

  const rate = (n: number) => {
    if (readOnly) return;
    setRating(n);
    onRate?.(n);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rating} size={size} disabled={readOnly} onPress={() => rate(n)} />
      ))}
      <Text style={{ marginLeft: 8 }}>{rating > 0 ? `${rating}/5` : 'Not rated'}</Text>
    </View>
  );
}
