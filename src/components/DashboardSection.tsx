"use client"

import type React from "react"
import { StyleSheet, View } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import Text from "./ui/Text"

interface DashboardSectionProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, children, action }) => {
  const { theme } = useTheme()

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text variant="subtitle" style={[styles.title, { color: theme.colors.primaryText }]}>
          {title}
        </Text>
        {action && <View style={styles.actionContainer}>{action}</View>}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: "600",
  },
  actionContainer: {},
  content: {},
})

export default DashboardSection
