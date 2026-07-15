import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import type { ShoppingItem } from '../../entities/shopping-item/shopping-item';
import { colors, spacing, typography } from '../../theme/tokens';

type ShoppingCollectionListProps = {
  shoppingItems: ShoppingItem[];
  bottomPadding: number;
  onToggle: (shoppingItemId: string) => void;
};

type ShoppingSection = {
  title: 'Куплено' | null;
  data: ShoppingItem[];
};

export function ShoppingCollectionList({
  shoppingItems,
  bottomPadding,
  onToggle,
}: ShoppingCollectionListProps) {
  const activeItems = shoppingItems.filter(
    (shoppingItem) => !shoppingItem.checked,
  );
  const checkedItems = shoppingItems.filter(
    (shoppingItem) => shoppingItem.checked,
  );
  const sections: ShoppingSection[] = [
    ...(activeItems.length > 0
      ? [{ title: null, data: activeItems } satisfies ShoppingSection]
      : []),
    ...(checkedItems.length > 0
      ? [{ title: 'Куплено', data: checkedItems } satisfies ShoppingSection]
      : []),
  ];

  return (
    <SectionList
      sections={sections}
      keyExtractor={(shoppingItem) => shoppingItem.id}
      ListEmptyComponent={
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Пока покупок нет.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={item.title}
          onPress={() => onToggle(item.id)}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <Text style={[styles.checkbox, item.checked && styles.completedText]}>
            {item.checked ? '☑' : '☐'}
          </Text>
          <Text
            style={[
              styles.itemTitle,
              item.checked && styles.completedTitle,
            ]}
          >
            {item.title}
            {item.quantity === null ? '' : ` ×${item.quantity}`}
          </Text>
        </Pressable>
      )}
      renderSectionHeader={({ section }) =>
        section.title ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        ) : null
      }
      contentContainerStyle={[
        styles.listContent,
        sections.length === 0 && styles.emptyListContent,
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
  sectionHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.button,
    color: colors.textSecondary,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPressed: {
    opacity: 0.7,
  },
  checkbox: {
    ...typography.body,
    width: spacing.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  itemTitle: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
  },
  completedTitle: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  completedText: {
    color: colors.textSecondary,
    opacity: 0.7,
  },
});
