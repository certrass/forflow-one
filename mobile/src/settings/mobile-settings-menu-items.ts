import { Bell, Globe, MessageSquare, Mic, Terminal } from 'lucide-react-native'
import type { MobileSettingsMenuItem } from './mobile-settings-menu'

export function mobileSettingsMenuItems(push: (route: string) => void): MobileSettingsMenuItem[] {
  return [
    { label: '终端', icon: Terminal, onPress: () => push('/terminal-settings') },
    {
      label: '会话显示',
      description: '选择默认打开对话或终端视图',
      icon: MessageSquare,
      onPress: () => push('/native-chat-settings')
    },
    { label: '浏览器', icon: Globe, onPress: () => push('/browser-settings') },
    { label: '语音', icon: Mic, onPress: () => push('/voice-settings') },
    { label: '通知', icon: Bell, onPress: () => push('/notifications') }
  ]
}
