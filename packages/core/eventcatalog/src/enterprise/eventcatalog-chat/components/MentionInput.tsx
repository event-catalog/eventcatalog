import React, { useState, useRef, useEffect, useCallback } from 'react';

// Define the structure for suggestions with types
interface MentionSuggestion {
  id: string; // Unique ID for the key prop
  name: string; // The suggestion text (e.g., 'PaymentProcessed')
  type: string; // The group type (e.g., 'event', 'service')
}

interface MentionInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  suggestions: MentionSuggestion[]; // Use the new type
  trigger?: string;
  onChange: (value: string) => void;
  value: string;
}

const MentionInput: React.FC<MentionInputProps> = ({ suggestions, trigger = '@', onChange, value, ...inputProps }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<MentionSuggestion[]>([]); // Use the new type
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  const updateSuggestions = useCallback(
    (inputValue: string, cursorPosition: number | null) => {
      if (cursorPosition === null) {
        setShowSuggestions(false);
        return;
      }

      // Find the start of the potential mention query
      let queryStartIndex = -1;
      for (let i = cursorPosition - 1; i >= 0; i--) {
        const char = inputValue[i];
        if (char === trigger) {
          queryStartIndex = i;
          break;
        }
        // Stop if we hit whitespace before the trigger
        if (/\s/.test(char)) {
          break;
        }
      }

      if (queryStartIndex !== -1) {
        const query = inputValue.substring(queryStartIndex + 1, cursorPosition).toLowerCase();
        setCurrentQuery(query);

        const filtered = suggestions.filter((s) => s.name.toLowerCase().includes(query));

        // Update the filtered list and reset index
        setFilteredSuggestions(filtered);
        setActiveSuggestionIndex(0);
        // Keep suggestions open as long as the trigger character is active
        setShowSuggestions(true);
      } else {
        // Only hide suggestions if the trigger character sequence is broken
        setShowSuggestions(false);
      }
    },
    [suggestions, trigger]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    updateSuggestions(newValue, event.target.selectionStart);
  };

  // Modify handleSuggestionClick to accept the suggestion object
  const handleSuggestionClick = (suggestion: MentionSuggestion) => {
    if (inputRef.current) {
      const cursorPosition = inputRef.current.selectionStart;
      if (cursorPosition !== null) {
        // Find the start of the @mention query relative to the cursor
        let queryStartIndex = -1;
        for (let i = cursorPosition - 1; i >= 0; i--) {
          if (value[i] === trigger) {
            queryStartIndex = i;
            break;
          }
          if (/\s/.test(value[i])) {
            break;
          }
        }

        if (queryStartIndex !== -1) {
          // Use suggestion.name for the inserted text
          const newValue =
            value.substring(0, queryStartIndex) +
            suggestion.name +
            ' ' + // Insert selected suggestion name and a space
            value.substring(cursorPosition);

          onChange(newValue);
          setShowSuggestions(false);
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              const newCursorPos = queryStartIndex + suggestion.name.length + 1;
              inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, 0);
        } else {
          // Fallback: Use suggestion.name
          onChange(value + suggestion.name + ' ');
          setShowSuggestions(false);
          inputRef.current.focus();
        }
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex + 1) % filteredSuggestions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        // Pass the selected suggestion object
        handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
      } else if (event.key === 'Escape') {
        setShowSuggestions(false);
      }
    }

    // Propagate other keydown events if needed (e.g., for parent's Enter key handling)
    // Check if the event is Enter and if we are NOT showing suggestions before calling parent's submit
    // This prevents submitting the form when selecting a suggestion with Enter
    if (inputProps.onKeyDown && !(showSuggestions && event.key === 'Enter')) {
      inputProps.onKeyDown(event);
    }
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const activeItem = suggestionsRef.current.children[activeSuggestionIndex] as HTMLLIElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeSuggestionIndex, showSuggestions]);

  // Handle clicks outside the input/suggestions list to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        {...inputProps}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown} // Use onKeyDown for better event control
        onClick={(e) => updateSuggestions(value, e.currentTarget.selectionStart)} // Update suggestions on click too
      />
      {/* Keep the suggestions box open if showSuggestions is true */}
      {showSuggestions && (
        <ul
          ref={suggestionsRef}
          className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto z-10"
          style={{ minWidth: inputRef.current?.offsetWidth }}
        >
          {/* Conditionally render suggestions or 'No results' message */}
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.id + '-' + index}
                className={`px-4 py-2 text-sm cursor-pointer flex justify-between items-center ${
                  index === activeSuggestionIndex ? 'bg-purple-100 text-purple-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
              >
                <span>{suggestion.name}</span>
                <span className="text-xs text-gray-500 ml-2">({suggestion.type})</span>
              </li>
            ))
          ) : (
            /* Render this list item when no suggestions match */
            <li className="px-4 py-2 text-sm text-gray-500 italic">No matching items found</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default MentionInput;
