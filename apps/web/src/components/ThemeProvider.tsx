import { ThemeContextProvider } from '../hooks/useTheme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>
}
