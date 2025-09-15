import { useNavigation as useReactNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/MainNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const useNavigation = () => {
  const navigation = useReactNavigation<NavigationProp>();
  
  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };
  
  return {
    navigation,
    navigateToProfile,
  };
};
