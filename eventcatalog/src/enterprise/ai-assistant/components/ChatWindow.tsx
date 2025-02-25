import { useEffect, useState, useRef } from 'react';
import { BookOpen, Send } from 'lucide-react';
import { Document } from 'langchain/document';
import { CreateWebWorkerMLCEngine, type InitProgressReport } from '@mlc-ai/web-llm';
import { useChat } from './hooks/ChatProvider';
import config from '@config';

const ChatWindow = ({ catalogPath }: { catalogPath: string }) => {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [engine, setEngine] = useState<any>(null);
  const [messages, setMessages] = useState<Array<{ content: string; isUser: boolean }>>([]);
  const [inputValue, setInputValue] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [vectorWorker, setVectorWorker] = useState<Worker | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const completionRef = useRef<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // LLM configuration from eventcatalog.config.js file
  const model = config.chat?.model || 'Llama-2-7b-chat-hf-q4f16_1-MLC';
  const max_tokens = config.chat?.max_tokens || 8192;

  const { currentSession, addMessageToSession, updateSession, isStreaming, setIsStreaming } = useChat();

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      console.log('currentSession', currentSession.messages);
      setMessages(currentSession.messages);
      setShowWelcome(false);
    } else {
      setMessages([]);
      setShowWelcome(true);
    }
  }, [currentSession]);

  // Helper function to stop the current completion
  const handleStop = async () => {
    if (completionRef.current) {
      try {
        await engine.interruptGenerate();
        completionRef.current = null;
        setIsStreaming(false);
        setIsThinking(false);
      } catch (error) {
        console.error('Error stopping completion:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || !engine) return;

    // Add to messages
    setMessages((prev) => [...prev, { content: inputValue, isUser: true }]);

    // Add message to session store only
    if (currentSession) {
      addMessageToSession(currentSession.id, inputValue, true);
    }

    setIsThinking(true);
    setIsStreaming(true);
    setInputValue('');

    // if the first message, update the session title
    if (messages.length === 1 && currentSession) {
      updateSession({
        ...currentSession,
        title: inputValue.length > 25 ? `${inputValue.substring(0, 22)}...` : inputValue,
      });
    }

    // Add input to vector store
    vectorWorker?.postMessage({ input: inputValue });

    // @ts-ignore
    vectorWorker.onmessage = async (event) => {
      if (event.data.action === 'search-results') {
        console.log('Results', event?.data?.results);

        const qaPrompt = `\n".

                You are an expert in the domain of software architecture.
                
                You are given a question and a list of resources.

                Resource types include events, commands, queries, services and domains, users and teams.

                Never make up information, only use the information provided in the resources.

                Your job is to answer the question based on the resources.

                This resources are all the resources that are relevant to the question.

                Use the resource url value to link to the resources.

                If any fields are undefined or missing just say you don't know as they are missing in the documentation.

                When you give the name of resources back to the user, you can also provide them with a link directly to the resource, use the url field for this.

                ==========
                ${event.data.results
                  .map((result: any) => {
                    const metadata = result[0].metadata;
                    return `<resource ${Object.entries(metadata)
                      .filter(([key, value]) => key !== 'markdown' && key !== 'loc')
                      .map(([key, value]) => {
                        // Special handling for resourceType to construct url
                        if (key === 'type') {
                          return `url="/docs/${value}s/${metadata.id}" ${key}="${value}"`;
                        }
                        return `${key}="${value}"`;
                      })
                      .join(' ')} />`;
                  })
                  .join('\n')}\n
                ==========
               
                ""
                `;

        try {
          // Get completion
          const completion = await engine.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: qaPrompt,
              },
              // previous messages
              ...messages.map((msg) => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content,
              })),
              {
                role: 'user',
                content: inputValue,
              },
            ],
            stream: true,
            temperature: 0.1,
            max_tokens,
            top_p: 0.2,
            top_k: 5,
            frequency_penalty: 0,
            presence_penalty: 0,
          });

          // Store completion reference for potential cancellation
          completionRef.current = completion;

          let isFirstChunk = true;
          let responseText = '';

          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                responseText += content;

                if (isFirstChunk) {
                  setIsThinking(false);
                  setMessages((prev) => [...prev, { content: responseText, isUser: false }]);
                  isFirstChunk = false;
                } else {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: responseText,
                    };
                    return newMessages;
                  });
                }
                // Add scroll after each chunk
                scrollToBottom();
              }
            }

            // Only add to session store after complete response
            if (currentSession) {
              console.log('currentSession', currentSession);
              addMessageToSession(currentSession.id, responseText, false);
            }
          } catch (error: any) {
            if (error.message?.includes('cancelled')) {
              console.log('Completion was stopped by the user');
            } else {
              throw error;
            }
          }

          setIsThinking(false);
          setIsStreaming(false);
          completionRef.current = null;
        } catch (error: any) {
          console.error('Error:', error);
          const errorMessage = { content: 'Sorry, there was an error processing your request.', isUser: false };
          setMessages((prev) => [...prev, errorMessage]);
          if (currentSession) {
            addMessageToSession(currentSession.id, errorMessage.content, false);
          }
          setIsThinking(false);
          setIsStreaming(false);
          completionRef.current = null;
        }
      }
    };
  };

  const initProgressCallback = (report: InitProgressReport) => {
    console.log('Loading LLM locally', report);
    setLoadingProgress(Math.round(report.progress * 100));
    if (report.progress === 1) {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initEngine = async () => {
      try {
        // Cache the LLMs text file
        const engineCreator = CreateWebWorkerMLCEngine;
        const newEngine = await engineCreator(
          new Worker(new URL('./workers/engine.ts', import.meta.url), { type: 'module' }),
          model,
          { initProgressCallback }
        );
        setEngine(newEngine);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    const importDocuments = async () => {
      const worker = new Worker(new URL('./workers/document-importer.ts', import.meta.url), { type: 'module' });
      worker.postMessage({ init: true, catalogPath });
      setVectorWorker(worker);
    };

    importDocuments();
    initEngine();
  }, []);

  // Helper function to format message content
  const formatMessageContent = (content: string): string => {
    // First handle code blocks
    let formattedContent = content.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      const escapedCode = codeContent.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre class="bg-gray-800 border border-gray-700 p-4 my-3 rounded-lg overflow-x-auto"><code class="text-sm font-mono text-gray-200">${escapedCode}</code></pre>`;
    });

    // Handle inline code
    formattedContent = formattedContent.replace(/(?<!`)`([^`]+)`(?!`)/g, (match, code) => {
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="bg-gray-500 border border-gray-700 px-2 py-0.5 rounded text-sm font-mono text-gray-200">${escapedCode}</code>`;
    });

    // Handle links
    formattedContent = formattedContent.replace(
      /<a\s+href="([^"]+)">/g,
      '<a href="$1" class="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">'
    );

    // Convert newlines to <br>
    formattedContent = formattedContent.replace(/\n(?!<\/code>)/g, '<br>');

    return formattedContent;
  };

  // Add new function to handle smooth scrolling
  const scrollToBottom = (smooth = true) => {
    if (outputRef.current) {
      outputRef.current.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Add effect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-60px)] w-full">
      {/* Chat Messages */}
      <div id="output" ref={outputRef} className="flex-1 overflow-y-auto p-4 space-y-4 w-full mx-auto">
        {showWelcome || messages.length === 0 ? (
          <div id="welcomeMessage" className="flex justify-center items-center h-full">
            <div className="text-center space-y-6 max-w-2xl px-4">
              <div className="flex justify-center">
                <BookOpen size={48} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl font-semibold text-gray-800">Ask questions about your architecture</h1>
                <p className="text-sm text-gray-500">AI Models are local and do not leave your device.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-[900px] mx-auto">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                />
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-2 max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800 rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Status */}
      {loading && (
        <div className="max-w-[900px] mx-auto w-full px-4">
          <div id="loadingStatus" className="mb-2 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-center loading-status">
            <span className="block">
              Initializing AI model...
              {loadingProgress > 0 && `(${loadingProgress}%)`}
            </span>
            <span className="block text-xs text-gray-500">
              Loading model into your browser, this may take a minute or two. The first time it will take longer then the model is
              cached.
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-[900px] mx-auto relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What events do we have?"
            className="w-full px-4 py-3 bg-white text-gray-800 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed pr-24"
            disabled={loading || isStreaming}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || isStreaming}
                className="px-4 py-2 flex items-center bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-sm font-medium"
              >
                {/* Add icon */}
                <Send size={16} strokeWidth={1.5} className="mr-2" />
                Send
              </button>
            )}
          </div>
        </div>
        <div className="max-w-[900px] mx-auto flex justify-between">
          {/* show what model is loaded */}
          <p className="text-xs text-gray-400 mt-2">Model: {model}</p>
          <p className="text-xs text-gray-500 mt-2">EventCatalog AI can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
