import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface BuoyEchoAnimationProps {
  size?: number;
  color?: string;
  duration?: number;
  delay?: number;
  isActive?: boolean;
}

const BuoyEchoAnimation: React.FC<BuoyEchoAnimationProps> = ({
  size = 120,
  color = '#0ea5e9',
  duration = 2000,
  delay = 0,
  isActive = true,
}) => {
  const animatedValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (!isActive) {
      // Stop all animations when not active
      animatedValues.forEach(anim => anim.setValue(0));
      return;
    }

    const animations = animatedValues.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay + index * 400),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }),
        ])
      );
    });

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [animatedValues, duration, delay, isActive]);

  const echoCircles = animatedValues.map((anim, index) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });

    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.1, 0],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.echoCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {echoCircles}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  echoCircle: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});

export default BuoyEchoAnimation;
