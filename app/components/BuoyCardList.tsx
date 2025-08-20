import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import BuoyCard from './BuoyCard';
import { BuoyData } from '../services/buoyService';

interface BuoyCardListProps {
  data: BuoyData[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

const BuoyCardList: React.FC<BuoyCardListProps> = ({ data, refreshing = false, onRefresh }) => {
  const renderBuoyCard = ({ item }: { item: BuoyData }) => (
    <View style={styles.cardContainer}>
      <BuoyCard data={item} />
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderBuoyCard}
      keyExtractor={(item) => `${item.Buoy}-${item.ID}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  cardContainer: {
    marginBottom: 8,
  },
  separator: {
    height: 16,
  },
});

export default BuoyCardList;
