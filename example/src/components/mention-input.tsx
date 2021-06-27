import React, {
  FC,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import {
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
  Dimensions,
} from 'react-native';

import { MentionInputProps, MentionPartType, Suggestion } from '../types';
import {
  defaultMentionTextStyle,
  generateValueFromPartsAndChangedText,
  generateValueWithAddedSuggestion,
  getMentionPartSuggestionKeywords,
  getMentionPartSuggestionKeywordsNormal,
  isMentionPartType,
  parseValue,
} from '../utils';

const { State: TextInputState } = TextInput;
const { height: heightWindow } = Dimensions.get('window');

const MentionInput: FC<MentionInputProps> = ({
  value,

  onChange,

  partTypes = [],

  inputRef: propInputRef,

  containerStyle,

  onSelectionChange,

  nomalPartTypes,

  handleTracking,

  handleNonTracking,

  maxHeightInput = 50,

  ...textInputProps
}) => {
  const textInput = useRef<TextInput | null>(null);

  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isTrackingHashtag, setIstrackingHashtag] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [valueNomal, setValueNomalTracking] = useState('');
  const [isShowSuggesstion, setIsShowSuggesstion] = useState(false);
  const [posictionSuggestion, setPossitionSuggestion] =
    useState(0);

  const { plainText, parts } = useMemo(
    () => parseValue(value, partTypes),
    [value, partTypes],
  );

  /**
   *
   * @param tracking
   * @param typeSpace
   */

  const handleSetIstrackingHashtag = useCallback((tracking: boolean) => {
    setIstrackingHashtag(tracking);
  }, []);

  const handleSelectionChange = (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    setSelection(event.nativeEvent.selection);

    onSelectionChange && onSelectionChange(event);
  };

  /**
   * Callback that trigger on TextInput text change
   *
   * @param changedText
   */
  const onChangeInput = (changedText: string) => {
    partTypes.map((item: any) => {
      if (
        changedText.slice(changedText.length - 1, changedText.length) === ' ' ||
        changedText.slice(changedText.length - 1, changedText.length) === '\n'
      ) {
        isShowSuggesstion && setIsShowSuggesstion(false);
        isTracking && setIsTracking(false);
        handleNonTracking && handleNonTracking();

        return;
      }

      if (
        (item?.trigger &&
          item?.trigger ===
          changedText.slice(changedText.length - 1, changedText.length)) ||
        isTracking
      ) {
        handleTracking && keywordByTrigger[item?.trigger] && handleTracking(keywordByTrigger[item?.trigger] + changedText[changedText.length - 1] || '');
        !isTracking && setIsTracking(true);
      }
    });

    onChange(
      generateValueFromPartsAndChangedText(parts, plainText, changedText),
    );
  };

  /**
   * We memoize the keyword to know should we show mention suggestions or not
   */

  const keywordByTrigger = useMemo(() => {
    return getMentionPartSuggestionKeywords(
      parts,
      plainText,
      selection,
      partTypes,
    );
  }, [parts, plainText, selection, partTypes]);

  const keywordByTriggerNomal = useMemo(() => {
    return getMentionPartSuggestionKeywordsNormal(
      parts,
      plainText,
      selection,
      nomalPartTypes,
      handleSetIstrackingHashtag,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, plainText, selection, nomalPartTypes]);

  /**
   * Callback on mention suggestion press. We should:
   * - Get updated value
   * - Trigger onChange callback with new value
   */
  const onSuggestionPress =
    (mentionType: MentionPartType) => (suggestion: Suggestion) => {
      const newValue = generateValueWithAddedSuggestion(
        parts,
        mentionType,
        plainText,
        selection,
        suggestion,
      );

      if (!newValue) {
        return;
      }

      onChange(newValue);

      /**
       * Move cursor to the end of just added mention starting from trigger string and including:
       * - Length of trigger string
       * - Length of mention name
       * - Length of space after mention (1)
       *
       * Not working now due to the RN bug
       */
      // const newCursorPosition = currentPart.position.start + triggerPartIndex + trigger.length +
      // suggestion.name.length + 1;

      // textInput.current?.setNativeProps({selection: {start: newCursorPosition, end: newCursorPosition}});
    };

  const handleTextInputRef = (ref: TextInput) => {
    textInput.current = ref as TextInput;

    if (propInputRef) {
      if (typeof propInputRef === 'function') {
        propInputRef(ref);
      } else {
        (propInputRef as MutableRefObject<TextInput>).current =
          ref as TextInput;
      }
    }
  };

  const handleSetInputTracking = useCallback((newValue: string) => {
    setValueNomalTracking(newValue);
  }, []);

  const handleLayoutChange = (e: any) => {
    if (e.nativeEvent.layout.height < maxHeightInput) {
      setPossitionSuggestion(e.nativeEvent.layout.height);
    } else {
      setPossitionSuggestion(maxHeightInput);
    }
  }

  useEffect(() => {
    if (
      !isTrackingHashtag &&
      valueNomal.length > 0 &&
      valueNomal !== ' ' &&
      valueNomal !== '\n'
    ) {
      setValueNomalTracking('');
      onChange(valueNomal);
    }
  }, [isTrackingHashtag, onChange, valueNomal]);

  useEffect(() => {
    if (
      keywordByTriggerNomal &&
      keywordByTriggerNomal.value &&
      keywordByTriggerNomal.value !== ' ' &&
      isTrackingHashtag
    ) {
      const suggestion = {
        id: keywordByTriggerNomal.value,
        name: keywordByTriggerNomal.value,
      };

      const newValue = generateValueWithAddedSuggestion(
        parts,
        keywordByTriggerNomal.nomalTrigger,
        plainText,
        selection,
        suggestion,
      );

      newValue && handleSetInputTracking(newValue);
    }
  }, [
    keywordByTriggerNomal,
    isTrackingHashtag,
    parts,
    plainText,
    selection,
    handleSetInputTracking,
  ]);

  useEffect(() => {
    Keyboard.addListener('keyboardDidShow', event => {
      const currentlyFocusedField = TextInputState.currentlyFocusedInput();
      const keyboardHeight = event.endCoordinates.height;

      currentlyFocusedField.measure((x, y, width, height, pageX, pageY) => {
        const temPosition = heightWindow - pageY - height;
        setPossitionSuggestion(height);

        if (keyboardHeight < temPosition) {
          // pushFlatlist
        }
      });
    });
  }, []);

  const renderMentionSuggestions = (mentionType: MentionPartType) => (
    <React.Fragment key={mentionType.trigger}>
      {mentionType.renderSuggestions &&
        mentionType.renderSuggestions({
          keyword: keywordByTrigger[mentionType.trigger],
          onSuggestionPress: onSuggestionPress(mentionType),
          isShowSuggesstion,
        })}
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <View style={[styles.suggestionsStyle, { bottom: posictionSuggestion }]}>
        {(
          partTypes.filter(
            one =>
              isMentionPartType(one) &&
              one.renderSuggestions != null &&
              !one.isBottomMentionSuggestionsRender,
          ) as MentionPartType[]
        ).map(renderMentionSuggestions)}
      </View>
      <View style={[containerStyle, { maxHeight: maxHeightInput }]}>
        <TextInput
          style={{
            maxHeight: maxHeightInput,
          }}
          onLayout={handleLayoutChange}
          multiline
          {...textInputProps}
          ref={handleTextInputRef}
          onChangeText={onChangeInput}
          onSelectionChange={handleSelectionChange}>
          <Text>
            {parts.map(({ text, partType, data }, index) =>
              partType ? (
                <Text
                  key={`${index}-${data?.trigger ?? 'pattern'}`}
                  style={partType.textStyle ?? defaultMentionTextStyle}>
                  {text}
                </Text>
              ) : (
                <Text key={index}>{text}</Text>
              ),
            )}
          </Text>
        </TextInput>

        {(
          partTypes.filter(
            one =>
              isMentionPartType(one) &&
              one.renderSuggestions != null &&
              one.isBottomMentionSuggestionsRender,
          ) as MentionPartType[]
        ).map(renderMentionSuggestions)}
      </View>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  suggestionsStyle: {
    position: 'absolute',
    backgroundColor: 'red',
    left: 0,
    width: '100%',
    zIndex: 9999,
  },
});

export { MentionInput };
