import React, {
  FC,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
} from 'react-native';

import {MentionInputProps, MentionPartType, Suggestion} from '../types';
import {
  defaultMentionTextStyle,
  generateValueFromPartsAndChangedText,
  generateValueWithAddedSuggestion,
  getMentionPartSuggestionKeywords,
  getMentionPartSuggestionKeywordsNomal,
  isMentionPartType,
  parseValue,
} from '../utils';

const MentionInput: FC<MentionInputProps> = ({
  value,
  onChange,

  partTypes = [],

  inputRef: propInputRef,

  containerStyle,

  onSelectionChange,

  nomalPartTypes,

  ...textInputProps
}) => {
  const textInput = useRef<TextInput | null>(null);

  const [selection, setSelection] = useState({start: 0, end: 0});
  const [isTracking, setIstracking] = useState(false);
  const [valueNomal, setValueNomalTracking] = useState('');

  const {plainText, parts} = useMemo(() => parseValue(value, partTypes), [
    value,
    partTypes,
  ]);

  /**
   *
   * @param tracking
   * @param typeSpace
   */

  const handleSetIstracking = (tracking: boolean, typeSpace?: string) => {
    setIstracking(tracking);

    if (!tracking && valueNomal.length > 0 && valueNomal !== ' ' && valueNomal !== '\n') {
      setValueNomalTracking('');
      onChange(valueNomal + typeSpace);
    }
  };

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
    if (nomalPartTypes && nomalPartTypes.length > 0) {
      isTracking && setIstracking(false);
    }
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
    return getMentionPartSuggestionKeywordsNomal(
      parts,
      plainText,
      selection,
      nomalPartTypes,
      handleSetIstracking,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts, plainText, selection, nomalPartTypes]);

  /**
   * Callback on mention suggestion press. We should:
   * - Get updated value
   * - Trigger onChange callback with new value
   */
  const onSuggestionPress = (mentionType: MentionPartType) => (
    suggestion: Suggestion,
  ) => {
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
        (propInputRef as MutableRefObject<TextInput>).current = ref as TextInput;
      }
    }
  };

  const handleSetInputTracking = useCallback((newValue: string) => {
    setValueNomalTracking(newValue);
  }, []);

  useEffect(() => {
    if (
      keywordByTriggerNomal &&
      keywordByTriggerNomal.value &&
      keywordByTriggerNomal.value !== ' ' &&
      isTracking
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
  }, [keywordByTriggerNomal, isTracking]);

  const renderMentionSuggestions = (mentionType: MentionPartType) => (
    <React.Fragment key={mentionType.trigger}>
      {mentionType.renderSuggestions &&
        mentionType.renderSuggestions({
          keyword: keywordByTrigger[mentionType.trigger],
          onSuggestionPress: onSuggestionPress(mentionType),
        })}
    </React.Fragment>
  );

  return (
    <View style={containerStyle}>
      {(partTypes.filter(
        one =>
          isMentionPartType(one) &&
          one.renderSuggestions != null &&
          !one.isBottomMentionSuggestionsRender,
      ) as MentionPartType[]).map(renderMentionSuggestions)}

      <TextInput
        multiline
        {...textInputProps}
        ref={handleTextInputRef}
        onChangeText={onChangeInput}
        onSelectionChange={handleSelectionChange}>
        <Text>
          {parts.map(({text, partType, data}, index) =>
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

      {(partTypes.filter(
        one =>
          isMentionPartType(one) &&
          one.renderSuggestions != null &&
          one.isBottomMentionSuggestionsRender,
      ) as MentionPartType[]).map(renderMentionSuggestions)}
    </View>
  );
};

export {MentionInput};
