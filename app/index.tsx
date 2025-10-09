import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { UserStorageService } from '@/data/UserStorage';

const Page = () => {
  const [hasID, setHasID] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      await UserStorageService.initializeUserId();
      setHasID(true);
    };
    initializeUser();
  }, []);

  if (hasID) {
    return <Redirect href="/(tabs)/decks" />;
  } else {
    return <View />;
  }
};

export default Page;
