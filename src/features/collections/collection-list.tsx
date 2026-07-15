import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme/tokens';

export type CollectionListItem = {
  id: string;
  createdAt: string;
};

type CollectionListProps<Item extends CollectionListItem> = {
  items: Item[];
  emptyMessage: string;
  bottomPadding: number;
  getText: (item: Item) => string;
  getLabel?: (item: Item) => string;
};

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CollectionList<Item extends CollectionListItem>({
  items,
  emptyMessage,
  bottomPadding,
  getText,
  getLabel,
}: CollectionListProps<Item>) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{emptyMessage}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          {getLabel ? (
            <View style={styles.typeLabel}>
              <Text style={styles.typeLabelText}>{getLabel(item)}</Text>
            </View>
          ) : null}
          <Text style={styles.itemText}>{getText(item)}</Text>
          <Text style={styles.itemDate}>{formatCreatedAt(item.createdAt)}</Text>
        </View>
      )}
      contentContainerStyle={[
        styles.listContent,
        items.length === 0 && styles.emptyListContent,
        { paddingBottom: bottomPadding },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  item: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  typeLabel: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.navigationActive,
  },
  typeLabelText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
