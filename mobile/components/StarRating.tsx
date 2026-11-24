import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Props = {
  value?: number;
  readOnly?: boolean;
  size?: number;
  onRate?: (n: number) => void;
};

export default function StarRating({ value = 0, readOnly = false, size = 28, onRate }: Props) {
  const [rating, setRating] = useState(Math.round(value));

  const press = (n: number) => {
    if (readOnly) return;
    setRating(n);
    onRate?.(n);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} disabled={readOnly} onPress={() => press(n)}>
          <Text style={{ fontSize: size, color: n <= rating ? '#f5a623' : '#bbb' }}>
            {n <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={{ marginLeft: 8 }}>{rating > 0 ? `${rating}/5` : 'Not rated'}</Text>
    </View>
  );
}
