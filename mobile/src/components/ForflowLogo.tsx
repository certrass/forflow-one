import { Image } from 'react-native'

type Props = { size?: number; color?: string }

export function ForflowLogo({ size = 24, color }: Props) {
  return (
    <Image
      source={require('../../assets/forflow-mark.png')}
      accessibilityLabel="Forflow One"
      style={{ width: size, height: size, ...(color ? { tintColor: color } : {}) }}
      resizeMode="contain"
    />
  )
}
