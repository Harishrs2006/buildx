import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';

// Pickup → drop route used by the driver cards
export function Route({ from, to, toPhone }: { from?: string; to: string; toPhone?: string }) {
  return (
    <View>
      <View style={route.row}>
        <View style={route.rail}>
          <View style={route.from} />
          <View style={route.line} />
        </View>
        <View style={route.text}>
          <Text style={route.label}>PICK UP</Text>
          <Text style={route.value}>{from ?? 'Supplier'}</Text>
        </View>
      </View>
      <View style={route.row}>
        <View style={route.rail}><View style={route.to} /></View>
        <View style={route.text}>
          <Text style={route.label}>DELIVER TO</Text>
          <Text style={route.value} numberOfLines={2}>{to}</Text>
          {toPhone ? <Text style={route.phone}>{toPhone}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const route = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { width: 14, alignItems: 'center' },
  from: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: Colors.ink, marginTop: 4 },
  to: { width: 12, height: 12, borderRadius: 3, backgroundColor: Colors.ink, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: Colors.sand4, marginVertical: 4, minHeight: 18 },
  text: { flex: 1, paddingBottom: 12 },
  label: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 1.2, color: Colors.stone },
  value: { fontFamily: Font.semiBold, fontSize: 15, lineHeight: 20, color: Colors.ink, marginTop: 2 },
  phone: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
});
