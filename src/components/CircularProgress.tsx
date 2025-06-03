import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

interface CircularProgressProps {
  size?: number;
  progress: number;
  strokeWidth?: number;
  backgroundColor?: string;
  progressColor?: string;
  showText?: boolean;
  textColor?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 36,
  progress,
  strokeWidth = 3,
  backgroundColor,
  progressColor,
  showText = false,
  textColor,
}) => {
  const theme = useTheme();
  
  // Default colors from theme
  const bgColor = backgroundColor || theme.colors.surfaceVariant;
  const pgColor = progressColor || theme.colors.primary;
  const txtColor = textColor || theme.colors.onSurface;
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          stroke={bgColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke={pgColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.text, 
              { color: txtColor, fontSize: size * 0.25 }
            ]}
            numberOfLines={1}
          >
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CircularProgress;
