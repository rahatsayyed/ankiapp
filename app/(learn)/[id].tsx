import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import React, { useEffect, useState } from "react";
import { Link, useLocalSearchParams, router } from "expo-router";
import {
  getCardsDueForReview,
  getCardsByDifficultyBand,
  updateCardAfterReview,
  saveLearning,
  Rating,
  DifficultyBand,
} from "@/data/api";
import { DBCard, convertDBCardToFSRS } from "@/data/fsrs";
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

type PracticeMode = "fsrs" | "manual";

const Page = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [cards, setCards] = useState<DBCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFront, setShowFront] = useState(true);
  const [textHidden, setTextHidden] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [cardFlipTimestamp, setCardFlipTimestamp] = useState<number | null>(null);

  const [mode, setMode] = useState<PracticeMode>((initialMode as PracticeMode) || "fsrs");
  const [difficultyBand, setDifficultyBand] = useState<DifficultyBand>("Any");
  const [cardCount, setCardCount] = useState(10);

  const [againCount, setAgainCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [goodCount, setGoodCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);

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
        ? `rgba(34, 197, 94, ${Math.min(opacity, 0.3)})`
        : `rgba(239, 68, 68, ${Math.min(opacity, 0.3)})`;

    return {
      backgroundColor: translateX.value !== 0 ? backgroundColor : "transparent",
    };
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    if (mode === "fsrs") {
      const dueCards = await getCardsDueForReview(id!);
      setCards(dueCards);
    } else {
      const bandCards = await getCardsByDifficultyBand(id!, difficultyBand, cardCount);
      setCards(bandCards);
    }
  };

  const onFlipCard = () => {
    if (showFront) {
      rotate.value = 1;
      setShowFront(false);
      setCardFlipTimestamp(Date.now());
    } else {
      rotate.value = 0;
      setShowFront(true);
      setCardFlipTimestamp(null);
    }
  };

  const onRateCard = async (rating: Rating) => {
    if (currentIndex < cards.length - 1) {
      await updateCardAfterReview(cards[currentIndex].id, id!, rating);

      if (rating === Rating.Again) setAgainCount(againCount + 1);
      else if (rating === Rating.Hard) setHardCount(hardCount + 1);
      else if (rating === Rating.Good) setGoodCount(goodCount + 1);
      else if (rating === Rating.Easy) setEasyCount(easyCount + 1);

      rotate.value = 0;
      translateX.value = 0;
      translateY.value = 0;
      setTextHidden(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setTextHidden(false);
        setShowFront(true);
        setCardFlipTimestamp(null);
      }, 100);
    } else {
      setShowResult(true);
      await updateCardAfterReview(cards[currentIndex].id, id!, rating);

      const finalAgain = againCount + (rating === Rating.Again ? 1 : 0);
      const finalHard = hardCount + (rating === Rating.Hard ? 1 : 0);
      const finalGood = goodCount + (rating === Rating.Good ? 1 : 0);
      const finalEasy = easyCount + (rating === Rating.Easy ? 1 : 0);

      setAgainCount(finalAgain);
      setHardCount(finalHard);
      setGoodCount(finalGood);
      setEasyCount(finalEasy);

      const correctCount = finalGood + finalEasy;
      const wrongCount = finalAgain + finalHard;

      await saveLearning(
        id!,
        cards.length,
        correctCount,
        wrongCount,
        finalAgain,
        finalHard,
        finalGood,
        finalEasy
      );
    }
  };

  const processSwipeEnd = async (translationX: number) => {
    if (translationX < 0) {
      await onRateCard(Rating.Again);
    } else {
      const timeSinceFlip = cardFlipTimestamp ? (Date.now() - cardFlipTimestamp) / 1000 : 0;

      if (timeSinceFlip < 2) {
        await onRateCard(Rating.Easy);
      } else if (timeSinceFlip <= 5) {
        await onRateCard(Rating.Good);
      } else {
        await onRateCard(Rating.Hard);
      }
    }
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
      if (Math.abs(event.translationX) > threshold && !showFront) {
        const swipeRight = event.translationX > 0;
        translateX.value = withSpring(swipeRight ? 500 : -500, {}, () => {
          runOnJS(processSwipeEnd)(event.translationX);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const handleModeSwitch = async () => {
    const newMode = mode === "fsrs" ? "manual" : "fsrs";
    setMode(newMode);
    setCurrentIndex(0);
    setShowFront(true);
    setShowResult(false);
    setAgainCount(0);
    setHardCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setCardFlipTimestamp(null);

    if (newMode === "fsrs") {
      const dueCards = await getCardsDueForReview(id!);
      setCards(dueCards);
    } else {
      const bandCards = await getCardsByDifficultyBand(id!, difficultyBand, cardCount);
      setCards(bandCards);
    }
  };

  const handleDifficultyChange = async (newBand: DifficultyBand) => {
    setDifficultyBand(newBand);
    const bandCards = await getCardsByDifficultyBand(id!, newBand, cardCount);
    setCards(bandCards);
    setCurrentIndex(0);
    setShowFront(true);
    setCardFlipTimestamp(null);
  };

  const handleCardCountChange = async (newCount: number) => {
    setCardCount(newCount);
    const bandCards = await getCardsByDifficultyBand(id!, difficultyBand, newCount);
    setCards(bandCards);
    setCurrentIndex(0);
    setShowFront(true);
    setCardFlipTimestamp(null);
  };

  const handleContinue = () => {
    router.replace(`/(learn)/${id}?mode=fsrs`);
    setShowResult(false);
    setCurrentIndex(0);
    setShowFront(true);
    setAgainCount(0);
    setHardCount(0);
    setGoodCount(0);
    setEasyCount(0);
    setCardFlipTimestamp(null);
    loadCards();
  };

  const displayCard = cards[currentIndex]
    ? {
        id: cards[currentIndex].id,
        question: cards[currentIndex].question,
        answer: cards[currentIndex].answer,
        deck: cards[currentIndex].deck_id,
      }
    : null;

  return (
    <View style={defaultStyleSheet.container}>
      {showResult && (
        <View style={styles.container}>
          <Text style={styles.resultText}>Session Complete</Text>
          <Text style={styles.detailText}>
            {againCount} Again, {hardCount} Hard, {goodCount} Good, {easyCount} Easy
          </Text>
          <View style={styles.buttonContainer}>
            {mode === "fsrs" && (
              <TouchableOpacity style={defaultStyleSheet.button} onPress={handleContinue}>
                <Text style={defaultStyleSheet.buttonText}>Continue</Text>
              </TouchableOpacity>
            )}
            <Link href={"/(tabs)/decks"} asChild>
              <TouchableOpacity style={defaultStyleSheet.bottomButton}>
                <Text style={defaultStyleSheet.buttonText}>End session</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      )}

      {!showResult && cards.length === 0 && (
        <View style={styles.container}>
          <Text style={styles.emptyText}>No cards due</Text>
          <TouchableOpacity style={defaultStyleSheet.button} onPress={handleModeSwitch}>
            <Text style={defaultStyleSheet.buttonText}>
              Switch to {mode === "fsrs" ? "Manual Practice" : "FSRS Due"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!showResult && cards.length > 0 && (
        <>
          <View style={styles.topBar}>
            <Text style={styles.modeLabel}>
              {mode === "fsrs" ? "FSRS Due" : "Manual Practice"}
            </Text>
            <Switch value={mode === "manual"} onValueChange={handleModeSwitch} />
          </View>

          {mode === "manual" && (
            <View style={styles.manualControls}>
              <View style={styles.difficultyRow}>
                {(["Any", "Very Hard", "Hard", "Medium", "Easy"] as DifficultyBand[]).map(
                  (band) => (
                    <TouchableOpacity
                      key={band}
                      style={[
                        styles.difficultyButton,
                        difficultyBand === band && styles.difficultyButtonActive,
                      ]}
                      onPress={() => handleDifficultyChange(band)}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          difficultyBand === band && styles.difficultyTextActive,
                        ]}
                      >
                        {band}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
              <View style={styles.countRow}>
                {[10, 20, 30, 50].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countButton,
                      cardCount === count && styles.countButtonActive,
                    ]}
                    onPress={() => handleCardCountChange(count)}
                  >
                    <Text
                      style={[
                        styles.countText,
                        cardCount === count && styles.countTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
                    <Animated.View style={[styles.frontcard, frontAnimatedStyles]}>
                      {displayCard && (
                        <LearnCard card={displayCard} isFront={true} textHidden={textHidden} />
                      )}
                    </Animated.View>
                    <Animated.View style={[styles.backCard, backAnimatedStyles]}>
                      {displayCard && <LearnCard card={displayCard} isFront={false} />}
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              </GestureDetector>
            </GestureHandlerRootView>
            {!showFront && (
              <View style={styles.bottomView}>
                <TouchableOpacity
                  style={[defaultStyleSheet.button, styles.againButton]}
                  onPress={() => onRateCard(Rating.Again)}
                >
                  <Text style={defaultStyleSheet.buttonText}>Again</Text>
                </TouchableOpacity>
                <View style={styles.rightButtons}>
                  <TouchableOpacity
                    style={[defaultStyleSheet.button, styles.ratingButton]}
                    onPress={() => onRateCard(Rating.Hard)}
                  >
                    <Text style={defaultStyleSheet.buttonText}>Hard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[defaultStyleSheet.button, styles.ratingButton]}
                    onPress={() => onRateCard(Rating.Good)}
                  >
                    <Text style={defaultStyleSheet.buttonText}>Good</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[defaultStyleSheet.button, styles.ratingButton]}
                    onPress={() => onRateCard(Rating.Easy)}
                  >
                    <Text style={defaultStyleSheet.buttonText}>Easy</Text>
                  </TouchableOpacity>
                </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  manualControls: {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  difficultyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10,
  },
  difficultyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#d0d0d0",
  },
  difficultyButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  difficultyText: {
    fontSize: 12,
    color: "#333",
  },
  difficultyTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  countRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  countButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#d0d0d0",
  },
  countButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  countText: {
    fontSize: 14,
    color: "#333",
  },
  countTextActive: {
    color: "#fff",
    fontWeight: "600",
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
    width: 350,
    flexDirection: "row",
    gap: 10,
  },
  againButton: {
    backgroundColor: "#ef4444",
    flex: 1,
  },
  rightButtons: {
    flex: 2,
    flexDirection: "row",
    gap: 8,
  },
  ratingButton: {
    backgroundColor: "#86efac",
    flex: 1,
  },
  resultText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    width: "80%",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
});

export default Page;
