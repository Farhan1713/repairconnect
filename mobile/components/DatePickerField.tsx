import { useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function DatePickerField({ onChange }: { onChange?: (d: Date) => void }) {
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);

  const handle = (_: DateTimePickerEvent, selected?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selected) {
      setDate(selected);
      onChange?.(selected);
    }
  };

  return (
    <View style={{ marginVertical: 8 }}>
      <Text>Preferred repair date: {date.toDateString()}</Text>
      <Button title="Pick a date" onPress={() => setShow(true)} />
      {show && (
        <DateTimePicker value={date} mode="date" minimumDate={new Date()} onChange={handle} />
      )}
    </View>
  );
}
