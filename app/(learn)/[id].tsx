import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Card, getLearnCards, saveLearning } from "@/data/api";
import { defaultStyleSheet } from "@/constants/Styles";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import LearnCard from "@/components/LearnCard";
import { Ionicons } from "@expo/vector-icons";

const Page = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { limit } = useLocalSearchParams<{ limit: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [textHidden, setTextHidden] = useState(false);
  const [correctCards, setCorrectCards] = useState(0);
  const [wrongCards, setWrongCards] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const rotate = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const frontAnimatedStyles = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotate.value, [0, 1], [0, 180]);
    return {
      transform: [
        {
          rotateY: withTiming(`${rotateValue}deg`, { duration: 600 }),
        },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const backAnimatedStyles = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotate.value, [0, 1], [180, 360]);
    return {
      transform: [
        {
          rotateY: withTiming(`${rotateValue}deg`, { duration: 600 }),
        },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const opacity = Math.abs(translateX.value) / 150;
    const backgroundColor =
      translateX.value > 0
        ? `rgba(34, 197, 94, ${Math.min(opacity, 0.3)})` // green
        : `rgba(239, 68, 68, ${Math.min(opacity, 0.3)})`; // red

    return {
      backgroundColor: translateX.value !== 0 ? backgroundColor : "transparent",
    };
  });

  useEffect(() => {
    const loadCards = async () => {
      const cards = await getLearnCards(id!, limit!);
      setCards(cards);
    };
    loadCards();
  }, []);

  // Toggle card flip
  const onFlipCard = () => {
    if (showFront) {
      rotate.value = 1;
      setShowFront(false);
    } else {
      rotate.value = 0;
      setShowFront(true);
    }
  };

  // Show next card
  const onNextCard = async (correct: boolean) => {
    // Animate swipe
    translateX.value = withSpring(correct ? 500 : -500, {}, () => {
      runOnJS(processNextCard)(correct);
    });
  };

  const processNextCard = (correct: boolean) => {
    if (currentIndex < cards.length - 1) {
      correct
        ? setCorrectCards(correctCards + 1)
        : setWrongCards(wrongCards + 1);

      rotate.value = 0;
      translateX.value = 0;
      translateY.value = 0;
      setTextHidden(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setTextHidden(false);
      }, 600);
    } else {
      setShowResult(true);
      // Save the user progress
      const correctResult = correctCards + (correct ? 1 : 0);
      const wrongResult = wrongCards + (correct ? 0 : 1);
      saveLearning(id, +limit, correctResult, wrongResult);
      setCorrectCards(correctResult);
      setWrongCards(wrongResult);
    }

    setShowFront(true);
  };

  const gestureHandler = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const threshold = 100;
      if (Math.abs(event.translationX) > threshold) {
        const correct = event.translationX > 0;
        translateX.value = withSpring(correct ? 500 : -500, {}, () => {
          runOnJS(processNextCard)(correct);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  return (
    <View style={defaultStyleSheet.container}>
      {showResult && (
        <View style={styles.container}>
          <Text style={styles.resultText}>
            {correctCards} correct, {wrongCards} wrong
          </Text>
          <Link href={"/(tabs)/sets"} asChild>
            <TouchableOpacity style={defaultStyleSheet.bottomButton}>
              <Text style={defaultStyleSheet.buttonText}>End session</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}

      {!showResult && cards.length > 0 && (
        <>
          <Text style={defaultStyleSheet.header}>
            {currentIndex + 1} / {cards.length}
          </Text>
          <Animated.View style={[styles.container, backgroundStyle]}>
            <GestureHandlerRootView>
              <GestureDetector gesture={gestureHandler}>
                <Animated.View>
                  <TouchableOpacity
                    style={styles.cardContainer}
                    onPress={onFlipCard}
                    activeOpacity={0.9}
                  >
                    <Animated.View
                      style={[styles.frontcard, frontAnimatedStyles]}
                    >
                      <LearnCard
                        card={cards[currentIndex]}
                        isFront={true}
                        textHidden={textHidden}
                      />
                    </Animated.View>
                    <Animated.View
                      style={[styles.backCard, backAnimatedStyles]}
                    >
                      <LearnCard card={cards[currentIndex]} isFront={false} />
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </GestureDetector>
            </GestureHandlerRootView>
            {!showFront && (
              <View style={styles.bottomView}>
                <TouchableOpacity
                  style={defaultStyleSheet.button}
                  onPress={() => onNextCard(true)}
                >
                  <Text style={defaultStyleSheet.buttonText}>Correct</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={defaultStyleSheet.button}
                  onPress={() => onNextCard(false)}
                >
                  <Text style={defaultStyleSheet.buttonText}>Wrong</Text>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    marginTop: 100,
  },
  cardContainer: {
    position: "relative",
  },
  frontcard: {
    position: "absolute",
    backfaceVisibility: "hidden",
  },
  backCard: {
    backfaceVisibility: "hidden",
  },
  bottomView: {
    position: "absolute",
    bottom: 40,
    width: 300,
    flex: 1,
  },
  resultText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export default Page;
