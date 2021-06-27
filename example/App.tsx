/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import { FC, useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MentionInput, MentionSuggestionsProps, Suggestion } from './src';
import { Subject, Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
} from 'rxjs/operators';
import axios from 'axios';

interface SearchGithubUserType extends Observable<any> {
  next: (text: string) => void;
  complete: () => void;
  error: (error: any) => void;
}

let searchGithub$: SearchGithubUserType = new Subject();
const KEY_CONFIG_URL =
  'client_id=38c6cc7023cdbf9abfde&client_secret=a2f73d32d407a67fcfa58731a47cf66112efab56';

// const users = [
//   {id: '1', name: 'David Tabaka'},
//   {id: '2', name: 'Mary'},
//   {id: '3', name: 'Tony'},
//   {id: '4', name: 'Mike'},
//   {id: '5', name: 'Grey'},
// ];

const hashtags = [
  { id: 'todo', name: 'todo' },
  { id: 'help', name: 'help' },
  { id: 'loveyou', name: 'loveyou' },
];

const SuggestionItem = ({ item, onSuggestionPress }: any) => {
  return (
    <Pressable
      key={item.id}
      onPress={() => onSuggestionPress(item)}
      style={{ padding: 15 }}>
      <Text>{item.name}</Text>
    </Pressable>
  );
};

const renderSuggestions: (
  suggestions: Suggestion[],
  isSearching: boolean,
) => FC<MentionSuggestionsProps> =
  (suggestions, isSearching) =>
    ({ keyword, onSuggestionPress, isShowSuggesstion }) => {
      if (keyword == null) {
        return null;
      }

      return (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps={'handled'}
          style={{ maxHeight: 200 }}
        >
          {isSearching && <ActivityIndicator color={'#000000'} size={'large'} />}
          {!isSearching &&
            suggestions.map(item => (
              <SuggestionItem
                item={item}
                onSuggestionPress={onSuggestionPress}
                key={item?.id}
              />
            ))}
        </ScrollView>
      );
    };

// const renderMentionSuggestions = renderSuggestions(users);

const renderHashtagSuggestions = renderSuggestions(hashtags, false);
const getUsersURL = (username: string) =>
  `https://api.github.com/search/users?q=${username}&` + KEY_CONFIG_URL;

const App = () => {
  const [value, setValue] = useState('');
  const [dataUser, setDateUser] = useState([]);
  const [isSearching, setIsSearch] = useState(false);

  const handleChangeText = useCallback((text?: string) => {
    setIsSearch(true);
    searchGithub$.next(text || '');
  }, []);

  const handleSearchUser = useCallback(() => {
    searchGithub$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(async (text: string) => {
          const response = await axios.get(getUsersURL(text || ''));
          setDateUser([]);

          return response.data;
        }),
        map((data: any) =>
          data?.items.map((item: any) => ({ id: item.id, name: item.login })),
        ),
      )
      .subscribe({
        next: (data: any) => {
          data && setDateUser(data);
          setIsSearch(false);
        },
        error: (error: any) => {
          console.log('error', error);
          setIsSearch(false);
          setDateUser([]);
        },
        complete: () => { },
      });
  }, []);

  useEffect(() => {
    handleSearchUser();
  }, [handleSearchUser]);

  return (
    <ScrollView keyboardShouldPersistTaps={'handled'}>
      <View
        style={{
          width: '100%',
          height: 500,
          backgroundColor: 'blue',
        }}
      />
      <MentionInput
        value={value}
        onChange={setValue}
        partTypes={[
          {
            trigger: '@',
            renderSuggestions: renderSuggestions(dataUser, isSearching),
            allowedSpacesCount: 0,
            isInsertSpaceAfterMention: true,
          },
          {
            trigger: '#',
            allowedSpacesCount: 0,
            isInsertSpaceAfterMention: true,
            renderSuggestions: renderSuggestions(dataUser, isSearching),
            textStyle: { fontWeight: 'bold', color: 'blue' },
          },
          {
            pattern:
              /(https?:\/\/|www\.)[-a-zA-Z0-9@:%._\\+~#=]{1,256}\.(xn--)?[a-z0-9-]{2,20}\b([-a-zA-Z0-9@:%_\\+\\[\],.~#?&\\/=]*[-a-zA-Z0-9@:%_\\+\]~#?&\\/=])*/gi,
            textStyle: { color: 'blue' },
          },
        ]}
        nomalPartTypes={[
          {
            trigger: '#',
            mentionType: {
              trigger: '#',
              allowedSpacesCount: 0,
              textStyle: { fontWeight: 'bold', color: 'blue' },
            },
          },
        ]}
        placeholder="Type here..."
        handleTracking={(text: string) => {
          text && handleChangeText(text);
        }}
        maxHeightInput={140}
        style={{ padding: 12 }}
      />
    </ScrollView>
  );
};

export default App;
