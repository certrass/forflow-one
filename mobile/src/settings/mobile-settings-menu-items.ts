import { Bell, Globe, Info, MessageSquare, Mic, Terminal, Wrench } from 'lucide-react-native'
import type { MobileSettingsMenuItem } from './mobile-settings-menu'

export function mobileSettingsMenuItems(push: (route: string) => void): MobileSettingsMenuItem[] {
  return [
    { label: '终端', icon: Terminal, onPress: () => push('/terminal-settings') },
    { label: '会话显示', icon: MessageSquare, onPress: () => push('/native-chat-settings') },
    { label: '浏览器', icon: Globe, onPress: () => push('/browser-settings') },
    { label: '语音', icon: Mic, onPress: () => push('/voice-settings') },
    { label: '通知', icon: Bell, onPress: () => push('/notifications') },
    { label: '连接诊断', icon: Wrench, onPress: () => push('/troubleshoot') },
    { label: '关于', icon: Info, onPress: () => push('/about') }
  ]
}
